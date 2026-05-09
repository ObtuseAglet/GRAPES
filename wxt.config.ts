import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => {
    // Header scrambling (ADR-002) uses different APIs per browser:
    // Chrome/Edge get declarativeNetRequest; Firefox gets blocking webRequest
    // (still supported under Firefox MV3). The background script picks the
    // path at runtime via feature detection.
    const headerScramblePerms =
      browser === 'firefox' ? ['webRequest', 'webRequestBlocking'] : ['declarativeNetRequest'];

    return {
      name: 'GRAPES - Website Appearance Customizer',
      description: 'Customize the appearance of websites based on your preferences',
      permissions: ['storage', 'activeTab', 'alarms', ...headerScramblePerms],
      host_permissions: browser === 'firefox' ? ['<all_urls>'] : undefined,
      action: {
        default_icon: 'icon.svg',
        default_popup: 'popup.html',
      },
      web_accessible_resources: [
        {
          resources: ['stealth-test-runner.js'],
          matches: ['<all_urls>'],
        },
      ],
    };
  },
});
