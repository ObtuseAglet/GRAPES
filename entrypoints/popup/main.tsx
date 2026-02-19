import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import { ButtonGroup } from '../../lib/components/ButtonGroup';
import { EmptyState } from '../../lib/components/EmptyState';
import { StatusBadge } from '../../lib/components/StatusBadge';
import { ACCESSIBILITY_PRESETS, BUILT_IN_THEMES } from '../../lib/themes';
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
  customStyles: {},
  suppressedNotificationDomains: [],
  onboardingComplete: false,
  loggingEnabled: true,
};

const FONT_PRESETS = [
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
  '"Times New Roman", serif',
  '"Courier New", monospace',
];

function normalizeCustomStyles(customStyles: CustomStyles): CustomStyles {
  const normalized: CustomStyles = {};
  const backgroundColor = customStyles.backgroundColor?.trim();
  const textColor = customStyles.textColor?.trim();
  const fontSize = customStyles.fontSize?.trim();
  const fontFamily = customStyles.fontFamily?.trim();
  const customCSS = customStyles.customCSS?.trim();
  if (backgroundColor) normalized.backgroundColor = backgroundColor;
  if (textColor) normalized.textColor = textColor;
  if (fontSize) normalized.fontSize = fontSize;
  if (fontFamily) normalized.fontFamily = fontFamily;
  if (customCSS) normalized.customCSS = customCSS;
  return normalized;
}

function customStylesEqual(a: CustomStyles, b: CustomStyles): boolean {
  const normalizedA = normalizeCustomStyles(a);
  const normalizedB = normalizeCustomStyles(b);
  return (
    normalizedA.backgroundColor === normalizedB.backgroundColor &&
    normalizedA.textColor === normalizedB.textColor &&
    normalizedA.fontSize === normalizedB.fontSize &&
    normalizedA.fontFamily === normalizedB.fontFamily &&
    normalizedA.customCSS === normalizedB.customCSS
  );
}

function isGrapesPreferences(value: unknown): value is GrapesPreferences {
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
  const prefs = value as GrapesPreferences;
  const validMode =
    prefs.globalMode === 'full' ||
    prefs.globalMode === 'detection-only' ||
    prefs.globalMode === 'disabled';
  const validSiteSettings =
    !!prefs.siteSettings &&
    Object.values(prefs.siteSettings).every(
      (setting) => setting === 'enabled' || setting === 'disabled' || setting === 'default',
    );
  const validStyles =
    !!prefs.customStyles &&
    Object.entries(prefs.customStyles).every(
      ([key, styleValue]) =>
        ['backgroundColor', 'textColor', 'fontSize', 'fontFamily', 'customCSS'].includes(key) &&
        typeof styleValue === 'string',
    );
  return (
    validMode &&
    validSiteSettings &&
    typeof prefs.customStylesEnabled === 'boolean' &&
    validStyles &&
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
        : preferences?.globalMode === 'full';
  const mode = preferences?.globalMode || 'detection-only';
  const statusColor = active ? '#27ae60' : mode === 'detection-only' ? '#f39c12' : '#e74c3c';
  const statusText = active ? 'Protected' : mode === 'detection-only' ? 'Monitoring' : 'Disabled';

  return (
    <>
      <header className="popup-header">
        <div className="popup-title">
          <span className="popup-logo">🍇</span> GRAPES
        </div>
        <StatusBadge color={statusColor} text={statusText} />
      </header>
      <div className="domain-info">
        <div className="domain-name">{currentDomain || 'Unknown'}</div>
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
    { id: 'activity', label: '🔬 Activity' },
    { id: 'settings', label: '⚙️ Settings' },
    { id: 'muted', label: '🔕 Muted' },
    { id: 'styles', label: '🎨 Styles' },
  ];

  return (
    <div className="popup-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
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
}

function ActivityTab({ logEntry, surveillance, protectionActive }: ActivityTabProps) {
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
      <div className="activity-summary">
        <span className="summary-count">{events.length}</span>
        <span className="summary-text">tracking method{events.length !== 1 ? 's' : ''} found</span>
      </div>
      <div className="events-list">
        {events.map((e) => {
          const info = THREATS[e.type] || { icon: '❓', label: e.type, color: '#888', desc: '' };
          const details = e.details.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
          return (
            <div
              key={`${e.type}-${e.timestamp}`}
              className="event-card"
              style={{ borderLeftColor: info.color }}
            >
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
                {e.blocked ? '🛡️ Blocked' : '⚠️ Detected'}
              </div>
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
  onModeChange: (mode: 'full' | 'detection-only' | 'disabled') => void;
  onSiteChange: (setting: 'enabled' | 'disabled' | 'default') => void;
  onLoggingChange: (enabled: boolean) => void;
  onPreferencesUpdate: (nextPreferences: GrapesPreferences) => Promise<void>;
}

const MODE_OPTIONS: { value: 'full' | 'detection-only' | 'disabled'; label: string }[] = [
  { value: 'full', label: '🛡️ Full' },
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
  const [importError, setImportError] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleExportLogs() {
    try {
      const logs = await browser.runtime.sendMessage({ type: 'GET_ALL_LOGS' });
      if (!logs || logs.length === 0) {
        alert('No logs to export. Enable logging and browse some sites first.');
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
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to export logs');
    }
  }

  async function handleClearLogs() {
    if (confirm('Are you sure you want to clear all surveillance logs? This cannot be undone.')) {
      await browser.runtime.sendMessage({ type: 'CLEAR_LOGS' });
      alert('Logs cleared successfully');
    }
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
    } catch (e) {
      console.error('Settings export failed:', e);
      alert('Failed to export settings');
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
        setImportError('Invalid JSON format. Please ensure the file contains valid JSON data.');
        return;
      }
      if (!isGrapesPreferences(parsed)) {
        setImportError(
          'Settings file structure is invalid. Please import a GRAPES settings export.',
        );
        return;
      }
      setImportError('');
      await onPreferencesUpdate({
        ...parsed,
        customStyles: normalizeCustomStyles(parsed.customStyles || {}),
      });
      alert('Settings imported successfully');
    } catch (e) {
      console.error('Settings import failed:', e);
      setImportError('Failed to import settings file due to a read or processing error.');
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
            🗑️ Clear Logs
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
        {importError && <div className="setting-error">{importError}</div>}
      </div>

      <button type="button" className="primary-btn" onClick={handleStealthTest}>
        🔬 Run Stealth Test
      </button>
    </div>
  );
}

// --- Styles Tab Component ---
interface StylesTabProps {
  preferences: GrapesPreferences;
  onPreferencesUpdate: (nextPreferences: GrapesPreferences) => Promise<void>;
}

function StylesTab({ preferences, onPreferencesUpdate }: StylesTabProps) {
  const [customStylesEnabled, setCustomStylesEnabled] = useState(preferences.customStylesEnabled);
  const [customStyles, setCustomStyles] = useState<CustomStyles>(
    normalizeCustomStyles(preferences.customStyles),
  );

  useEffect(() => {
    setCustomStylesEnabled(preferences.customStylesEnabled);
    setCustomStyles(normalizeCustomStyles(preferences.customStyles));
  }, [preferences]);

  async function handleApply() {
    await onPreferencesUpdate({
      ...preferences,
      customStylesEnabled,
      customStyles: normalizeCustomStyles(customStyles),
    });
  }

  async function handleReset() {
    const resetPreferences: GrapesPreferences = {
      ...preferences,
      customStylesEnabled: false,
      customStyles: {},
    };
    setCustomStylesEnabled(resetPreferences.customStylesEnabled);
    setCustomStyles(resetPreferences.customStyles);
    await onPreferencesUpdate(resetPreferences);
  }

  async function handleThemeSelect(themeStyles: CustomStyles) {
    const nextStyles = normalizeCustomStyles(themeStyles);
    setCustomStylesEnabled(true);
    setCustomStyles(nextStyles);
    await onPreferencesUpdate({
      ...preferences,
      customStylesEnabled: true,
      customStyles: nextStyles,
    });
  }

  async function handlePresetApply(presetStyles: CustomStyles) {
    const mergedStyles = normalizeCustomStyles({
      ...customStyles,
      ...presetStyles,
    });
    setCustomStylesEnabled(true);
    setCustomStyles(mergedStyles);
    await onPreferencesUpdate({
      ...preferences,
      customStylesEnabled: true,
      customStyles: mergedStyles,
    });
  }

  const activeStyles = normalizeCustomStyles(preferences.customStyles);

  return (
    <div className="tab-content">
      <div className="setting-section">
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={customStylesEnabled}
            onChange={(e) => setCustomStylesEnabled(e.target.checked)}
          />
          <span>Enable custom styles</span>
        </label>
      </div>

      <div className="setting-section">
        <div className="setting-label">Themes</div>
        <div className="theme-grid">
          {BUILT_IN_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`theme-card ${customStylesEqual(activeStyles, theme.styles) ? 'active' : ''}`}
              onClick={() => handleThemeSelect(theme.styles)}
            >
              <span className="theme-icon">{theme.icon}</span>
              <span className="theme-name">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="setting-section">
        <div className="setting-label">♿ Accessibility</div>
        <div className="preset-grid">
          {ACCESSIBILITY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="secondary-btn"
              onClick={() => handlePresetApply(preset.styles)}
            >
              {preset.icon} {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-section">
        <div className="setting-label">Background Color</div>
        <input
          type="color"
          aria-label="Background color"
          value={customStyles.backgroundColor || '#ffffff'}
          onChange={(e) =>
            setCustomStyles((prev) => ({ ...prev, backgroundColor: e.target.value }))
          }
        />
      </div>

      <div className="setting-section">
        <div className="setting-label">Text Color</div>
        <input
          type="color"
          aria-label="Text color"
          value={customStyles.textColor || '#000000'}
          onChange={(e) => setCustomStyles((prev) => ({ ...prev, textColor: e.target.value }))}
        />
      </div>

      <div className="setting-section">
        <div className="setting-label">Font Size: {customStyles.fontSize || '16'}px</div>
        <input
          type="range"
          aria-label="Font size"
          min="10"
          max="32"
          value={customStyles.fontSize || '16'}
          onChange={(e) => setCustomStyles((prev) => ({ ...prev, fontSize: e.target.value }))}
          className="style-range"
        />
      </div>

      <div className="setting-section">
        <div className="setting-label">Font Family</div>
        <input
          type="text"
          aria-label="Font family"
          value={customStyles.fontFamily || ''}
          onChange={(e) => setCustomStyles((prev) => ({ ...prev, fontFamily: e.target.value }))}
          placeholder="e.g. Arial, sans-serif"
          className="style-input"
        />
        <select
          aria-label="Font family presets"
          value={customStyles.fontFamily || ''}
          onChange={(e) => setCustomStyles((prev) => ({ ...prev, fontFamily: e.target.value }))}
          className="style-input"
        >
          <option value="">Select a preset font...</option>
          {FONT_PRESETS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <div className="setting-section">
        <div className="setting-label">Custom CSS</div>
        <textarea
          aria-label="Custom CSS"
          rows={4}
          value={customStyles.customCSS || ''}
          onChange={(e) => setCustomStyles((prev) => ({ ...prev, customCSS: e.target.value }))}
          placeholder="body { line-height: 1.6 !important; }"
          className="style-textarea"
        />
      </div>

      <div className="btn-row">
        <button type="button" className="secondary-btn" onClick={handleReset}>
          ↺ Reset to Default
        </button>
        <button type="button" className="primary-btn apply-btn" onClick={handleApply}>
          ✅ Apply
        </button>
      </div>
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

// --- Root PopupApp Component ---
function PopupApp() {
  const [preferences, setPreferences] = useState<GrapesPreferences | null>(null);
  const [logEntry, setLogEntry] = useState<SurveillanceLogEntry | null>(null);
  const [surveillance, setSurveillance] = useState<SurveillanceData | null>(null);
  const [currentTab, setCurrentTab] = useState('activity');
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
    async function init() {
      const sourceTabId = getSourceTabId();
      console.log('[GRAPES Popup] Init, sourceTabId:', sourceTabId);

      try {
        const prefsResult = await browser.runtime.sendMessage({ type: 'GET_PREFERENCES' });
        const prefs: GrapesPreferences = prefsResult || DEFAULT_PREFERENCES;
        setPreferences(prefs);
        console.log('[GRAPES Popup] Preferences loaded:', prefs);

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

  async function handleModeChange(mode: 'full' | 'detection-only' | 'disabled') {
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

  async function handlePreferencesUpdate(nextPreferences: GrapesPreferences) {
    await browser.runtime.sendMessage({ type: 'SET_PREFERENCES', preferences: nextPreferences });
    setPreferences(nextPreferences);
  }

  if (!preferences) {
    return <div className="popup-container loading">Loading...</div>;
  }

  const override = preferences.siteSettings[currentDomain] || null;
  const protectionActive =
    override === 'enabled'
      ? true
      : override === 'disabled'
        ? false
        : preferences.globalMode === 'full';

  return (
    <div className="popup-container">
      <Header preferences={preferences} currentDomain={currentDomain} />
      <TabNav currentTab={currentTab} onTabChange={setCurrentTab} />
      {currentTab === 'activity' && (
        <ActivityTab
          logEntry={logEntry}
          surveillance={surveillance}
          protectionActive={protectionActive}
        />
      )}
      {currentTab === 'settings' && (
        <SettingsTab
          preferences={preferences}
          currentDomain={currentDomain}
          onModeChange={handleModeChange}
          onSiteChange={handleSiteChange}
          onLoggingChange={handleLoggingChange}
          onPreferencesUpdate={handlePreferencesUpdate}
        />
      )}
      {currentTab === 'muted' && (
        <MutedTab
          domains={preferences.suppressedNotificationDomains}
          onRemove={handleRemoveMuted}
        />
      )}
      {currentTab === 'styles' && (
        <StylesTab preferences={preferences} onPreferencesUpdate={handlePreferencesUpdate} />
      )}
    </div>
  );
}

// Mount
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<PopupApp />);
}
