import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import { SCHEMA_VERSION } from '../../core/contracts/types';
import { ButtonGroup } from '../../lib/components/ButtonGroup';
import { EmptyState } from '../../lib/components/EmptyState';
import { SiteReportCard } from '../../lib/components/SiteReportCard';
import { StatusBadge } from '../../lib/components/StatusBadge';
import { ThreatExplainer } from '../../lib/components/ThreatExplainer';
import type {
  CustomStyles,
  GrapesPreferences,
  SurveillanceData,
  SurveillanceEvent,
  SurveillanceLogEntry,
} from '../../lib/types';
import '../../assets/popup.css';

// Threat display info
const THREATS: Record<string, { icon: string; label: string; color: string; desc: string }> = {
  'dom-monitoring': {
    icon: '👁️',
    label: 'DOM Monitoring',
    color: '#e94560',
    desc: 'Watching page changes',
  },
  'session-replay': {
    icon: '🎬',
    label: 'Session Replay',
    color: '#f39c12',
    desc: 'Recording your activity',
  },
  fingerprinting: {
    icon: '🔍',
    label: 'Fingerprinting',
    color: '#9b59b6',
    desc: 'Creating device ID',
  },
  'visibility-tracking': {
    icon: '👁️',
    label: 'Visibility Tracking',
    color: '#3498db',
    desc: 'Detecting tab switches',
  },
  'tracking-pixel': {
    icon: '📡',
    label: 'Tracking Pixels',
    color: '#e67e22',
    desc: 'Cross-site tracking',
  },
};

const DEFAULT_PREFERENCES: GrapesPreferences = {
  globalMode: 'detection-only',
  siteSettings: {},
  customStylesEnabled: false,
  autoDarkMode: false,
  customStyles: {},
  siteStyles: {},
  suppressedNotificationDomains: [],
  onboardingComplete: false,
  loggingEnabled: true,
};

type ImportableGrapesPreferences = Omit<GrapesPreferences, 'autoDarkMode' | 'siteStyles'> & {
  autoDarkMode?: boolean;
  siteStyles?: Record<string, CustomStyles>;
};

const ALLOWED_STYLE_KEYS = [
  'backgroundColor',
  'textColor',
  'fontSize',
  'fontFamily',
  'customCSS',
] as const;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 32;
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
const FONT_FAMILY_PATTERN = /^[a-zA-Z0-9\s,'"()-]+$/;

function isValidColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

function normalizeFontSize(value: string): string | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return;
  const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parsed));
  return String(clamped);
}

function isValidFontFamily(value: string): boolean {
  return FONT_FAMILY_PATTERN.test(value);
}

function isSafeCustomCss(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return !lowerValue.includes('</style') && !lowerValue.includes('javascript:');
}

function isValidCustomStylesShape(styles: unknown): styles is CustomStyles {
  if (!styles || typeof styles !== 'object') return false;
  return Object.entries(styles).every(([key, styleValue]) => {
    if (!ALLOWED_STYLE_KEYS.includes(key as (typeof ALLOWED_STYLE_KEYS)[number])) return false;
    if (typeof styleValue !== 'string') return false;
    if ((key === 'backgroundColor' || key === 'textColor') && !isValidColor(styleValue.trim())) {
      return false;
    }
    if (key === 'fontSize') {
      const parsed = Number.parseInt(styleValue.trim(), 10);
      return Number.isFinite(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE;
    }
    if (key === 'fontFamily' && !isValidFontFamily(styleValue.trim())) {
      return false;
    }
    if (key === 'customCSS' && !isSafeCustomCss(styleValue.trim())) {
      return false;
    }
    return true;
  });
}

function normalizeCustomStyles(customStyles: CustomStyles): CustomStyles {
  const normalized: CustomStyles = {};
  const backgroundColor = customStyles.backgroundColor?.trim();
  const textColor = customStyles.textColor?.trim();
  const fontSize = customStyles.fontSize?.trim();
  const fontFamily = customStyles.fontFamily?.trim();
  const customCSS = customStyles.customCSS?.trim();
  if (backgroundColor && isValidColor(backgroundColor))
    normalized.backgroundColor = backgroundColor;
  if (textColor && isValidColor(textColor)) normalized.textColor = textColor;
  if (fontSize) {
    const normalizedFontSize = normalizeFontSize(fontSize);
    if (normalizedFontSize) normalized.fontSize = normalizedFontSize;
  }
  if (fontFamily && isValidFontFamily(fontFamily)) normalized.fontFamily = fontFamily;
  if (customCSS && isSafeCustomCss(customCSS)) normalized.customCSS = customCSS;
  return normalized;
}

function isGrapesPreferences(value: unknown): value is ImportableGrapesPreferences {
  if (!value || typeof value !== 'object') return false;
  if (
    !('globalMode' in value) ||
    !('siteSettings' in value) ||
    !('customStylesEnabled' in value) ||
    !('customStyles' in value) ||
    !('suppressedNotificationDomains' in value) ||
    !('onboardingComplete' in value) ||
    !('loggingEnabled' in value)
  ) {
    return false;
  }
  const prefs = value as ImportableGrapesPreferences;
  const validMode =
    prefs.globalMode === 'full' ||
    prefs.globalMode === 'detection-only' ||
    prefs.globalMode === 'disabled' ||
    prefs.globalMode === 'spoof';
  const validSiteSettings =
    !!prefs.siteSettings &&
    Object.values(prefs.siteSettings).every(
      (setting) => setting === 'enabled' || setting === 'disabled' || setting === 'default',
    );
  const validStyles = isValidCustomStylesShape(prefs.customStyles);
  const validSiteStyles =
    !('siteStyles' in value) ||
    (!!prefs.siteStyles &&
      Object.values(prefs.siteStyles).every((siteStyles) => isValidCustomStylesShape(siteStyles)));
  return (
    validMode &&
    validSiteSettings &&
    typeof prefs.customStylesEnabled === 'boolean' &&
    (!('autoDarkMode' in value) || typeof prefs.autoDarkMode === 'boolean') &&
    validStyles &&
    validSiteStyles &&
    Array.isArray(prefs.suppressedNotificationDomains) &&
    prefs.suppressedNotificationDomains.every((domain) => typeof domain === 'string') &&
    typeof prefs.onboardingComplete === 'boolean' &&
    typeof prefs.loggingEnabled === 'boolean'
  );
}

// Utility functions
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return hostname;
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    const ccTLDs = ['co.uk', 'com.br', 'com.au', 'co.jp', 'co.in', 'com.mx'];
    const lastTwo = parts.slice(-2).join('.');
    if (ccTLDs.includes(lastTwo) && parts.length > 2) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  } catch {
    return '';
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getSourceTabId(): number | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('tabId');
  return id ? parseInt(id, 10) : null;
}

// --- Header Component ---
interface HeaderProps {
  preferences: GrapesPreferences | null;
  currentDomain: string;
}

function Header({ preferences, currentDomain }: HeaderProps) {
  const override = preferences && currentDomain ? preferences.siteSettings[currentDomain] : null;
  const active =
    override === 'enabled'
      ? true
      : override === 'disabled'
        ? false
        : preferences?.globalMode === 'full' || preferences?.globalMode === 'spoof';
  const mode = preferences?.globalMode || 'detection-only';
  const isSpoofing = mode === 'spoof';
  const statusColor = active
    ? isSpoofing
      ? '#9b59b6'
      : '#27ae60'
    : mode === 'detection-only'
      ? '#f39c12'
      : '#e74c3c';
  const statusText = active
    ? isSpoofing
      ? 'Spoofing'
      : 'Protected'
    : mode === 'detection-only'
      ? 'Monitoring'
      : 'Disabled';

  return (
    <>
      <header className="popup-header">
        <div className="popup-title">
          <span className="popup-logo" role="img" aria-label="GRAPES">
            🍇
          </span>{' '}
          GRAPES
        </div>
        <StatusBadge color={statusColor} text={statusText} />
      </header>
      <div className="domain-info">
        <div className="domain-name" title={`Current site: ${currentDomain || 'Unknown'}`}>
          {currentDomain || 'Unknown'}
        </div>
      </div>
    </>
  );
}

// --- Tab Navigation Component ---
interface TabNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

function TabNav({ currentTab, onTabChange }: TabNavProps) {
  const tabs = [
    { id: 'now', label: '🔬 Now' },
    { id: 'protect', label: '🛡 Protect' },
    { id: 'data', label: '📊 Data' },
  ];

  if (!tabs.find((t) => t.id === currentTab)) {
    onTabChange('now');
  }

  return (
    <div className="popup-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={currentTab === tab.id}
          className={`tab-btn ${currentTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// --- Activity Tab Component ---
interface ActivityTabProps {
  logEntry: SurveillanceLogEntry | null;
  surveillance: SurveillanceData | null;
  protectionActive: boolean;
  currentDomain: string;
}

function ActivityTab({
  logEntry,
  surveillance,
  protectionActive,
  currentDomain,
}: ActivityTabProps) {
  function getEvents(): SurveillanceEvent[] {
    if (logEntry?.events?.length) return logEntry.events;
    if (!surveillance) return [];

    const events: SurveillanceEvent[] = [];
    const blocked = protectionActive;
    const ts = surveillance.timestamp;

    if (surveillance.mutationObserver) {
      events.push({ type: 'dom-monitoring', details: ['page changes'], timestamp: ts, blocked });
    }
    if (surveillance.sessionReplay?.length) {
      events.push({
        type: 'session-replay',
        details: surveillance.sessionReplay,
        timestamp: ts,
        blocked,
      });
    }
    if (surveillance.fingerprinting?.length) {
      events.push({
        type: 'fingerprinting',
        details: surveillance.fingerprinting,
        timestamp: ts,
        blocked,
      });
    }
    if (surveillance.visibilityTracking) {
      events.push({
        type: 'visibility-tracking',
        details: ['tab switches'],
        timestamp: ts,
        blocked,
      });
    }
    if (surveillance.trackingPixels?.length) {
      events.push({
        type: 'tracking-pixel',
        details: surveillance.trackingPixels,
        timestamp: ts,
        blocked,
      });
    }
    return events;
  }

  const events = getEvents();

  if (events.length === 0) {
    return (
      <div className="tab-content">
        <SiteReportCard domain={currentDomain} events={[]} protectionActive={protectionActive} />
        <EmptyState
          icon="✅"
          title="No Surveillance Detected"
          text="GRAPES is monitoring this page. Detected tracking will appear here."
        />
      </div>
    );
  }

  return (
    <div className="tab-content">
      <SiteReportCard domain={currentDomain} events={events} protectionActive={protectionActive} />
      <div className="activity-summary">
        <span className="summary-count">{events.length}</span>
        <span className="summary-text">tracking method{events.length !== 1 ? 's' : ''} found</span>
      </div>
      <div className="events-list">
        {events.map((e) => {
          const info = THREATS[e.type] || { icon: '❓', label: e.type, color: '#888', desc: '' };
          const details = e.details.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
          return (
            <div key={`${e.type}-${e.timestamp}`}>
              <div className="event-card" style={{ borderLeftColor: info.color }}>
                <div
                  className="event-icon"
                  style={{ background: `${info.color}20`, color: info.color }}
                >
                  {info.icon}
                </div>
                <div className="event-body">
                  <div className="event-header">
                    <span className="event-label">{info.label}</span>
                    <span className="event-time">{formatTime(e.timestamp)}</span>
                  </div>
                  <div className="event-details">{details}</div>
                  <div className="event-desc">{info.desc}</div>
                </div>
                <div className={`event-status ${e.blocked ? 'blocked' : 'detected'}`}>
                  {e.blocked ? 'Blocked' : 'Detected'}
                </div>
              </div>
              <ThreatExplainer category={e.type} blocked={e.blocked} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Settings Tab Component ---
interface SettingsTabProps {
  preferences: GrapesPreferences;
  currentDomain: string;
  onModeChange: (mode: 'full' | 'detection-only' | 'disabled' | 'spoof') => void;
  onSiteChange: (setting: 'enabled' | 'disabled' | 'default') => void;
  onLoggingChange: (enabled: boolean) => void;
  onPreferencesUpdate: (nextPreferences: GrapesPreferences) => Promise<boolean>;
}

const MODE_OPTIONS: { value: 'full' | 'detection-only' | 'disabled' | 'spoof'; label: string }[] = [
  { value: 'full', label: '🛡️ Full' },
  { value: 'spoof', label: '🎭 Spoof' },
  { value: 'detection-only', label: '👁️ Detect' },
  { value: 'disabled', label: '⏸️ Off' },
];

const SITE_OPTIONS: { value: 'enabled' | 'disabled' | 'default'; label: string }[] = [
  { value: 'enabled', label: '🟢 Protect' },
  { value: 'default', label: '⚪ Default' },
  { value: 'disabled', label: '🔴 Disable' },
];

function SettingsTab({
  preferences,
  currentDomain,
  onModeChange,
  onSiteChange,
  onLoggingChange,
  onPreferencesUpdate,
}: SettingsTabProps) {
  const override = preferences.siteSettings[currentDomain] || null;
  const siteActive: 'enabled' | 'disabled' | 'default' = override || 'default';
  const [settingsStatus, setSettingsStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleExportLogs() {
    try {
      const logs = await browser.runtime.sendMessage({ type: 'GET_ALL_LOGS' });
      if (!logs || logs.length === 0) {
        setSettingsStatus({
          type: 'error',
          text: 'No logs to export. Enable logging and browse some sites first.',
        });
        return;
      }
      const json = JSON.stringify(logs, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grapes-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSettingsStatus({ type: 'success', text: 'Logs exported.' });
    } catch (e) {
      console.error('Export failed:', e);
      setSettingsStatus({ type: 'error', text: 'Failed to export logs.' });
    }
  }

  async function handleClearLogs() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await browser.runtime.sendMessage({ type: 'CLEAR_LOGS' });
    setSettingsStatus({ type: 'success', text: 'Logs cleared.' });
    setConfirmClear(false);
  }

  async function handleStealthTest() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { type: 'RUN_STEALTH_TEST' });
      window.close();
    }
  }

  async function handleExportSettings() {
    try {
      const exportDate = new Date().toISOString().split('T')[0];
      const json = JSON.stringify(preferences, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grapes-settings-${exportDate}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSettingsStatus({ type: 'success', text: 'Settings exported successfully.' });
    } catch (e) {
      console.error('Settings export failed:', e);
      setSettingsStatus({ type: 'error', text: 'Failed to export settings' });
    }
  }

  async function handleImportSettings(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const content = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        setSettingsStatus({
          type: 'error',
          text: 'Invalid JSON format. Please ensure the file contains valid JSON data.',
        });
        return;
      }
      if (!isGrapesPreferences(parsed)) {
        setSettingsStatus({
          type: 'error',
          text: 'Settings file structure is invalid. Please import a GRAPES settings export.',
        });
        return;
      }
      const mergedPreferences: GrapesPreferences = {
        ...DEFAULT_PREFERENCES,
        ...parsed,
      };
      const updated = await onPreferencesUpdate({
        ...mergedPreferences,
        customStyles: normalizeCustomStyles(parsed.customStyles || {}),
        siteStyles: Object.fromEntries(
          Object.entries(mergedPreferences.siteStyles || {}).map(([domain, styles]) => [
            domain,
            normalizeCustomStyles(styles),
          ]),
        ),
      });
      if (!updated) {
        setSettingsStatus({
          type: 'error',
          text: 'Failed to apply imported settings. Please try again.',
        });
        return;
      }
      setSettingsStatus({
        type: 'success',
        text: 'Settings imported successfully.',
      });
    } catch (e) {
      console.error('Settings import failed:', e);
      setSettingsStatus({
        type: 'error',
        text: 'Failed to import settings file due to a read or processing error.',
      });
    }
  }

  return (
    <div className="tab-content">
      <div className="setting-section">
        <div className="setting-label">Global Mode</div>
        <ButtonGroup
          options={MODE_OPTIONS}
          active={preferences.globalMode}
          className="mode-btn"
          onSelect={onModeChange}
        />
      </div>

      <div className="setting-section">
        <div className="setting-label">This Site ({currentDomain})</div>
        <ButtonGroup
          options={SITE_OPTIONS}
          active={siteActive}
          className="site-btn"
          onSelect={onSiteChange}
        />
      </div>

      <div className="setting-section">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={preferences.loggingEnabled}
            onChange={(e) => onLoggingChange(e.target.checked)}
          />
          <span>Enable surveillance logging</span>
        </label>
        <div className="setting-hint">Logs are stored locally for future analysis</div>
      </div>

      <div className="setting-section">
        <div className="setting-label">Surveillance Logs</div>
        <div className="btn-row">
          <button type="button" className="secondary-btn" onClick={handleExportLogs}>
            📥 Export Logs
          </button>
          <button type="button" className="secondary-btn danger" onClick={handleClearLogs}>
            {confirmClear ? '⚠️ Confirm Clear' : '🗑️ Clear Logs'}
          </button>
        </div>
        <div className="setting-hint">Export logs as JSON for MongoDB import or analysis</div>
      </div>

      <div className="setting-section">
        <div className="setting-label">Preferences</div>
        <div className="btn-row">
          <button type="button" className="secondary-btn" onClick={handleExportSettings}>
            💾 Export Settings
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => importInputRef.current?.click()}
          >
            📤 Import Settings
          </button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportSettings}
          style={{ display: 'none' }}
        />
        {settingsStatus && (
          <div className={`setting-feedback ${settingsStatus.type}`}>{settingsStatus.text}</div>
        )}
      </div>

      <button type="button" className="primary-btn" onClick={handleStealthTest}>
        🔬 Run Stealth Test
      </button>
    </div>
  );
}

// --- Muted Tab Component ---
interface MutedTabProps {
  domains: string[];
  onRemove: (domain: string) => void;
}

function MutedTab({ domains, onRemove }: MutedTabProps) {
  if (domains.length === 0) {
    return (
      <div className="tab-content">
        <EmptyState
          icon="🔔"
          title="No Muted Sites"
          text="When you mute notifications for a site, it will appear here."
        />
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="setting-hint" style={{ marginBottom: '12px' }}>
        Notifications are hidden on these sites. Detection still works.
      </div>
      <div className="muted-list">
        {domains.map((d) => (
          <div key={d} className="muted-item">
            <span className="muted-domain">{d}</span>
            <button type="button" className="remove-btn" onClick={() => onRemove(d)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DataTabProps {
  domains: string[];
  onRemove: (domain: string) => void;
  installationId: string;
  queueLength: number;
  lastSyncAt: number | null;
  onFlushQueue: () => Promise<void>;
  contributionConsent: boolean;
  contributionEndpoint: string;
  onContributionChange: (enabled: boolean) => Promise<void>;
  onEndpointChange: (endpoint: string) => Promise<void>;
}

function DataTab({
  domains,
  onRemove,
  installationId,
  queueLength,
  lastSyncAt,
  onFlushQueue,
  contributionConsent,
  contributionEndpoint,
  onContributionChange,
  onEndpointChange,
}: DataTabProps) {
  const [endpointDraft, setEndpointDraft] = useState(contributionEndpoint);
  const [endpointSaved, setEndpointSaved] = useState(false);

  return (
    <div className="tab-content">
      <div className="setting-section">
        <div className="setting-label">Data Contribution</div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={contributionConsent}
            onChange={(e) => onContributionChange(e.target.checked)}
          />
          <span>Help map web surveillance</span>
        </label>
        <div className="setting-hint">
          When enabled, GRAPES sends privacy-minimized observations with a reinstall-scoped
          installation ID used only for deduplication and corroboration. No full URLs leave the
          extension.
        </div>
        <div className="setting-hint">Installation ID: {installationId || 'Pending setup'}</div>
        <div className="setting-hint">Queue: {queueLength} pending contribution(s)</div>
        <div className="setting-hint">
          Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'}
        </div>
        <div className="setting-label" style={{ marginTop: '12px' }}>
          Contribution Endpoint
        </div>
        <div className="btn-row">
          <input
            type="text"
            className="style-input"
            value={endpointDraft}
            onChange={(e) => {
              setEndpointDraft(e.target.value);
              setEndpointSaved(false);
            }}
            placeholder="https://api.example.com/v1/contributions"
            style={{ marginTop: 0 }}
          />
          <button
            type="button"
            className="secondary-btn"
            onClick={async () => {
              await onEndpointChange(endpointDraft.trim());
              setEndpointSaved(true);
            }}
          >
            Save
          </button>
        </div>
        {endpointSaved && <div className="setting-feedback success">Endpoint saved.</div>}
        <div className="setting-hint">
          Set the ingest endpoint for opt-in contribution uploads.
        </div>
        <button type="button" className="secondary-btn" onClick={onFlushQueue}>
          Sync Contributions
        </button>
      </div>
      <MutedTab domains={domains} onRemove={onRemove} />
    </div>
  );
}

// --- Root PopupApp Component ---
function PopupApp() {
  const [preferences, setPreferences] = useState<GrapesPreferences | null>(null);
  const [logEntry, setLogEntry] = useState<SurveillanceLogEntry | null>(null);
  const [surveillance, setSurveillance] = useState<SurveillanceData | null>(null);
  const [currentTab, setCurrentTab] = useState('now');
  const [currentDomain, setCurrentDomain] = useState('');
  const [installationId, setInstallationId] = useState('');
  const [queueLength, setQueueLength] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [contributionConsent, setContributionConsent] = useState(false);
  const [contributionEndpoint, setContributionEndpoint] = useState('');
  const [showResetNotice, setShowResetNotice] = useState(false);

  useEffect(() => {
    async function init() {
      const sourceTabId = getSourceTabId();
      console.log('[GRAPES Popup] Init, sourceTabId:', sourceTabId);

      try {
        const prefsResult = await browser.runtime.sendMessage({ type: 'GET_PREFERENCES' });
        const prefs: GrapesPreferences = prefsResult || DEFAULT_PREFERENCES;
        setPreferences(prefs);
        console.log('[GRAPES Popup] Preferences loaded:', prefs);
        try {
          const coreState = await browser.runtime.sendMessage({
            type: 'CORE_GET_STATE',
            requestId: `popup-state-${Date.now()}`,
            source: 'popup',
            timestamp: Date.now(),
            schemaVersion: SCHEMA_VERSION,
          });
          if (coreState?.ok) {
            const ageMs = Date.now() - (coreState.data.installState?.resetTimestamp || 0);
            setShowResetNotice(ageMs < 1000 * 60 * 60 * 24);
          }

          const contribStatus = await browser.runtime.sendMessage({
            type: 'CORE_GET_CONTRIBUTION_STATUS',
            requestId: `popup-contrib-${Date.now()}`,
            source: 'popup',
            timestamp: Date.now(),
            schemaVersion: SCHEMA_VERSION,
          });
          if (contribStatus?.ok) {
            setInstallationId(contribStatus.data.installationId);
            setContributionConsent(contribStatus.data.consentGiven);
            setContributionEndpoint(contribStatus.data.endpoint || '');
            setQueueLength(contribStatus.data.queueLength);
            setLastSyncAt(contribStatus.data.lastSyncAt);
          }
        } catch {
          // Ignore if core router is unavailable during compatibility window.
        }

        let tabId: number | undefined;
        let url = '';
        let domain = '';

        if (sourceTabId) {
          tabId = sourceTabId;
          try {
            const tab = await browser.tabs.get(sourceTabId);
            url = tab.url || '';
            domain = extractDomain(url);
            console.log('[GRAPES Popup] Using source tab:', tabId, domain);
          } catch (e) {
            console.log('[GRAPES Popup] Failed to get source tab:', e);
          }
        }

        if (!tabId || !domain) {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          if (tab?.id && tab.url && !tab.url.startsWith('chrome')) {
            tabId = tab.id;
            url = tab.url;
            domain = extractDomain(url);
            console.log('[GRAPES Popup] Using active tab:', tabId, domain);
          }
        }

        setCurrentDomain(domain);

        if (tabId) {
          try {
            const entry = await browser.runtime.sendMessage({
              type: 'GET_CURRENT_LOG_ENTRY',
              tabId,
            });
            const surv = await browser.runtime.sendMessage({
              type: 'GET_TAB_SURVEILLANCE',
              tabId,
            });
            console.log('[GRAPES Popup] Log entry:', entry);
            console.log('[GRAPES Popup] Surveillance:', surv);

            if (!entry && !surv && domain) {
              console.log(
                '[GRAPES Popup] No in-memory data, checking persisted logs for domain:',
                domain,
              );
              const allLogs = await browser.runtime.sendMessage({ type: 'GET_ALL_LOGS' });
              if (allLogs && Array.isArray(allLogs)) {
                const domainLogs = allLogs.filter((l: SurveillanceLogEntry) => l.domain === domain);
                if (domainLogs.length > 0) {
                  const latest = domainLogs.sort(
                    (a: SurveillanceLogEntry, b: SurveillanceLogEntry) => b.timestamp - a.timestamp,
                  )[0];
                  setLogEntry(latest);
                  console.log('[GRAPES Popup] Found persisted log entry:', latest);
                }
              }
            } else {
              setLogEntry(entry || null);
              setSurveillance(surv || null);
            }
          } catch (e) {
            console.log('[GRAPES Popup] Failed to get surveillance data:', e);
          }
        }
      } catch (e) {
        console.error('[GRAPES Popup] Init error:', e);
      }
    }

    init();
  }, []);

  async function handleModeChange(mode: 'full' | 'detection-only' | 'disabled' | 'spoof') {
    await browser.runtime.sendMessage({ type: 'SET_GLOBAL_MODE', mode });
    setPreferences((prev) => prev && { ...prev, globalMode: mode });
  }

  async function handleSiteChange(setting: 'enabled' | 'disabled' | 'default') {
    await browser.runtime.sendMessage({
      type: 'SET_SITE_PROTECTION',
      domain: currentDomain,
      setting,
    });
    setPreferences((prev) => {
      if (!prev) return prev;
      const siteSettings = { ...prev.siteSettings };
      if (setting === 'default') delete siteSettings[currentDomain];
      else siteSettings[currentDomain] = setting;
      return { ...prev, siteSettings };
    });
  }

  async function handleLoggingChange(enabled: boolean) {
    await browser.runtime.sendMessage({ type: 'SET_LOGGING_ENABLED', enabled });
    setPreferences((prev) => prev && { ...prev, loggingEnabled: enabled });
  }

  async function handleRemoveMuted(domain: string) {
    await browser.runtime.sendMessage({ type: 'REMOVE_SUPPRESSED_DOMAIN', domain });
    setPreferences(
      (prev) =>
        prev && {
          ...prev,
          suppressedNotificationDomains: prev.suppressedNotificationDomains.filter(
            (d) => d !== domain,
          ),
        },
    );
  }

  async function handlePreferencesUpdate(nextPreferences: GrapesPreferences): Promise<boolean> {
    try {
      await browser.runtime.sendMessage({ type: 'SET_PREFERENCES', preferences: nextPreferences });
      setPreferences(nextPreferences);
      return true;
    } catch (error) {
      console.error('Failed to update preferences via SET_PREFERENCES message', error);
      return false;
    }
  }

  async function handleContributionChange(enabled: boolean): Promise<void> {
    const response = await browser.runtime.sendMessage({
      type: 'CORE_SET_CONTRIBUTION_CONSENT',
      enabled,
      requestId: `popup-contrib-consent-${Date.now()}`,
      source: 'popup',
      timestamp: Date.now(),
      schemaVersion: SCHEMA_VERSION,
    });
    if (response?.ok) {
      setContributionConsent(enabled);
    }
  }

  async function handleEndpointChange(endpoint: string): Promise<void> {
    const response = await browser.runtime.sendMessage({
      type: 'CORE_SET_CONTRIBUTION_ENDPOINT',
      endpoint,
      requestId: `popup-endpoint-${Date.now()}`,
      source: 'popup',
      timestamp: Date.now(),
      schemaVersion: SCHEMA_VERSION,
    });
    if (response?.ok) {
      setContributionEndpoint(endpoint);
    }
  }

  async function handleFlushQueue(): Promise<void> {
    const response = await browser.runtime.sendMessage({
      type: 'CORE_FLUSH_CONTRIBUTION_QUEUE',
      requestId: `popup-flush-${Date.now()}`,
      source: 'popup',
      timestamp: Date.now(),
      schemaVersion: SCHEMA_VERSION,
    });
    if (response?.ok) {
      const status = await browser.runtime.sendMessage({
        type: 'CORE_GET_CONTRIBUTION_STATUS',
        requestId: `popup-contrib-refresh-${Date.now()}`,
        source: 'popup',
        timestamp: Date.now(),
        schemaVersion: SCHEMA_VERSION,
      });
      if (status?.ok) {
        setInstallationId(status.data.installationId);
        setQueueLength(status.data.queueLength);
        setLastSyncAt(status.data.lastSyncAt);
        setContributionConsent(status.data.consentGiven);
      }
    }
  }

  if (!preferences) {
    return (
      <div className="popup-container loading">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🍇</div>
          <div style={{ color: '#888', fontSize: '13px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  const override = preferences.siteSettings[currentDomain] || null;
  const protectionActive =
    override === 'enabled'
      ? true
      : override === 'disabled'
        ? false
        : preferences.globalMode === 'full' || preferences.globalMode === 'spoof';

  return (
    <div className="popup-container">
      {showResetNotice && (
        <div className="setting-feedback success">
          GRAPES storage was reset for schema v{SCHEMA_VERSION}. Configure protection and
          contribution preferences.
        </div>
      )}
      <Header preferences={preferences} currentDomain={currentDomain} />
      <TabNav currentTab={currentTab} onTabChange={setCurrentTab} />
      {currentTab === 'now' && (
        <ActivityTab
          logEntry={logEntry}
          surveillance={surveillance}
          protectionActive={protectionActive}
          currentDomain={currentDomain}
        />
      )}
      {currentTab === 'protect' && (
        <SettingsTab
          preferences={preferences}
          currentDomain={currentDomain}
          onModeChange={handleModeChange}
          onSiteChange={handleSiteChange}
          onLoggingChange={handleLoggingChange}
          onPreferencesUpdate={handlePreferencesUpdate}
        />
      )}
      {currentTab === 'data' && (
        <DataTab
          domains={preferences.suppressedNotificationDomains}
          onRemove={handleRemoveMuted}
          installationId={installationId}
          queueLength={queueLength}
          lastSyncAt={lastSyncAt}
          onFlushQueue={handleFlushQueue}
          contributionConsent={contributionConsent}
          contributionEndpoint={contributionEndpoint}
          onContributionChange={handleContributionChange}
          onEndpointChange={handleEndpointChange}
        />
      )}
    </div>
  );
}

// Mount
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<PopupApp />);
}
