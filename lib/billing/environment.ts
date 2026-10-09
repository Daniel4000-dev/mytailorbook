import 'server-only';

export const PRODUCTION_SUPABASE_PROJECT_REF = 'dbbzgdklhxshgqhwrxoq';
export const STAGING_SUPABASE_PROJECT_REF = 'atmtzcimmdzfzkixiiyl';

function getProjectRef(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // https://<project-ref>.supabase.co
    const match = parsed.hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

export function getBillingEnv(): 'live' | 'test' {
  const env = process.env.BILLING_ENV;
  if (env !== 'live' && env !== 'test') {
    throw new Error('BILLING_ENV must be strictly "live" or "test"');
  }
  return env;
}

export function validateBillingEnvironment() {
  const billingEnv = getBillingEnv();
  const dbEnv = process.env.DATABASE_ENV;
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!paystackKey) throw new Error('PAYSTACK_SECRET_KEY is missing');
  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing');
  if (!serviceRoleKey) throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing');

  const actualRef = getProjectRef(supabaseUrl);
  if (!actualRef) throw new Error('Malformed NEXT_PUBLIC_SUPABASE_URL');

  // Guard against accidentally passing a publishable key to the admin client
  if (serviceRoleKey.startsWith('sb_publishable_') || serviceRoleKey.startsWith('pk_')) {
    throw new Error('CRITICAL: Admin client requires a secret key, but a publishable/public key was provided.');
  }

  // 1. BILLING_ENV=live requires sk_live_
  if (billingEnv === 'live' && !paystackKey.startsWith('sk_live_')) {
    throw new Error('CRITICAL: BILLING_ENV is live but PAYSTACK_SECRET_KEY does not start with sk_live_');
  }

  // 2. BILLING_ENV=test requires sk_test_
  if (billingEnv === 'test' && !paystackKey.startsWith('sk_test_')) {
    throw new Error('CRITICAL: BILLING_ENV is test but PAYSTACK_SECRET_KEY does not start with sk_test_');
  }

  // 3. DATABASE_ENV validation
  if (dbEnv === 'production') {
    if (actualRef !== PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: DATABASE_ENV is production but Supabase URL does not match production project ref');
    }
    if (billingEnv !== 'live') {
      throw new Error('CRITICAL: DATABASE_ENV is production but BILLING_ENV is not live');
    }
  } else if (dbEnv === 'staging') {
    if (actualRef !== STAGING_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: DATABASE_ENV is staging but Supabase URL does not match staging project ref');
    }
    if (actualRef === PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: Staging environment MUST NOT connect to production Supabase');
    }
    if (billingEnv === 'live') {
      throw new Error('CRITICAL: DATABASE_ENV is staging but BILLING_ENV is live');
    }
  } else if (dbEnv === 'development') {
    if (actualRef === PRODUCTION_SUPABASE_PROJECT_REF) {
      throw new Error('CRITICAL: Development environment MUST NOT connect to production Supabase');
    }
    if (billingEnv === 'live') {
      throw new Error('CRITICAL: DATABASE_ENV is development but BILLING_ENV is live');
    }
  } else {
    throw new Error('DATABASE_ENV must be production, staging, or development');
  }
}

export function validateCronEnvironment() {
  validateBillingEnvironment();
  
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    throw new Error('CRITICAL: subscription-grace cron cannot run in non-production Vercel deployments');
  }

  if (process.env.DATABASE_ENV !== 'production') {
    throw new Error('CRITICAL: subscription-grace cron must only run against the production database');
  }

  if (process.env.BILLING_ENV !== 'live') {
    throw new Error('CRITICAL: subscription-grace cron must only run in live billing environment');
  }
}

export function validateWebhookEnvironment(mode: 'live' | 'test') {
  const dbEnv = process.env.DATABASE_ENV;
  
  if (mode === 'live') {
    if (dbEnv !== 'production') {
      throw new Error('CRITICAL: Live webhook cannot operate against a non-production database');
    }
  } else {
    if (dbEnv === 'production') {
      throw new Error('CRITICAL: Test webhook cannot operate against the production database');
    }
  }
}

export function getPlanCode(interval: 'monthly' | 'yearly'): string {
  const code = interval === 'yearly' 
    ? process.env.PAYSTACK_YEARLY_PLAN_CODE 
    : process.env.PAYSTACK_MONTHLY_PLAN_CODE;
    
  if (!code) {
    throw new Error(`Missing plan code configuration for interval: ${interval}`);
  }
  return code;
}
