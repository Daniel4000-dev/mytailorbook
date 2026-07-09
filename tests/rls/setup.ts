import { config } from 'dotenv';
import path from 'path';

// RLS tests run against the real staging Supabase project — load the same
// credentials used for every manual live-verification pass this project has
// relied on so far (.env.staging.local), so this harness is a drop-in
// automation of that existing discipline, not a new environment to manage.
config({ path: path.resolve(__dirname, '../../.env.staging.local') });

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `RLS isolation tests require staging Supabase credentials, missing: ${missing.join(', ')}. ` +
      `Set these in .env.staging.local (see other test files for what's exercised) — these tests ` +
      `talk to a real Postgres instance and cannot be mocked, since their whole purpose is to prove ` +
      `Row Level Security actually blocks cross-tenant access.`
  );
}
