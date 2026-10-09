import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    channel: 'chrome',
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  },
  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
