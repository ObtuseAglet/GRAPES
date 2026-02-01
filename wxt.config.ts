import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'GRAPES - Website Appearance Customizer',
    description: 'Customize the appearance of websites based on your preferences',
    permissions: ['storage', 'activeTab'],
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
