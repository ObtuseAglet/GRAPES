export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    console.log('[GRAPES] Content script loaded');
    
    // Listen for suspicious observation events from the stealth script (MAIN world)
    window.addEventListener('grapes-suspicious-observation', (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const detail = JSON.parse(customEvent.detail);
        console.log('[GRAPES] Suspicious MutationObserver detected:', detail);
        
        // Notify background script to update badge
        browser.runtime.sendMessage({
          type: 'SUSPICIOUS_OBSERVATION_DETECTED',
          data: detail,
        }).catch((err) => {
          console.log('[GRAPES] Could not send message to background:', err);
        });
        
        // Show toast notification to user
        showSecurityToast(detail);
      } catch (e) {
        console.error('[GRAPES] Error parsing suspicious observation event:', e);
      }
    });
    
    // Wait for DOM to be ready before applying styles
    const applyWhenReady = () => {
      // Load user preferences
      browser.storage.sync.get(['preferences']).then((result) => {
        const preferences = result.preferences || { enabled: true, customStyles: {} };
        
        if (preferences.enabled) {
          applyCustomStyles(preferences.customStyles);
        }
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
        const newPreferences = changes.preferences.newValue;
        if (newPreferences.enabled) {
          applyCustomStyles(newPreferences.customStyles);
        } else {
          removeCustomStyles();
        }
      }
    });
  },
});

/**
 * Show a toast notification when suspicious observation is detected
 */
function showSecurityToast(detail: { targetType: string; url: string }) {
  // Wait for body to exist
  const show = () => {
    // Check if toast already exists
    if (document.getElementById('grapes-security-toast')) return;
    
    // Create toast container
    const toast = document.createElement('div');
    toast.id = 'grapes-security-toast';
    toast.setAttribute('data-grapes-injected', 'true');
    
    // Toast styles (inline to ensure they work)
    toast.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
      border: 1px solid #e94560 !important;
      border-radius: 12px !important;
      padding: 16px 20px !important;
      box-shadow: 0 4px 20px rgba(233, 69, 96, 0.3) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      max-width: 320px !important;
      animation: grapes-toast-slide-in 0.3s ease-out !important;
      color: #ffffff !important;
    `;
    
    // Add animation keyframes
    const styleSheet = document.createElement('style');
    styleSheet.id = 'grapes-toast-styles';
    styleSheet.setAttribute('data-grapes-injected', 'true');
    styleSheet.textContent = `
      @keyframes grapes-toast-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes grapes-toast-slide-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
    
    // Toast content
    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="
          background: #e94560;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 18px;
          font-weight: bold;
        ">!</div>
        <div style="flex: 1;">
          <div style="
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: #e94560;
          ">DOM Monitoring Detected</div>
          <div style="
            font-size: 12px;
            color: #a0a0a0;
            line-height: 1.4;
          ">
            This site is watching for HTML changes on <strong style="color: #fff;">${detail.targetType}</strong>.
            GRAPES is hiding your modifications.
          </div>
        </div>
        <button id="grapes-toast-close" style="
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          line-height: 1;
          margin-left: 8px;
        ">&times;</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Close button handler
    const closeBtn = document.getElementById('grapes-toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        dismissToast(toast);
      });
    }
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      dismissToast(toast);
    }, 8000);
  };
  
  if (document.body) {
    show();
  } else {
    document.addEventListener('DOMContentLoaded', show);
  }
}

/**
 * Dismiss the toast with animation
 */
function dismissToast(toast: HTMLElement) {
  if (!toast || !toast.parentNode) return;
  
  toast.style.animation = 'grapes-toast-slide-out 0.3s ease-in forwards';
  setTimeout(() => {
    toast.remove();
    // Also remove the styles
    const styles = document.getElementById('grapes-toast-styles');
    if (styles) styles.remove();
  }, 300);
}

/**
 * Apply custom styles to the current page
 * All GRAPES elements use 'grapes-' prefix for stealth detection
 */
function applyCustomStyles(customStyles: Record<string, any>) {
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
