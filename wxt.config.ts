import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  publicDir: 'public',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    web_accessible_resources: [
      {
        resources: ['icon/*.png'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
