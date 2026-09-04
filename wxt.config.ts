import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'GRAPES - Web Surveillance Monitor',
    description:
      'Inspect web surveillance, understand privacy risk, and optionally contribute privacy-minimized data.',
    permissions: ['storage', 'activeTab', 'alarms'],
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
  },
});
