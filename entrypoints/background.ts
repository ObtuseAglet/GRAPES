export default defineBackground(() => {
  console.log('[GRAPES] Background script initialized');
  
  // Listen for extension install/update
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('[GRAPES] Extension installed');
      
      // Set default preferences
      browser.storage.sync.set({
        preferences: {
          enabled: true,
          customStyles: {},
        },
      });
    }
  });
  
  // Listen for messages from content scripts
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'SUSPICIOUS_OBSERVATION_DETECTED') {
      console.log('[GRAPES] Suspicious observation reported:', message.data);
      
      // Update badge for the specific tab
      if (sender.tab?.id) {
        updateBadgeForTab(sender.tab.id, message.data);
      }
    }
    return true;
  });
  
  // Clear badge when tab is updated (navigates to new page)
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      // Clear the badge when page starts loading
      clearBadgeForTab(tabId);
    }
  });
});

/**
 * Update the extension badge to show warning for a specific tab
 */
function updateBadgeForTab(tabId: number, data: { url: string }) {
  // Set badge text to "!"
  browser.action.setBadgeText({
    text: '!',
    tabId: tabId,
  });
  
  // Set badge background color to warning red
  browser.action.setBadgeBackgroundColor({
    color: '#e94560',
    tabId: tabId,
  });
  
  // Set badge text color to white
  browser.action.setBadgeTextColor({
    color: '#ffffff',
    tabId: tabId,
  });
  
  // Update title to explain the warning
  browser.action.setTitle({
    title: `GRAPES: DOM monitoring detected on ${data.url}`,
    tabId: tabId,
  });
  
  console.log(`[GRAPES] Badge updated for tab ${tabId}`);
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
