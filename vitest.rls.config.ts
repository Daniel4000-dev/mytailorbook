import { defineConfig } from 'vitest/config';
import path from 'path';

// Separate from vitest.config.ts on purpose: these tests hit a REAL Supabase
// project (staging) over the network to actually exercise RLS policies —
// they can't be mocked, so they're kept out of the fast unit-test run and
// only execute when staging credentials are present (see tests/rls/setup.ts).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    setupFiles: ['tests/rls/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
