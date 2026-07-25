import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  // In CI there's no dev server already running — start the production
  // build and wait for it. Locally, reuse whatever's already on :3000.
  webServer: process.env.CI
    ? {
        command: 'npm run start',
        url: 'http://localhost:3000',
        timeout: 60000,
        reuseExistingServer: false,
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      // This dev machine (macOS 12) is older than Playwright's bundled
      // Chromium build supports installing on — use the system's real,
      // already-installed Chrome via the "chrome" channel instead of a
      // downloaded binary. CI runners (Ubuntu, current OS) use Playwright's
      // own bundled Chromium instead, since there's no system Chrome there.
      use: { ...devices['Desktop Chrome'], ...(process.env.CI ? {} : { channel: 'chrome' }) },
    },
  ],
});
