export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('GRAPES content script loaded');
    
    // Load user preferences
    browser.storage.sync.get(['preferences']).then((result) => {
      const preferences = result.preferences || { enabled: true, customStyles: {} };
      
      if (preferences.enabled) {
        applyCustomStyles(preferences.customStyles);
      }
    });
    
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
 * Apply custom styles to the current page
 */
function applyCustomStyles(customStyles: Record<string, any>) {
  // Remove existing custom styles
  removeCustomStyles();
  
  // Create a style element for custom styles
  const styleElement = document.createElement('style');
  styleElement.id = 'grapes-custom-styles';
  
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
  
  console.log('GRAPES: Custom styles applied');
}

/**
 * Remove custom styles from the current page
 */
function removeCustomStyles() {
  const existingStyle = document.getElementById('grapes-custom-styles');
  if (existingStyle) {
    existingStyle.remove();
    console.log('GRAPES: Custom styles removed');
  }
}
