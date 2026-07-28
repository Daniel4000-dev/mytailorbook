import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

// E2E tests always run against the STAGING Supabase project, never prod —
// load it explicitly here so it can be forced into the spawned server's env
// below, overriding whatever .env.local (prod) would otherwise supply. In
// CI, these vars already come from GitHub Actions secrets, so this is a
// no-op there (the file doesn't exist in CI, nothing to load).
if (!process.env.CI && existsSync('.env.staging.local')) {
  config({ path: '.env.staging.local' });
}

const E2E_PORT = 3101;

export default defineConfig({
  testDir: './tests/e2e',
  // Serial, not parallel: all three specs share one webServer instance on
  // this dev machine, and concurrent first-loads against it were flaky
  // (a page's browser session got dropped mid-test under the load).
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  // First render after a fresh build does a real network round-trip to
  // Supabase (auth + data fetch) rather than hitting a warmed-up cache —
  // give assertions more room than Playwright's 5s default.
  expect: { timeout: 10000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
  },
  // Playwright always spins up its own dedicated server on a separate port
  // rather than reusing whatever dev server might already be running on
  // :3000 — that server is deliberately pointed at prod for manual
  // verification, and must never be confused with the staging-pointed
  // instance automated tests run against.
  webServer: {
    // A production build+start, not `next dev` — this dev machine's
    // Turbopack dev-mode first-compile-per-route is slow enough to blow
    // past per-test timeouts on a cold server. A prebuilt server also
    // matches what CI (and real production) actually serves.
    command: `npm run build && npm run start -- -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    timeout: 180000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
  },
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
