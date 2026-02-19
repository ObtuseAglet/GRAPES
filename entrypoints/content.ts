import { injectStealthTest } from '../lib/stealth-tester';
import { BUILT_IN_THEMES } from '../lib/themes';
import type { CustomStyles, GrapesPreferences } from '../lib/types';
import { activateSelectorInspector } from './inspector.content';

// ============================================================================
// NOTIFICATION MANAGER - Handles stacking toast notifications
// ============================================================================

interface NotificationItem {
  id: string;
  type: 'dom' | 'replay' | 'fingerprint' | 'visibility' | 'tracking';
  title: string;
  message: string;
  detail: string;
  color: string;
  icon: string;
}

class NotificationManager {
  private container: HTMLElement | null = null;
  private notifications: Map<string, HTMLElement> = new Map();
  private pendingNotifications: NotificationItem[] = [];
  private isReady = false;
  private stylesInjected = false;
  private suppressedDomains: Set<string> = new Set();
  private currentDomain: string = '';

  constructor() {
    // Get current domain
    this.currentDomain = this.extractDomain(window.location.hostname);

    // Load suppressed domains from storage
    this.loadSuppressedDomains().then(() => {
      // Wait for DOM to be ready
      if (document.body) {
        this.init();
      } else {
        document.addEventListener('DOMContentLoaded', () => this.init());
      }
    });
  }

  /**
   * Extract the base domain (e.g., amazon.com from www.amazon.com)
   */
  private extractDomain(hostname: string): string {
    // Handle localhost and IP addresses
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return hostname;
    }

    // Extract last two parts for most domains (e.g., amazon.com)
    // Handle special cases like co.uk, com.br, etc.
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;

    // Check for known second-level TLDs
    const secondLevelTLDs = ['co.uk', 'com.br', 'com.au', 'co.jp', 'co.in', 'com.mx'];
    const lastTwo = parts.slice(-2).join('.');
    if (secondLevelTLDs.includes(lastTwo) && parts.length > 2) {
      return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
  }

  /**
   * Load suppressed domains from preferences (via background)
   */
  private async loadSuppressedDomains(): Promise<void> {
    try {
      const prefs = await browser.runtime.sendMessage({ type: 'GET_PREFERENCES' });
      const domains = prefs?.suppressedNotificationDomains || [];
      this.suppressedDomains = new Set(domains);
    } catch (e) {
      console.log('[GRAPES] Could not load suppressed domains:', e);
    }
  }

  /**
   * Save suppressed domains via background script (unified preferences)
   */
  private async saveSuppressedDomains(domain: string, add: boolean): Promise<void> {
    try {
      if (add) {
        await browser.runtime.sendMessage({ type: 'ADD_SUPPRESSED_DOMAIN', domain });
      } else {
        await browser.runtime.sendMessage({ type: 'REMOVE_SUPPRESSED_DOMAIN', domain });
      }
    } catch (e) {
      console.log('[GRAPES] Could not save suppressed domain:', e);
    }
  }

  /**
   * Check if notifications are suppressed for the current domain
   */
  private isDomainSuppressed(): boolean {
    return this.suppressedDomains.has(this.currentDomain);
  }

  /**
   * Suppress notifications for the current domain
   */
  async suppressCurrentDomain(): Promise<void> {
    this.suppressedDomains.add(this.currentDomain);
    await this.saveSuppressedDomains(this.currentDomain, true);

    // Dismiss all current notifications
    for (const id of this.notifications.keys()) {
      this.dismiss(id);
    }

    console.log(`[GRAPES] Notifications suppressed for ${this.currentDomain}`);
  }

  /**
   * Re-enable notifications for the current domain
   */
  async enableCurrentDomain(): Promise<void> {
    this.suppressedDomains.delete(this.currentDomain);
    await this.saveSuppressedDomains(this.currentDomain, false);
    console.log(`[GRAPES] Notifications enabled for ${this.currentDomain}`);
  }

  /**
   * Get list of suppressed domains
   */
  getSuppressedDomains(): string[] {
    return Array.from(this.suppressedDomains);
  }

  private init() {
    this.createContainer();
    this.injectStyles();
    this.isReady = true;

    // Process any pending notifications (if domain is not suppressed)
    if (!this.isDomainSuppressed()) {
      for (const n of this.pendingNotifications) {
        this.show(n);
      }
    }
    this.pendingNotifications = [];
  }

  private createContainer() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'grapes-notification-container';
    this.container.setAttribute('data-grapes-injected', 'true');
    this.container.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column-reverse !important;
      gap: 10px !important;
      pointer-events: none !important;
      max-height: calc(100vh - 40px) !important;
      overflow: hidden !important;
    `;
    document.body.appendChild(this.container);
  }

  private injectStyles() {
    if (this.stylesInjected) return;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'grapes-notification-styles';
    styleSheet.setAttribute('data-grapes-injected', 'true');
    styleSheet.textContent = `
      @keyframes grapes-notif-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes grapes-notif-slide-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      .grapes-notification {
        pointer-events: auto !important;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
        border-radius: 12px !important;
        padding: 14px 16px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        max-width: 280px !important;
        animation: grapes-notif-slide-in 0.3s ease-out !important;
        color: #ffffff !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      .grapes-notification:hover {
        transform: translateX(-5px) scale(1.02) !important;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.5) !important;
      }
      .grapes-notification.dismissing {
        animation: grapes-notif-slide-out 0.3s ease-in forwards !important;
      }
      .grapes-notif-header {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      .grapes-notif-icon {
        width: 36px !important;
        height: 36px !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        font-size: 18px !important;
        background: rgba(155, 89, 182, 0.2) !important;
      }
      .grapes-notif-content {
        flex: 1 !important;
        min-width: 0 !important;
      }
      .grapes-notif-title {
        font-weight: 600 !important;
        font-size: 13px !important;
        margin-bottom: 2px !important;
        color: #fff !important;
      }
      .grapes-notif-message {
        font-size: 11px !important;
        color: #a0a0a0 !important;
        line-height: 1.3 !important;
      }
      .grapes-notif-cta {
        font-size: 10px !important;
        color: #9b59b6 !important;
        margin-top: 4px !important;
        font-weight: 500 !important;
      }
      .grapes-notif-close {
        background: transparent !important;
        border: none !important;
        color: #666 !important;
        cursor: pointer !important;
        font-size: 18px !important;
        padding: 4px !important;
        line-height: 1 !important;
        opacity: 0.6 !important;
        transition: opacity 0.2s !important;
      }
      .grapes-notif-close:hover {
        opacity: 1 !important;
        color: #fff !important;
      }
      .grapes-notif-suppress {
        display: block !important;
        width: 100% !important;
        background: transparent !important;
        border: none !important;
        color: #555 !important;
        font-size: 9px !important;
        padding: 6px 0 0 0 !important;
        margin-top: 8px !important;
        cursor: pointer !important;
        text-align: center !important;
        border-top: 1px solid rgba(255,255,255,0.1) !important;
      }
      .grapes-notif-suppress:hover {
        color: #888 !important;
      }
    `;
    document.head.appendChild(styleSheet);
    this.stylesInjected = true;
  }

  // Track threat count for summary notification
  private threatCount = 0;
  private lastNotificationTime = 0;
  private autoCloseTimer: number | null = null;

  /**
   * Increment threat count and show/update notification
   */
  private incrementThreatCount(blocked: boolean) {
    this.threatCount++;
    this.showSummaryNotification(blocked);
  }

  /**
   * Show a simple summary notification
   */
  private showSummaryNotification(blocked: boolean) {
    // Throttle: don't update more than once per second
    const now = Date.now();
    if (now - this.lastNotificationTime < 1000 && this.notifications.has('grapes-summary')) {
      return;
    }
    this.lastNotificationTime = now;

    // Check if domain is suppressed
    if (this.isDomainSuppressed()) {
      console.log('[GRAPES] Domain is suppressed, not showing notification');
      return;
    }

    // If not ready, queue for later
    if (!this.isReady || !this.container) {
      console.log(
        '[GRAPES] NotificationManager not ready, will show after init. Current threatCount:',
        this.threatCount,
      );
      // Store state for showing after init
      const currentCount = this.threatCount; // Capture current count
      const showAfterInit = () => {
        if (this.isReady && this.container) {
          console.log('[GRAPES] Retry: threatCount was', currentCount, 'now is', this.threatCount);
          this.showSummaryNotification(blocked);
        }
      };
      setTimeout(showAfterInit, 500);
      return;
    }

    console.log('[GRAPES] Showing summary notification, threat count:', this.threatCount);

    // Remove existing notification if present
    if (this.notifications.has('grapes-summary')) {
      const existing = this.notifications.get('grapes-summary');
      existing?.remove();
      this.notifications.delete('grapes-summary');
    }

    const notification = document.createElement('div');
    notification.className = 'grapes-notification';
    notification.setAttribute('data-grapes-injected', 'true');

    const statusText = blocked ? 'Blocked' : 'Detected';
    const statusColor = blocked ? '#27ae60' : '#f39c12';
    const icon = blocked ? '🛡️' : '⚠️';

    notification.innerHTML = `
      <div class="grapes-notif-header">
        <div class="grapes-notif-icon">${icon}</div>
        <div class="grapes-notif-content">
          <div class="grapes-notif-title" style="color: ${statusColor};">${this.threatCount} Tracking Method${this.threatCount > 1 ? 's' : ''} ${statusText}</div>
          <div class="grapes-notif-message">GRAPES is ${blocked ? 'protecting' : 'monitoring'} this page</div>
          <div class="grapes-notif-cta">Click extension icon for details</div>
        </div>
        <button class="grapes-notif-close">&times;</button>
      </div>
      <button class="grapes-notif-suppress">🔕 Mute notifications for this site</button>
    `;

    // Click anywhere on notification to dismiss it
    // User can click extension icon to see details
    notification.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.classList.contains('grapes-notif-close') ||
        target.classList.contains('grapes-notif-suppress')
      )
        return;
      this.dismiss('grapes-summary');
    });

    // Close button
    notification.querySelector('.grapes-notif-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss('grapes-summary');
    });

    // Suppress button
    notification.querySelector('.grapes-notif-suppress')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.suppressCurrentDomain();
    });

    this.container.appendChild(notification);
    this.notifications.set('grapes-summary', notification);

    // Auto-close after 8 seconds
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    this.autoCloseTimer = window.setTimeout(() => {
      this.dismiss('grapes-summary');
    }, 8000);
  }

  dismiss(id: string) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.classList.add('dismissing');
    setTimeout(() => {
      notification.remove();
      this.notifications.delete(id);
    }, 300);
  }

  // Simple convenience methods that just increment count and show notification
  showDomMonitoring(_detail: { targetType: string }, blocked: boolean = true) {
    this.incrementThreatCount(blocked);
  }

  showSessionReplay(_detail: { tools: string[] }, blocked: boolean = true) {
    this.incrementThreatCount(blocked);
  }

  showFingerprinting(_detail: { types: string[] }, blocked: boolean = true) {
    this.incrementThreatCount(blocked);
  }

  showVisibilityTracking(blocked: boolean = true) {
    this.incrementThreatCount(blocked);
  }

  showTrackingPixel(_detail: { count: number; types: string[] }, blocked: boolean = true) {
    this.incrementThreatCount(blocked);
  }

  // Get the current threat count
  getThreatCount(): number {
    return this.threatCount;
  }

  showDetectionPrompt(threatCount: number) {
    console.log('[GRAPES] showDetectionPrompt called with count:', threatCount);
    // Set the threat count from detection mode
    this.threatCount = threatCount;
    console.log('[GRAPES] Set this.threatCount to:', this.threatCount);
    // Show the summary notification in detection mode
    this.showSummaryNotification(false);
  }
}

// Current protection mode for this page
let currentProtectionMode: 'full' | 'detection-only' | 'disabled' = 'detection-only';
let detectionThreatCount = 0;
const detectedTypes: Set<string> = new Set(); // Track detected types to prevent duplicate counting
let notificationDebounceTimer: number | null = null;

// Global notification manager instance
let notificationManager: NotificationManager | null = null;

function getNotificationManager(): NotificationManager {
  if (!notificationManager) {
    notificationManager = new NotificationManager();
  }
  return notificationManager;
}

// ============================================================================
// CONTENT SCRIPT
// ============================================================================

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    console.log('[GRAPES] Content script loaded');

    // Get current protection mode for this site
    const currentDomain = extractDomainFromHostname(window.location.hostname);

    // Helper to notify the MAIN world stealth script about protection mode
    const notifyProtectionMode = (enabled: boolean) => {
      window.dispatchEvent(
        new CustomEvent('grapes-set-protection-mode', {
          detail: JSON.stringify({ enabled }),
        }),
      );
    };

    browser.runtime
      .sendMessage({
        type: 'GET_PROTECTION_STATUS',
        domain: currentDomain,
      })
      .then((status) => {
        if (status) {
          currentProtectionMode = status.mode;
          console.log(`[GRAPES] Protection mode for ${currentDomain}: ${currentProtectionMode}`);

          // Notify the MAIN world stealth script whether protection should be enabled
          const protectionEnabled = status.mode === 'full';
          notifyProtectionMode(protectionEnabled);
        }
      })
      .catch((err) => {
        console.log('[GRAPES] Could not get protection status:', err);
        // Default to protection enabled on error
        notifyProtectionMode(true);
      });

    // Listen for messages from popup/background
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'RUN_STEALTH_TEST') {
        console.log('[GRAPES] Injecting stealth test panel');
        if (document.body) {
          injectStealthTest();
        } else {
          document.addEventListener('DOMContentLoaded', () => injectStealthTest());
        }
      }
      if (message.type === 'ACTIVATE_INSPECTOR') {
        activateSelectorInspector();
      }
      return;
    });

    // Handler for showing notifications based on mode
    const handleDetection = (type: string, showDetailedFn: () => void) => {
      if (currentProtectionMode === 'full') {
        // Full protection: show detailed notification
        showDetailedFn();
      } else if (currentProtectionMode === 'detection-only') {
        // Detection-only: increment counter only if this type hasn't been seen
        if (!detectedTypes.has(type)) {
          detectedTypes.add(type);
          detectionThreatCount++;
          console.log(
            `[GRAPES] Detection-only mode: new threat type '${type}', total count: ${detectionThreatCount}`,
          );
        }
        // Debounce showing the prompt to batch multiple detections
        if (notificationDebounceTimer) {
          clearTimeout(notificationDebounceTimer);
        }
        notificationDebounceTimer = window.setTimeout(() => {
          getNotificationManager().showDetectionPrompt(detectionThreatCount);
        }, 500);
      }
      // If disabled, don't show any notifications
    };

    // Listen for suspicious observation events from the stealth script (MAIN world)
    window.addEventListener('grapes-suspicious-observation', (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const detail = JSON.parse(customEvent.detail);
        console.log('[GRAPES] Suspicious MutationObserver detected:', detail);

        // Notify background script to update badge
        browser.runtime
          .sendMessage({
            type: 'SUSPICIOUS_OBSERVATION_DETECTED',
            data: detail,
          })
          .catch((err) => {
            console.log('[GRAPES] Could not send message to background:', err);
          });

        // Show notification based on mode
        handleDetection('dom', () => getNotificationManager().showDomMonitoring(detail));
      } catch (e) {
        console.error('[GRAPES] Error parsing suspicious observation event:', e);
      }
    });

    // Listen for session replay tool detection
    window.addEventListener('grapes-session-replay-detected', (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const detail = JSON.parse(customEvent.detail);
        console.log('[GRAPES] Session replay tools detected:', detail);

        // Notify background script to update badge with different icon
        browser.runtime
          .sendMessage({
            type: 'SESSION_REPLAY_DETECTED',
            data: detail,
          })
          .catch((err) => {
            console.log('[GRAPES] Could not send message to background:', err);
          });

        // Show notification based on mode
        handleDetection('replay', () => getNotificationManager().showSessionReplay(detail));
      } catch (e) {
        console.error('[GRAPES] Error parsing session replay event:', e);
      }
    });

    // Listen for fingerprinting detection
    window.addEventListener('grapes-fingerprinting-detected', (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const detail = JSON.parse(customEvent.detail);
        console.log('[GRAPES] Fingerprinting detected:', detail);

        // Notify background script to update badge
        browser.runtime
          .sendMessage({
            type: 'FINGERPRINTING_DETECTED',
            data: detail,
          })
          .catch((err) => {
            console.log('[GRAPES] Could not send message to background:', err);
          });

        // Show notification based on mode
        handleDetection('fingerprint', () => getNotificationManager().showFingerprinting(detail));
      } catch (e) {
        console.error('[GRAPES] Error parsing fingerprinting event:', e);
      }
    });

    // Listen for visibility tracking detection
    window.addEventListener('grapes-visibility-tracking-detected', (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const detail = JSON.parse(customEvent.detail);
        console.log('[GRAPES] Visibility tracking detected:', detail);

        // Notify background script to update badge
        browser.runtime
          .sendMessage({
            type: 'VISIBILITY_TRACKING_DETECTED',
            data: detail,
          })
          .catch((err) => {
            console.log('[GRAPES] Could not send message to background:', err);
          });

        // Show notification based on mode
        handleDetection('visibility', () => getNotificationManager().showVisibilityTracking());
      } catch (e) {
        console.error('[GRAPES] Error parsing visibility tracking event:', e);
      }
    });

    // Listen for tracking pixel detection
    window.addEventListener('grapes-tracking-pixel-detected', (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const detail = JSON.parse(customEvent.detail);
        console.log('[GRAPES] Tracking pixels detected:', detail);

        // Notify background script to update badge
        browser.runtime
          .sendMessage({
            type: 'TRACKING_PIXEL_DETECTED',
            data: detail,
          })
          .catch((err) => {
            console.log('[GRAPES] Could not send message to background:', err);
          });

        // Show notification based on mode
        handleDetection('tracking', () => getNotificationManager().showTrackingPixel(detail));
      } catch (e) {
        console.error('[GRAPES] Error parsing tracking pixel event:', e);
      }
    });

    const darkThemeStyles = BUILT_IN_THEMES.find((theme) => theme.id === 'dark')?.styles || {};
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyPreferredStyles = (preferences: GrapesPreferences) => {
      const currentDomainStyles = preferences.siteStyles?.[currentDomain];
      if (preferences.customStylesEnabled) {
        if (hasCustomStyleValues(currentDomainStyles || {})) {
          applyCustomStyles(currentDomainStyles || {});
          return;
        }
        if (hasCustomStyleValues(preferences.customStyles || {})) {
          applyCustomStyles(preferences.customStyles || {});
          return;
        }
      }

      if (preferences.autoDarkMode && darkModeMediaQuery.matches) {
        applyCustomStyles(darkThemeStyles);
        return;
      }

      removeCustomStyles();
    };

    // Wait for DOM to be ready before applying styles
    const applyWhenReady = () => {
      // Load user preferences
      browser.storage.sync.get(['preferences']).then((result) => {
        const preferences = (result.preferences || {}) as GrapesPreferences;
        applyPreferredStyles(preferences);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyWhenReady);
    } else {
      applyWhenReady();
    }

    // Listen for preference changes
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.preferences) {
        const newPreferences = (changes.preferences.newValue || {}) as GrapesPreferences;
        applyPreferredStyles(newPreferences);
      }
    });

    darkModeMediaQuery.addEventListener('change', () => {
      browser.storage.sync.get(['preferences']).then((result) => {
        const preferences = (result.preferences || {}) as GrapesPreferences;
        applyPreferredStyles(preferences);
      });
    });
  },
});

/**
 * Extract base domain from hostname (utility function for content script)
 */
function extractDomainFromHostname(hostname: string): string {
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

/**
 * Apply custom styles to the current page
 * All GRAPES elements use 'grapes-' prefix for stealth detection
 */
function applyCustomStyles(customStyles: CustomStyles) {
  // Remove existing custom styles
  removeCustomStyles();

  // Create a style element for custom styles
  // ID starts with 'grapes-' so stealth-injector can identify it
  const styleElement = document.createElement('style');
  styleElement.id = 'grapes-custom-styles';
  styleElement.setAttribute('data-grapes-injected', 'true');

  // Build CSS from preferences
  let cssRules = '';

  // Example: Apply custom styles based on preferences
  // This can be extended based on specific website targeting and user preferences
  if (customStyles.backgroundColor) {
    cssRules += `body { background-color: ${customStyles.backgroundColor} !important; }\n`;
  }

  if (customStyles.textColor) {
    cssRules += `body { color: ${customStyles.textColor} !important; }\n`;
  }

  if (customStyles.fontSize) {
    cssRules += `body { font-size: ${customStyles.fontSize}px !important; }\n`;
  }

  if (customStyles.fontFamily) {
    cssRules += `body { font-family: ${customStyles.fontFamily} !important; }\n`;
  }

  // Add custom CSS rules if provided
  if (customStyles.customCSS) {
    cssRules += customStyles.customCSS;
  }

  styleElement.textContent = cssRules;
  document.head.appendChild(styleElement);

  console.log('[GRAPES] Custom styles applied');
}

function hasCustomStyleValues(customStyles: CustomStyles): boolean {
  return Object.values(customStyles).some((value) => !!value);
}

/**
 * Remove custom styles from the current page
 */
function removeCustomStyles() {
  const existingStyle = document.getElementById('grapes-custom-styles');
  if (existingStyle) {
    existingStyle.remove();
    console.log('[GRAPES] Custom styles removed');
  }
}
