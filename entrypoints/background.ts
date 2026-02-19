import type {
  GrapesPreferences,
  SurveillanceData,
  SurveillanceEvent,
  SurveillanceLogEntry,
} from '../lib/types';

// Default preferences for new installs
const DEFAULT_PREFERENCES: GrapesPreferences = {
  globalMode: 'detection-only', // Default to detection-only mode
  siteSettings: {},
  customStylesEnabled: false, // Disabled by default
  customStyles: {},
  suppressedNotificationDomains: [],
  onboardingComplete: false,
  loggingEnabled: true, // Logging enabled by default for local analysis
};

const tabSurveillance: Map<number, SurveillanceData> = new Map();
// Map tabId -> log entry for current page visit
const tabLogEntries: Map<number, SurveillanceLogEntry> = new Map();

/**
 * Get or create a log entry for a tab
 */
function getOrCreateLogEntry(
  tabId: number,
  url: string,
  domain: string,
  prefs: GrapesPreferences,
): SurveillanceLogEntry {
  let entry = tabLogEntries.get(tabId);
  if (!entry || entry.domain !== domain) {
    const status = getProtectionStatusForDomain(domain, prefs);
    entry = {
      domain,
      url,
      timestamp: Date.now(),
      events: [],
      protectionMode: status.mode,
      blocked: status.protectionEnabled,
    };
    tabLogEntries.set(tabId, entry);
  }
  return entry;
}

/**
 * Add an event to the log entry and persist if logging is enabled
 */
async function logSurveillanceEvent(
  tabId: number,
  url: string,
  domain: string,
  eventType: SurveillanceEvent['type'],
  details: string[],
  blocked: boolean,
) {
  console.log('[GRAPES] logSurveillanceEvent called:', {
    tabId,
    domain,
    eventType,
    details,
    blocked,
  });

  const prefs = await browser.storage.sync
    .get(['preferences'])
    .then((r) => (r.preferences as GrapesPreferences) || DEFAULT_PREFERENCES);
  const entry = getOrCreateLogEntry(tabId, url, domain, prefs);

  console.log('[GRAPES] Current entry events before:', entry.events.length);

  // Check if we already have this event type
  const existing = entry.events.find((e) => e.type === eventType);
  if (existing) {
    // Merge details without duplicates
    existing.details = [...new Set([...existing.details, ...details])];
    existing.timestamp = Date.now();
  } else {
    entry.events.push({
      type: eventType,
      details,
      timestamp: Date.now(),
      blocked,
    });
  }

  console.log('[GRAPES] Entry events after:', entry.events.length);
  console.log('[GRAPES] tabLogEntries has entry:', tabLogEntries.has(tabId));

  // Persist to storage if logging is enabled
  if (prefs.loggingEnabled) {
    console.log('[GRAPES] Persisting log entry...');
    await persistLogEntry(entry);
    console.log('[GRAPES] Log entry persisted');
  } else {
    console.log('[GRAPES] Logging disabled, not persisting');
  }
}

/**
 * Persist a log entry to local storage
 */
async function persistLogEntry(entry: SurveillanceLogEntry) {
  console.log('[GRAPES] persistLogEntry called for domain:', entry.domain);
  const result = await browser.storage.local.get(['surveillanceLogs']);
  const logs: SurveillanceLogEntry[] = result.surveillanceLogs || [];
  console.log('[GRAPES] Existing logs count:', logs.length);

  // Find existing entry for same domain + same day
  const today = new Date(entry.timestamp).toDateString();
  const existingIdx = logs.findIndex(
    (l) => l.domain === entry.domain && new Date(l.timestamp).toDateString() === today,
  );

  if (existingIdx >= 0) {
    // Merge events
    const existing = logs[existingIdx];
    for (const event of entry.events) {
      const existingEvent = existing.events.find((e) => e.type === event.type);
      if (existingEvent) {
        existingEvent.details = [...new Set([...existingEvent.details, ...event.details])];
        existingEvent.timestamp = Math.max(existingEvent.timestamp, event.timestamp);
      } else {
        existing.events.push(event);
      }
    }
    existing.timestamp = Math.max(existing.timestamp, entry.timestamp);
  } else {
    // Add new entry (keep last 100 entries)
    logs.push(entry);
    if (logs.length > 100) {
      logs.shift();
    }
  }

  await browser.storage.local.set({ surveillanceLogs: logs });
  console.log('[GRAPES] Logs saved to storage, new count:', logs.length);
}

export default defineBackground(() => {
  console.log('[GRAPES] Background script initialized');

  // Listen for extension install/update
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('[GRAPES] Extension installed');

      // Set default preferences for new install
      browser.storage.sync.set({
        preferences: DEFAULT_PREFERENCES,
      });

      // Open onboarding page
      browser.tabs.create({
        url: browser.runtime.getURL('onboarding.html'),
      });
    } else if (details.reason === 'update') {
      // Migrate old preferences if needed
      browser.storage.sync.get(['preferences']).then((result) => {
        const oldPrefs = result.preferences;
        if (oldPrefs && !('globalMode' in oldPrefs)) {
          // Migrate from old format
          const newPrefs: GrapesPreferences = {
            ...DEFAULT_PREFERENCES,
            customStylesEnabled: oldPrefs.enabled || false,
            customStyles: oldPrefs.customStyles || {},
            onboardingComplete: true, // Existing users don't need onboarding
          };
          browser.storage.sync.set({ preferences: newPrefs });
          console.log('[GRAPES] Migrated preferences to new format');
        }
      });
    }
  });

  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'SUSPICIOUS_OBSERVATION_DETECTED') {
      console.log('[GRAPES] Suspicious observation reported:', message.data);

      if (sender.tab?.id && sender.tab.url) {
        const domain = extractBaseDomain(new URL(sender.tab.url).hostname);
        const existing = tabSurveillance.get(sender.tab.id) || {
          mutationObserver: false,
          sessionReplay: [],
          fingerprinting: [],
          visibilityTracking: false,
          trackingPixels: [],
          timestamp: Date.now(),
        };
        existing.mutationObserver = true;
        existing.timestamp = Date.now();
        tabSurveillance.set(sender.tab.id, existing);
        console.log('[GRAPES] Updated tabSurveillance for tab', sender.tab.id, ':', existing);

        updateBadgeForTab(sender.tab.id, existing);

        // Log the event
        browser.storage.sync
          .get(['preferences'])
          .then((r) => {
            const prefs = (r.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
            const status = getProtectionStatusForDomain(domain, prefs);
            logSurveillanceEvent(
              sender.tab!.id!,
              sender.tab!.url!,
              domain,
              'dom-monitoring',
              [message.data?.targetType || 'unknown'],
              status.protectionEnabled,
            );
          })
          .catch((e) => console.error('[GRAPES] Error logging dom-monitoring event:', e));
      }
      return; // Explicit return for fire-and-forget messages
    }

    if (message.type === 'SESSION_REPLAY_DETECTED') {
      console.log('[GRAPES] Session replay tools detected:', message.data);

      if (sender.tab?.id && sender.tab.url) {
        const domain = extractBaseDomain(new URL(sender.tab.url).hostname);
        const existing = tabSurveillance.get(sender.tab.id) || {
          mutationObserver: false,
          sessionReplay: [],
          fingerprinting: [],
          visibilityTracking: false,
          trackingPixels: [],
          timestamp: Date.now(),
        };
        existing.sessionReplay = message.data.tools || [];
        existing.timestamp = Date.now();
        tabSurveillance.set(sender.tab.id, existing);
        console.log('[GRAPES] Updated tabSurveillance for tab', sender.tab.id);

        updateBadgeForTab(sender.tab.id, existing);

        // Log the event
        browser.storage.sync
          .get(['preferences'])
          .then((r) => {
            const prefs = (r.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
            const status = getProtectionStatusForDomain(domain, prefs);
            logSurveillanceEvent(
              sender.tab!.id!,
              sender.tab!.url!,
              domain,
              'session-replay',
              message.data.tools || [],
              status.protectionEnabled,
            );
          })
          .catch((e) => console.error('[GRAPES] Error logging session-replay event:', e));
      }
      return;
    }

    if (message.type === 'FINGERPRINTING_DETECTED') {
      console.log('[GRAPES] Fingerprinting detected:', message.data);

      if (sender.tab?.id && sender.tab.url) {
        const domain = extractBaseDomain(new URL(sender.tab.url).hostname);
        const existing = tabSurveillance.get(sender.tab.id) || {
          mutationObserver: false,
          sessionReplay: [],
          fingerprinting: [],
          visibilityTracking: false,
          trackingPixels: [],
          timestamp: Date.now(),
        };
        const newTypes = message.data.types || [];
        existing.fingerprinting = [...new Set([...existing.fingerprinting, ...newTypes])];
        existing.timestamp = Date.now();
        tabSurveillance.set(sender.tab.id, existing);
        console.log('[GRAPES] Updated tabSurveillance for tab', sender.tab.id);

        updateBadgeForTab(sender.tab.id, existing);

        // Log the event
        browser.storage.sync
          .get(['preferences'])
          .then((r) => {
            const prefs = (r.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
            const status = getProtectionStatusForDomain(domain, prefs);
            logSurveillanceEvent(
              sender.tab!.id!,
              sender.tab!.url!,
              domain,
              'fingerprinting',
              newTypes,
              status.protectionEnabled,
            );
          })
          .catch((e) => console.error('[GRAPES] Error logging fingerprinting event:', e));
      }
      return;
    }

    if (message.type === 'VISIBILITY_TRACKING_DETECTED') {
      console.log('[GRAPES] Visibility tracking detected:', message.data);

      if (sender.tab?.id && sender.tab.url) {
        const domain = extractBaseDomain(new URL(sender.tab.url).hostname);
        const existing = tabSurveillance.get(sender.tab.id) || {
          mutationObserver: false,
          sessionReplay: [],
          fingerprinting: [],
          visibilityTracking: false,
          trackingPixels: [],
          timestamp: Date.now(),
        };
        existing.visibilityTracking = true;
        existing.timestamp = Date.now();
        tabSurveillance.set(sender.tab.id, existing);
        console.log('[GRAPES] Updated tabSurveillance for tab', sender.tab.id);

        updateBadgeForTab(sender.tab.id, existing);

        // Log the event
        browser.storage.sync
          .get(['preferences'])
          .then((r) => {
            const prefs = (r.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
            const status = getProtectionStatusForDomain(domain, prefs);
            logSurveillanceEvent(
              sender.tab!.id!,
              sender.tab!.url!,
              domain,
              'visibility-tracking',
              ['tab-switch'],
              status.protectionEnabled,
            );
          })
          .catch((e) => console.error('[GRAPES] Error logging visibility-tracking event:', e));
      }
      return;
    }

    if (message.type === 'TRACKING_PIXEL_DETECTED') {
      console.log('[GRAPES] Tracking pixels detected:', message.data);

      if (sender.tab?.id && sender.tab.url) {
        const domain = extractBaseDomain(new URL(sender.tab.url).hostname);
        const existing = tabSurveillance.get(sender.tab.id) || {
          mutationObserver: false,
          sessionReplay: [],
          fingerprinting: [],
          visibilityTracking: false,
          trackingPixels: [],
          timestamp: Date.now(),
        };
        const newTypes = message.data.types || [];
        existing.trackingPixels = [...new Set([...existing.trackingPixels, ...newTypes])];
        existing.timestamp = Date.now();
        tabSurveillance.set(sender.tab.id, existing);
        console.log('[GRAPES] Updated tabSurveillance for tab', sender.tab.id);

        updateBadgeForTab(sender.tab.id, existing);

        // Log the event
        browser.storage.sync
          .get(['preferences'])
          .then((r) => {
            const prefs = (r.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
            const status = getProtectionStatusForDomain(domain, prefs);
            logSurveillanceEvent(
              sender.tab!.id!,
              sender.tab!.url!,
              domain,
              'tracking-pixel',
              newTypes,
              status.protectionEnabled,
            );
          })
          .catch((e) => console.error('[GRAPES] Error logging tracking-pixel event:', e));
      }
      return;
    }

    if (message.type === 'GET_SURVEILLANCE_DATA') {
      // Return surveillance data for the requesting tab
      if (sender.tab?.id) {
        return Promise.resolve(tabSurveillance.get(sender.tab.id) || null);
      }
      return Promise.resolve(null);
    }

    if (message.type === 'GET_TAB_SURVEILLANCE') {
      // Get surveillance data for a specific tab (from popup)
      const tabId = message.tabId;
      console.log('[GRAPES] GET_TAB_SURVEILLANCE request for tabId:', tabId);
      console.log('[GRAPES] tabSurveillance keys:', [...tabSurveillance.keys()]);
      const data = tabId ? tabSurveillance.get(tabId) || null : null;
      console.log('[GRAPES] Returning surveillance data:', data);
      return Promise.resolve(data);
    }

    if (message.type === 'GET_CURRENT_LOG_ENTRY') {
      // Get the current log entry for a specific tab
      const tabId = message.tabId;
      console.log('[GRAPES] GET_CURRENT_LOG_ENTRY request for tabId:', tabId);
      console.log('[GRAPES] tabLogEntries keys:', [...tabLogEntries.keys()]);
      const entry = tabId ? tabLogEntries.get(tabId) || null : null;
      console.log('[GRAPES] Returning log entry:', entry);
      return Promise.resolve(entry);
    }

    if (message.type === 'GET_ALL_LOGS') {
      // Get all stored logs (for future MongoDB sync or export)
      console.log('[GRAPES] GET_ALL_LOGS request');
      return browser.storage.local.get(['surveillanceLogs']).then((r) => {
        const logs = r.surveillanceLogs || [];
        console.log('[GRAPES] Returning', logs.length, 'logs');
        return logs;
      });
    }

    if (message.type === 'CLEAR_LOGS') {
      // Clear all stored logs
      return browser.storage.local.remove(['surveillanceLogs']).then(() => ({ success: true }));
    }

    if (message.type === 'GET_PROTECTION_STATUS') {
      // Get protection status for a specific domain
      return browser.storage.sync.get(['preferences']).then((result) => {
        const prefs = (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
        const domain = message.domain;
        return getProtectionStatusForDomain(domain, prefs);
      });
    }

    if (message.type === 'SET_SITE_PROTECTION') {
      // Set protection for a specific domain
      const { domain, setting } = message;
      return browser.storage.sync.get(['preferences']).then((result) => {
        const prefs = (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
        prefs.siteSettings[domain] = setting;
        return browser.storage.sync.set({ preferences: prefs }).then(() => {
          console.log(`[GRAPES] Site protection for ${domain} set to ${setting}`);
          return { success: true };
        });
      });
    }

    if (message.type === 'SET_GLOBAL_MODE') {
      // Set global protection mode
      const { mode } = message;
      return browser.storage.sync.get(['preferences']).then((result) => {
        const prefs = (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
        prefs.globalMode = mode;
        return browser.storage.sync.set({ preferences: prefs }).then(() => {
          console.log(`[GRAPES] Global mode set to ${mode}`);
          return { success: true };
        });
      });
    }

    if (message.type === 'GET_PREFERENCES') {
      // Get all preferences
      return browser.storage.sync.get(['preferences']).then((result) => {
        return (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
      });
    }

    if (message.type === 'SET_PREFERENCES') {
      // Set all preferences
      return browser.storage.sync.set({ preferences: message.preferences }).then(() => {
        return { success: true };
      });
    }

    if (message.type === 'COMPLETE_ONBOARDING') {
      // Mark onboarding as complete
      return browser.storage.sync.get(['preferences']).then((result) => {
        const prefs = (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
        prefs.onboardingComplete = true;
        return browser.storage.sync.set({ preferences: prefs }).then(() => {
          return { success: true };
        });
      });
    }

    if (message.type === 'ADD_SUPPRESSED_DOMAIN') {
      // Add a domain to the notification suppression list
      const { domain } = message;
      return browser.storage.sync.get(['preferences']).then((result) => {
        const prefs = (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
        if (!prefs.suppressedNotificationDomains.includes(domain)) {
          prefs.suppressedNotificationDomains.push(domain);
        }
        return browser.storage.sync.set({ preferences: prefs }).then(() => {
          console.log(`[GRAPES] Added ${domain} to notification suppression list`);
          return { success: true };
        });
      });
    }

    if (message.type === 'REMOVE_SUPPRESSED_DOMAIN') {
      // Remove a domain from the notification suppression list
      const { domain } = message;
      return browser.storage.sync.get(['preferences']).then((result) => {
        const prefs = (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
        prefs.suppressedNotificationDomains = prefs.suppressedNotificationDomains.filter(
          (d) => d !== domain,
        );
        return browser.storage.sync.set({ preferences: prefs }).then(() => {
          console.log(`[GRAPES] Removed ${domain} from notification suppression list`);
          return { success: true };
        });
      });
    }

    if (message.type === 'SET_LOGGING_ENABLED') {
      // Toggle surveillance logging
      const { enabled } = message;
      return browser.storage.sync.get(['preferences']).then((result) => {
        const prefs = (result.preferences as GrapesPreferences) || DEFAULT_PREFERENCES;
        prefs.loggingEnabled = enabled;
        return browser.storage.sync.set({ preferences: prefs }).then(() => {
          console.log(`[GRAPES] Logging ${enabled ? 'enabled' : 'disabled'}`);
          return { success: true };
        });
      });
    }

    // Return undefined for synchronous handling (no response needed)
    return;
  });

  // Clear badge when tab is updated (navigates to new page)
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      // Clear the badge and surveillance data when page starts loading
      clearBadgeForTab(tabId);
      tabSurveillance.delete(tabId);
    }
  });

  // Clean up when tab is closed
  browser.tabs.onRemoved.addListener((tabId) => {
    tabSurveillance.delete(tabId);
  });
});

/**
 * Update the extension badge based on surveillance data
 */
function updateBadgeForTab(tabId: number, data: SurveillanceData) {
  // Determine badge based on what's detected
  const hasFingerprinting = data.fingerprinting.length > 0;
  const hasReplay = data.sessionReplay.length > 0;
  const hasObservation = data.mutationObserver;
  const hasVisibility = data.visibilityTracking;
  const hasTracking = data.trackingPixels.length > 0;

  // Count total threat types
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

  // Set badge text to show threat count
  browser.action.setBadgeText({
    text: threatCount.toString(),
    tabId: tabId,
  });

  // Color based on severity (fingerprinting = most severe)
  let color = '#e94560'; // Red for observation
  if (hasVisibility) color = '#3498db'; // Blue for visibility
  if (hasTracking) color = '#e67e22'; // Orange for tracking pixels
  if (hasReplay) color = '#f39c12'; // Yellow-orange for replay
  if (hasFingerprinting) color = '#9b59b6'; // Purple for fingerprinting

  browser.action.setBadgeBackgroundColor({
    color: color,
    tabId: tabId,
  });

  browser.action.setBadgeTextColor({
    color: '#ffffff',
    tabId: tabId,
  });

  // Build title
  const threats: string[] = [];
  if (hasObservation) threats.push('DOM monitoring');
  if (hasVisibility) threats.push('Visibility tracking');
  if (hasTracking) threats.push(`Tracking pixels (${data.trackingPixels.join(', ')})`);
  if (hasReplay) threats.push(`Session replay (${data.sessionReplay.join(', ')})`);
  if (hasFingerprinting) threats.push(`Fingerprinting (${data.fingerprinting.join(', ')})`);

  browser.action.setTitle({
    title: `GRAPES: ${threats.join(', ')}`,
    tabId: tabId,
  });

  console.log(`[GRAPES] Badge updated for tab ${tabId}:`, threats);
}

/**
 * Clear the badge for a specific tab
 */
function clearBadgeForTab(tabId: number) {
  browser.action.setBadgeText({
    text: '',
    tabId: tabId,
  });

  browser.action.setTitle({
    title: 'GRAPES Settings',
    tabId: tabId,
  });
}

/**
 * Get protection status for a domain
 * Returns: { protectionEnabled: boolean, mode: string, siteOverride: string | null }
 */
function getProtectionStatusForDomain(
  domain: string,
  prefs: GrapesPreferences,
): {
  protectionEnabled: boolean;
  mode: 'full' | 'detection-only' | 'disabled';
  siteOverride: 'enabled' | 'disabled' | 'default' | null;
} {
  // Extract base domain
  const baseDomain = extractBaseDomain(domain);

  // Check for site-specific override
  const siteOverride = prefs.siteSettings[baseDomain] || null;

  if (siteOverride === 'enabled') {
    return { protectionEnabled: true, mode: 'full', siteOverride };
  }
  if (siteOverride === 'disabled') {
    return { protectionEnabled: false, mode: 'disabled', siteOverride };
  }

  // Use global mode
  const mode = prefs.globalMode;
  const protectionEnabled = mode === 'full';

  return { protectionEnabled, mode, siteOverride };
}

/**
 * Extract base domain from hostname
 */
function extractBaseDomain(hostname: string): string {
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }

  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;

  const secondLevelTLDs = ['co.uk', 'com.br', 'com.au', 'co.jp', 'co.in', 'com.mx'];
  const lastTwo = parts.slice(-2).join('.');
  if (secondLevelTLDs.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}
