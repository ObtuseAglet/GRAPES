export default defineBackground(() => {
  console.log('GRAPES background script initialized');
  
  // Listen for extension install/update
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('Extension installed');
      
      // Set default preferences
      browser.storage.sync.set({
        preferences: {
          enabled: true,
          customStyles: {},
        },
      });
    }
  });
});
