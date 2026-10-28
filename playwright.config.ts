import { defineConfig } from '@playwright/test';
const url = process.env.ALLIANCE_TEST_URL ?? 'http://127.0.0.1:5173';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: url,
    timezoneId: 'Europe/Lisbon',
    locale: 'pt-PT',
    trace: 'retain-on-failure',
    channel: 'msedge',
  },
  webServer: {
    command: process.env.ALLIANCE_TEST_URL
      ? 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173'
      : 'node node_modules/vite/bin/vite.js --host 127.0.0.1',
    url,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
});
