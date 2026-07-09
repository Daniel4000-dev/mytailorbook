import { defineConfig, devices } from '@playwright/test';

// Standard Playwright browser launch has had sandboxing issues in this dev
// environment historically (see project memory) — --no-sandbox mirrors the
// flags used throughout this project's manual CDP-driven browser testing.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
