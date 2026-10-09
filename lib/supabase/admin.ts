import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { PRODUCTION_SUPABASE_PROJECT_REF, STAGING_SUPABASE_PROJECT_REF } from '@/lib/billing/environment';

function getProjectRef(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const match = parsed.hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

function validateAdminEnvironment() {
  const dbEnv = process.env.DATABASE_ENV;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is missing');
  
  const actualRef = getProjectRef(supabaseUrl);
  if (!actualRef) throw new Error('Malformed NEXT_PUBLIC_SUPABASE_URL');

  if (dbEnv === 'production') {
    if (actualRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: DATABASE_ENV is production but Supabase URL does not match production project ref');
    }
  } else if (dbEnv === 'staging') {
    if (actualRef !== STAGING_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: DATABASE_ENV is staging but Supabase URL does not match staging project ref');
    }
    if (actualRef === PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: Staging environment MUST NOT connect to production Supabase');
    }
  } else if (dbEnv === 'development') {
    if (actualRef === PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: Development environment MUST NOT connect to production Supabase');
    }
  } else {
    throw new Error('DATABASE_ENV must be production, staging, or development');
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) {
    throw new Error('CRITICAL: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing');
  }
  
  // Guard against accidentally passing a publishable key to the admin client
  if (secretKey.startsWith('sb_publishable_') || secretKey.startsWith('pk_')) {
    throw new Error('CRITICAL: Admin client requires a secret key, but a publishable/public key was provided.');
  }
}

/**
 * Admin client — SERVER-SIDE ONLY. Uses the service_role/secret key, which bypasses
 * every Row Level Security policy. Only ever call this from server actions,
 * and only for operations a normal user isn't allowed to do themselves.
 */
export function createAdminClient() {
  validateAdminEnvironment();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(
    supabaseUrl!,
    secretKey!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
