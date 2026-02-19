import { browser } from 'wxt/browser';
import type {
  GrapesPreferences,
  SurveillanceData,
  SurveillanceEvent,
  SurveillanceLogEntry,
} from '../../lib/types';
import '../../assets/popup.css';

// State
let preferences: GrapesPreferences | null = null;
let logEntry: SurveillanceLogEntry | null = null;
let surveillance: SurveillanceData | null = null;
let currentUrl = '';
let currentDomain = '';
let currentTab = 'activity';

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

function getSiteOverride(): 'enabled' | 'disabled' | 'default' | null {
  if (!preferences || !currentDomain) return null;
  return preferences.siteSettings[currentDomain] || null;
}

function isProtectionActive(): boolean {
  const override = getSiteOverride();
  if (override === 'enabled') return true;
  if (override === 'disabled') return false;
  return preferences?.globalMode === 'full';
}

// Build events from surveillance data
function getEvents(): SurveillanceEvent[] {
  if (logEntry?.events?.length) return logEntry.events;
  if (!surveillance) return [];

  const events: SurveillanceEvent[] = [];
  const blocked = isProtectionActive();
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
    events.push({ type: 'visibility-tracking', details: ['tab switches'], timestamp: ts, blocked });
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

// Render functions
function renderHeader(): string {
  const active = isProtectionActive();
  const mode = preferences?.globalMode || 'detection-only';
  const statusColor = active ? '#27ae60' : mode === 'detection-only' ? '#f39c12' : '#e74c3c';
  const statusText = active ? 'Protected' : mode === 'detection-only' ? 'Monitoring' : 'Disabled';

  return `
    <header class="popup-header">
      <div class="popup-title"><span class="popup-logo">🍇</span> GRAPES</div>
      <div class="popup-status" style="color: ${statusColor};">
        <span class="status-dot" style="background: ${statusColor};"></span> ${statusText}
      </div>
    </header>
    <div class="domain-info">
      <div class="domain-name">${currentDomain || 'Unknown'}</div>
    </div>
  `;
}

function renderTabs(): string {
  return `
    <div class="popup-tabs">
      <button class="tab-btn ${currentTab === 'activity' ? 'active' : ''}" data-tab="activity">🔬 Activity</button>
      <button class="tab-btn ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">⚙️ Settings</button>
      <button class="tab-btn ${currentTab === 'muted' ? 'active' : ''}" data-tab="muted">🔕 Muted</button>
    </div>
  `;
}

function renderActivityTab(): string {
  const events = getEvents();

  if (events.length === 0) {
    return `
      <div class="tab-content">
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <div class="empty-title">No Surveillance Detected</div>
          <div class="empty-text">GRAPES is monitoring this page. Detected tracking will appear here.</div>
        </div>
      </div>
    `;
  }

  const eventsHtml = events
    .map((e) => {
      const info = THREATS[e.type] || { icon: '❓', label: e.type, color: '#888', desc: '' };
      const details = e.details.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
      return `
      <div class="event-card" style="border-left-color: ${info.color};">
        <div class="event-icon" style="background: ${info.color}20; color: ${info.color};">${info.icon}</div>
        <div class="event-body">
          <div class="event-header">
            <span class="event-label">${info.label}</span>
            <span class="event-time">${formatTime(e.timestamp)}</span>
          </div>
          <div class="event-details">${details}</div>
          <div class="event-desc">${info.desc}</div>
        </div>
        <div class="event-status ${e.blocked ? 'blocked' : 'detected'}">${e.blocked ? '🛡️ Blocked' : '⚠️ Detected'}</div>
      </div>
    `;
    })
    .join('');

  return `
    <div class="tab-content">
      <div class="activity-summary">
        <span class="summary-count">${events.length}</span>
        <span class="summary-text">tracking method${events.length !== 1 ? 's' : ''} found</span>
      </div>
      <div class="events-list">${eventsHtml}</div>
    </div>
  `;
}

function renderSettingsTab(): string {
  const mode = preferences?.globalMode || 'detection-only';
  const override = getSiteOverride();
  const logging = preferences?.loggingEnabled || false;

  return `
    <div class="tab-content">
      <div class="setting-section">
        <div class="setting-label">Global Mode</div>
        <div class="btn-group">
          <button class="mode-btn ${mode === 'full' ? 'active' : ''}" data-mode="full">🛡️ Full</button>
          <button class="mode-btn ${mode === 'detection-only' ? 'active' : ''}" data-mode="detection-only">👁️ Detect</button>
          <button class="mode-btn ${mode === 'disabled' ? 'active' : ''}" data-mode="disabled">⏸️ Off</button>
        </div>
      </div>
      
      <div class="setting-section">
        <div class="setting-label">This Site (${currentDomain})</div>
        <div class="btn-group">
          <button class="site-btn ${override === 'enabled' ? 'active' : ''}" data-site="enabled">🟢 Protect</button>
          <button class="site-btn ${!override || override === 'default' ? 'active' : ''}" data-site="default">⚪ Default</button>
          <button class="site-btn ${override === 'disabled' ? 'active' : ''}" data-site="disabled">🔴 Disable</button>
        </div>
      </div>
      
      <div class="setting-section">
        <label class="toggle-row">
          <input type="checkbox" id="logging-toggle" ${logging ? 'checked' : ''}>
          <span>Enable surveillance logging</span>
        </label>
        <div class="setting-hint">Logs are stored locally for future analysis</div>
      </div>
      
      <div class="setting-section">
        <div class="setting-label">Surveillance Logs</div>
        <div class="btn-row">
          <button id="export-logs" class="secondary-btn">📥 Export Logs</button>
          <button id="clear-logs" class="secondary-btn danger">🗑️ Clear Logs</button>
        </div>
        <div class="setting-hint">Export logs as JSON for MongoDB import or analysis</div>
      </div>
      
      <button id="stealth-test" class="primary-btn">🔬 Run Stealth Test</button>
    </div>
  `;
}

function renderMutedTab(): string {
  const domains = preferences?.suppressedNotificationDomains || [];

  if (domains.length === 0) {
    return `
      <div class="tab-content">
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <div class="empty-title">No Muted Sites</div>
          <div class="empty-text">When you mute notifications for a site, it will appear here.</div>
        </div>
      </div>
    `;
  }

  const listHtml = domains
    .map(
      (d) => `
    <div class="muted-item">
      <span class="muted-domain">${d}</span>
      <button class="remove-btn" data-domain="${d}">✕</button>
    </div>
  `,
    )
    .join('');

  return `
    <div class="tab-content">
      <div class="setting-hint" style="margin-bottom: 12px;">
        Notifications are hidden on these sites. Detection still works.
      </div>
      <div class="muted-list">${listHtml}</div>
    </div>
  `;
}

function render() {
  const root = document.getElementById('root');
  if (!root) return;

  if (!preferences) {
    root.innerHTML = '<div class="popup-container loading">Loading...</div>';
    return;
  }

  const tabContent =
    currentTab === 'settings'
      ? renderSettingsTab()
      : currentTab === 'muted'
        ? renderMutedTab()
        : renderActivityTab();

  root.innerHTML = `
    <div class="popup-container">
      ${renderHeader()}
      ${renderTabs()}
      ${tabContent}
    </div>
  `;

  attachListeners();
}

function attachListeners() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      currentTab = (e.target as HTMLElement).dataset.tab || 'activity';
      render();
    });
  });

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const mode = (e.target as HTMLElement).dataset.mode as 'full' | 'detection-only' | 'disabled';
      await browser.runtime.sendMessage({ type: 'SET_GLOBAL_MODE', mode });
      if (preferences) preferences.globalMode = mode;
      render();
    });
  });

  // Site buttons
  document.querySelectorAll('.site-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const setting = (e.target as HTMLElement).dataset.site as 'enabled' | 'disabled' | 'default';
      await browser.runtime.sendMessage({
        type: 'SET_SITE_PROTECTION',
        domain: currentDomain,
        setting,
      });
      if (preferences) {
        if (setting === 'default') delete preferences.siteSettings[currentDomain];
        else preferences.siteSettings[currentDomain] = setting;
      }
      render();
    });
  });

  // Logging toggle
  document.getElementById('logging-toggle')?.addEventListener('change', async (e) => {
    const enabled = (e.target as HTMLInputElement).checked;
    await browser.runtime.sendMessage({ type: 'SET_LOGGING_ENABLED', enabled });
    if (preferences) preferences.loggingEnabled = enabled;
  });

  // Export logs
  document.getElementById('export-logs')?.addEventListener('click', async () => {
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
  });

  // Clear logs
  document.getElementById('clear-logs')?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all surveillance logs? This cannot be undone.')) {
      await browser.runtime.sendMessage({ type: 'CLEAR_LOGS' });
      alert('Logs cleared successfully');
    }
  });

  // Stealth test
  document.getElementById('stealth-test')?.addEventListener('click', async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { type: 'RUN_STEALTH_TEST' });
      window.close();
    }
  });

  // Remove muted site
  document.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const domain = (e.target as HTMLElement).dataset.domain;
      if (domain) {
        await browser.runtime.sendMessage({ type: 'REMOVE_SUPPRESSED_DOMAIN', domain });
        if (preferences) {
          preferences.suppressedNotificationDomains =
            preferences.suppressedNotificationDomains.filter((d) => d !== domain);
        }
        render();
      }
    });
  });
}

// Get source tab from URL params
function getSourceTabId(): number | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('tabId');
  return id ? parseInt(id, 10) : null;
}

// Initialize
async function init() {
  const sourceTabId = getSourceTabId();
  console.log('[GRAPES Popup] Init, sourceTabId:', sourceTabId);

  try {
    const prefsResult = await browser.runtime.sendMessage({ type: 'GET_PREFERENCES' });
    preferences = prefsResult || {
      globalMode: 'detection-only',
      siteSettings: {},
      customStylesEnabled: false,
      customStyles: {},
      suppressedNotificationDomains: [],
      onboardingComplete: false,
      loggingEnabled: true,
    };
    console.log('[GRAPES Popup] Preferences loaded:', preferences);

    let tabId: number | undefined;
    if (sourceTabId) {
      tabId = sourceTabId;
      try {
        const tab = await browser.tabs.get(sourceTabId);
        currentUrl = tab.url || '';
        currentDomain = extractDomain(currentUrl);
        console.log('[GRAPES Popup] Using source tab:', tabId, currentDomain);
      } catch (e) {
        console.log('[GRAPES Popup] Failed to get source tab:', e);
      }
    }

    if (!tabId || !currentDomain) {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url && !tab.url.startsWith('chrome')) {
        tabId = tab.id;
        currentUrl = tab.url;
        currentDomain = extractDomain(currentUrl);
        console.log('[GRAPES Popup] Using active tab:', tabId, currentDomain);
      }
    }

    if (tabId) {
      try {
        logEntry = await browser.runtime.sendMessage({ type: 'GET_CURRENT_LOG_ENTRY', tabId });
        surveillance = await browser.runtime.sendMessage({ type: 'GET_TAB_SURVEILLANCE', tabId });
        console.log('[GRAPES Popup] Log entry:', logEntry);
        console.log('[GRAPES Popup] Surveillance:', surveillance);

        // Fallback: if no data from in-memory, check persisted logs for this domain
        if (!logEntry && !surveillance && currentDomain) {
          console.log(
            '[GRAPES Popup] No in-memory data, checking persisted logs for domain:',
            currentDomain,
          );
          const allLogs = await browser.runtime.sendMessage({ type: 'GET_ALL_LOGS' });
          if (allLogs && Array.isArray(allLogs)) {
            // Find most recent log entry for this domain
            const domainLogs = allLogs.filter(
              (l: SurveillanceLogEntry) => l.domain === currentDomain,
            );
            if (domainLogs.length > 0) {
              // Get the most recent one
              logEntry = domainLogs.sort(
                (a: SurveillanceLogEntry, b: SurveillanceLogEntry) => b.timestamp - a.timestamp,
              )[0];
              console.log('[GRAPES Popup] Found persisted log entry:', logEntry);
            }
          }
        }
      } catch (e) {
        console.log('[GRAPES Popup] Failed to get surveillance data:', e);
      }
    }

    render();
  } catch (e) {
    console.error('[GRAPES Popup] Init error:', e);
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML = `<div class="popup-container"><p>Error: ${e}</p></div>`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
