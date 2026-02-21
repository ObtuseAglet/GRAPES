import type { CoreRequest, CoreResponse } from '../core/contracts/messages';
import { SCHEMA_VERSION, type ProtectionMode, type ThreatCategory, type ThreatEvent } from '../core/contracts/types';
import { isCoreRequest } from '../core/contracts/validators';
import { normalizeLegacyDetectionType } from '../core/detection/normalize';
import { ThreatLogStore } from '../core/logging/log-store';
import { MockSyncProvider } from '../core/sharing/provider';
import { SharingQueueService } from '../core/sharing/queue';
import { toSharedReport } from '../core/sharing/sanitizer';
import {
  DEFAULT_STORAGE_STATE_V2,
  fromLegacyPreferences,
  toLegacyPreferences,
  type StorageStateV2,
} from '../core/storage/schema';
import { extractBaseDomain } from '../core/services/domain';
import { getProtectionStatusForDomain } from '../core/services/policy';
import type {
  GrapesPreferences,
  SurveillanceData,
  SurveillanceEvent,
  SurveillanceLogEntry,
} from '../lib/types';

const STATE_KEY = 'v2_state';
const INSTALL_MARKER_KEY = 'v2_install_state';
const LEGACY_LOGS_KEY = 'surveillanceLogs';

const logStore = new ThreatLogStore();
const sharingQueue = new SharingQueueService(new MockSyncProvider());

const tabSurveillance: Map<number, SurveillanceData> = new Map();
const tabLogEntries: Map<number, SurveillanceLogEntry> = new Map();

async function getState(): Promise<StorageStateV2> {
  const result = await browser.storage.sync.get([STATE_KEY]);
  return (result[STATE_KEY] as StorageStateV2 | undefined) || DEFAULT_STORAGE_STATE_V2;
}

async function setState(state: StorageStateV2): Promise<void> {
  await browser.storage.sync.set({ [STATE_KEY]: state });
}

async function ensureV2State(): Promise<StorageStateV2> {
  const installMarker = await browser.storage.local.get([INSTALL_MARKER_KEY]);
  const marker = installMarker[INSTALL_MARKER_KEY] as
    | { schemaVersion: number; hardResetApplied: boolean }
    | undefined;

  if (!marker?.hardResetApplied || marker.schemaVersion !== SCHEMA_VERSION) {
    await browser.storage.sync.clear();
    await browser.storage.local.clear();
    const fresh: StorageStateV2 = {
      ...DEFAULT_STORAGE_STATE_V2,
      installState: {
        schemaVersion: SCHEMA_VERSION,
        hardResetApplied: true,
        resetTimestamp: Date.now(),
      },
    };
    await setState(fresh);
    await browser.storage.local.set({
      [INSTALL_MARKER_KEY]: {
        schemaVersion: SCHEMA_VERSION,
        hardResetApplied: true,
      },
    });
    return fresh;
  }

  const state = await getState();
  if (state.coreSettings.schemaVersion !== SCHEMA_VERSION) {
    const upgraded: StorageStateV2 = {
      ...DEFAULT_STORAGE_STATE_V2,
      ...state,
      coreSettings: {
        ...DEFAULT_STORAGE_STATE_V2.coreSettings,
        ...state.coreSettings,
        schemaVersion: SCHEMA_VERSION,
      },
      installState: {
        schemaVersion: SCHEMA_VERSION,
        hardResetApplied: true,
        resetTimestamp: state.installState?.resetTimestamp || Date.now(),
      },
    };
    await setState(upgraded);
    return upgraded;
  }

  return state;
}

function updateSurveillanceSummary(tabId: number, event: ThreatEvent): SurveillanceData {
  const existing: SurveillanceData = tabSurveillance.get(tabId) || {
    mutationObserver: false,
    sessionReplay: [],
    fingerprinting: [],
    visibilityTracking: false,
    trackingPixels: [],
    timestamp: Date.now(),
  };

  if (event.category === 'dom-monitoring') existing.mutationObserver = true;
  if (event.category === 'session-replay') {
    existing.sessionReplay = [...new Set([...existing.sessionReplay, ...event.evidence])];
  }
  if (event.category === 'fingerprinting') {
    existing.fingerprinting = [...new Set([...existing.fingerprinting, ...event.evidence])];
  }
  if (event.category === 'visibility-tracking') existing.visibilityTracking = true;
  if (event.category === 'tracking-pixel') {
    existing.trackingPixels = [...new Set([...existing.trackingPixels, ...event.evidence])];
  }
  existing.timestamp = Date.now();
  tabSurveillance.set(tabId, existing);
  return existing;
}

async function appendLegacyLog(event: ThreatEvent): Promise<void> {
  const existing = tabLogEntries.get(event.tabId);
  const nextEvent: SurveillanceEvent = {
    type: event.category,
    details: event.evidence,
    timestamp: event.ts,
    blocked: event.blocked,
  };

  const entry: SurveillanceLogEntry =
    existing && existing.domain === event.domain
      ? {
          ...existing,
          events: mergeSurveillanceEvents(existing.events, nextEvent),
          timestamp: Date.now(),
          blocked: event.blocked,
          protectionMode: event.mode,
        }
      : {
          domain: event.domain,
          url: event.url,
          timestamp: Date.now(),
          events: [nextEvent],
          protectionMode: event.mode,
          blocked: event.blocked,
        };

  tabLogEntries.set(event.tabId, entry);

  const result = await browser.storage.local.get([LEGACY_LOGS_KEY]);
  const logs = (result[LEGACY_LOGS_KEY] as SurveillanceLogEntry[] | undefined) || [];
  const today = new Date(entry.timestamp).toDateString();
  const idx = logs.findIndex(
    (item) => item.domain === entry.domain && new Date(item.timestamp).toDateString() === today,
  );
  if (idx >= 0) {
    logs[idx] = {
      ...logs[idx],
      timestamp: entry.timestamp,
      events: mergeManyEvents(logs[idx].events, entry.events),
      blocked: entry.blocked,
      protectionMode: entry.protectionMode,
    };
  } else {
    logs.push(entry);
  }
  if (logs.length > 100) logs.shift();
  await browser.storage.local.set({ [LEGACY_LOGS_KEY]: logs });
}

function mergeSurveillanceEvents(
  existing: SurveillanceEvent[],
  incoming: SurveillanceEvent,
): SurveillanceEvent[] {
  const target = existing.find((event) => event.type === incoming.type);
  if (!target) return [...existing, incoming];
  target.details = [...new Set([...target.details, ...incoming.details])];
  target.timestamp = Math.max(target.timestamp, incoming.timestamp);
  target.blocked = incoming.blocked;
  return [...existing];
}

function mergeManyEvents(existing: SurveillanceEvent[], incoming: SurveillanceEvent[]): SurveillanceEvent[] {
  let next = [...existing];
  for (const event of incoming) {
    next = mergeSurveillanceEvents(next, event);
  }
  return next;
}

function buildEvent(
  tabId: number,
  url: string,
  domain: string,
  category: ThreatCategory,
  detector: ThreatEvent['detector'],
  evidence: string[],
  mode: ProtectionMode,
): ThreatEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    tabId,
    url,
    domain,
    category,
    detector,
    confidence: evidence.length > 1 ? 'high' : 'medium',
    blocked: mode === 'full',
    mode,
    ts: Date.now(),
    evidence,
  };
}

async function processThreatEvent(event: ThreatEvent): Promise<void> {
  updateSurveillanceSummary(event.tabId, event);
  updateBadgeForTab(event.tabId, tabSurveillance.get(event.tabId)!);

  const state = await getState();
  if (state.coreSettings.loggingEnabled) {
    await logStore.appendPersistent(event);
    await appendLegacyLog(event);
  }

  await sharingQueue.enqueue(toSharedReport(event));
}

async function handleCoreRequest(request: CoreRequest): Promise<CoreResponse> {
  const state = await getState();
  switch (request.type) {
    case 'CORE_GET_STATE':
      return { ok: true, data: state };
    case 'CORE_SET_MODE': {
      const next = { ...state, coreSettings: { ...state.coreSettings, mode: request.mode } };
      await setState(next);
      return { ok: true, data: { success: true } };
    }
    case 'CORE_SET_SITE_POLICY': {
      const next = {
        ...state,
        sitePolicy: { ...state.sitePolicy, [request.domain]: request.policy },
      };
      await setState(next);
      return { ok: true, data: { success: true } };
    }
    case 'CORE_SET_LOGGING': {
      const next = {
        ...state,
        coreSettings: { ...state.coreSettings, loggingEnabled: request.enabled },
      };
      await setState(next);
      return { ok: true, data: { success: true } };
    }
    case 'CORE_GET_TAB_THREATS':
      return { ok: true, data: logStore.getTabThreats(request.tabId) };
    case 'CORE_GET_LOGS':
      return { ok: true, data: await logStore.getPersistent() };
    case 'CORE_CLEAR_LOGS':
      await logStore.clearPersistent();
      await browser.storage.local.remove([LEGACY_LOGS_KEY]);
      return { ok: true, data: { success: true } };
    case 'CORE_SET_EDITOR_RULES': {
      const next = { ...state, editorRules: request.rules };
      await setState(next);
      return { ok: true, data: { success: true } };
    }
    case 'CORE_SET_SHARING_CONSENT': {
      const sharing = await sharingQueue.setConsent(request.enabled);
      const next = { ...state, sharing: { ...state.sharing, ...sharing } };
      await setState(next);
      return { ok: true, data: { success: true } };
    }
    case 'CORE_FLUSH_SHARING_QUEUE': {
      const sharing = await sharingQueue.flushNow();
      const next = { ...state, sharing: { ...state.sharing, ...sharing } };
      await setState(next);
      return { ok: true, data: { success: true } };
    }
    case 'CORE_GET_SHARING_STATUS': {
      const sharing = await sharingQueue.getState();
      return {
        ok: true,
        data: {
          consent: sharing.consent,
          queueLength: sharing.queue.length,
          lastSyncAt: sharing.lastSyncAt,
        },
      };
    }
    case 'CORE_REPORT_THREAT':
      await processThreatEvent(request.event);
      return { ok: true, data: { success: true } };
    case 'CORE_QUEUE_REPORT':
      await sharingQueue.enqueue(request.report);
      return { ok: true, data: { success: true } };
  }
}

function createEnvelope() {
  return {
    requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: 'background' as const,
    timestamp: Date.now(),
    schemaVersion: SCHEMA_VERSION,
  };
}

export default defineBackground(() => {
  void ensureV2State();

  browser.runtime.onInstalled.addListener(() => {
    void ensureV2State();
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (isCoreRequest(message)) {
      return handleCoreRequest(message);
    }

    if (
      (message.type === 'SUSPICIOUS_OBSERVATION_DETECTED' ||
        message.type === 'SESSION_REPLAY_DETECTED' ||
        message.type === 'FINGERPRINTING_DETECTED' ||
        message.type === 'VISIBILITY_TRACKING_DETECTED' ||
        message.type === 'TRACKING_PIXEL_DETECTED') &&
      sender.tab?.id &&
      sender.tab.url
    ) {
      return getState().then((state) => {
        const domain = extractBaseDomain(new URL(sender.tab!.url!).hostname);
        const status = getProtectionStatusForDomain(domain, state);
        const normalized = normalizeLegacyDetectionType(message.type);
        if (!normalized) {
          return { ok: false, error: 'unknown-detection-type' };
        }

        const evidence =
          message.data?.tools ||
          message.data?.types ||
          [message.data?.targetType || 'detected'];
        const event = buildEvent(
          sender.tab!.id!,
          sender.tab!.url!,
          domain,
          normalized.category,
          normalized.detector,
          evidence,
          status.mode,
        );
        return handleCoreRequest({
          ...createEnvelope(),
          type: 'CORE_REPORT_THREAT',
          event,
        });
      });
    }

    if (message.type === 'GET_SURVEILLANCE_DATA') {
      if (sender.tab?.id) {
        return Promise.resolve(tabSurveillance.get(sender.tab.id) || null);
      }
      return Promise.resolve(null);
    }
    if (message.type === 'GET_TAB_SURVEILLANCE') {
      return Promise.resolve(message.tabId ? tabSurveillance.get(message.tabId) || null : null);
    }
    if (message.type === 'GET_CURRENT_LOG_ENTRY') {
      return Promise.resolve(message.tabId ? tabLogEntries.get(message.tabId) || null : null);
    }
    if (message.type === 'GET_ALL_LOGS') {
      return browser.storage.local.get([LEGACY_LOGS_KEY]).then((result) => result[LEGACY_LOGS_KEY] || []);
    }
    if (message.type === 'CLEAR_LOGS') {
      return handleCoreRequest({
        ...createEnvelope(),
        type: 'CORE_CLEAR_LOGS',
      }).then(() => ({ success: true }));
    }
    if (message.type === 'GET_PROTECTION_STATUS') {
      return getState().then((state) => getProtectionStatusForDomain(message.domain, state));
    }
    if (message.type === 'SET_SITE_PROTECTION') {
      return handleCoreRequest({
        ...createEnvelope(),
        type: 'CORE_SET_SITE_POLICY',
        domain: message.domain,
        policy: message.setting,
      }).then(() => ({ success: true }));
    }
    if (message.type === 'SET_GLOBAL_MODE') {
      return handleCoreRequest({
        ...createEnvelope(),
        type: 'CORE_SET_MODE',
        mode: message.mode,
      }).then(() => ({ success: true }));
    }
    if (message.type === 'GET_PREFERENCES') {
      return getState().then((state) => toLegacyPreferences(state));
    }
    if (message.type === 'SET_PREFERENCES') {
      return getState().then((state) => {
        const next = fromLegacyPreferences(message.preferences as GrapesPreferences, state);
        return setState(next).then(() => ({ success: true }));
      });
    }
    if (message.type === 'COMPLETE_ONBOARDING') {
      return Promise.resolve({ success: true });
    }
    if (message.type === 'ADD_SUPPRESSED_DOMAIN' || message.type === 'REMOVE_SUPPRESSED_DOMAIN') {
      return getState().then((state) => {
        const current = new Set(state.editorStyles.suppressedNotificationDomains);
        if (message.type === 'ADD_SUPPRESSED_DOMAIN') current.add(message.domain);
        if (message.type === 'REMOVE_SUPPRESSED_DOMAIN') current.delete(message.domain);
        const next = {
          ...state,
          editorStyles: {
            ...state.editorStyles,
            suppressedNotificationDomains: Array.from(current),
          },
        };
        return setState(next).then(() => ({ success: true }));
      });
    }
    if (message.type === 'SET_LOGGING_ENABLED') {
      return handleCoreRequest({
        ...createEnvelope(),
        type: 'CORE_SET_LOGGING',
        enabled: !!message.enabled,
      }).then(() => ({ success: true }));
    }
    return;
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      clearBadgeForTab(tabId);
      tabSurveillance.delete(tabId);
      tabLogEntries.delete(tabId);
      logStore.clearTab(tabId);
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    tabSurveillance.delete(tabId);
    tabLogEntries.delete(tabId);
    logStore.clearTab(tabId);
  });
});

function updateBadgeForTab(tabId: number, data: SurveillanceData) {
  const hasFingerprinting = data.fingerprinting.length > 0;
  const hasReplay = data.sessionReplay.length > 0;
  const hasObservation = data.mutationObserver;
  const hasVisibility = data.visibilityTracking;
  const hasTracking = data.trackingPixels.length > 0;

  const threatCount =
    (hasFingerprinting ? 1 : 0) +
    (hasReplay ? 1 : 0) +
    (hasObservation ? 1 : 0) +
    (hasVisibility ? 1 : 0) +
    (hasTracking ? 1 : 0);

  if (threatCount === 0) {
    clearBadgeForTab(tabId);
    return;
  }

  browser.action.setBadgeText({ text: String(threatCount), tabId });
  let color = '#e94560';
  if (hasVisibility) color = '#3498db';
  if (hasTracking) color = '#e67e22';
  if (hasReplay) color = '#f39c12';
  if (hasFingerprinting) color = '#9b59b6';
  browser.action.setBadgeBackgroundColor({ color, tabId });
  browser.action.setBadgeTextColor({ color: '#ffffff', tabId });
}

function clearBadgeForTab(tabId: number) {
  browser.action.setBadgeText({ text: '', tabId });
  browser.action.setTitle({ title: 'GRAPES Settings', tabId });
}
