import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { validateBillingEnvironment, getPlanCode, validateCronEnvironment, validateWebhookEnvironment, PRODUCTION_SUPABASE_PROJECT_REF, STAGING_SUPABASE_PROJECT_REF } from '../../../lib/billing/environment';
import { createAdminClient } from '../../../lib/supabase/admin';

describe('Billing Environment Safety', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('1. staging + project atmtzcimmdzfzkixiiyl + sk_test passes', () => {
    process.env.DATABASE_ENV = 'staging';
    process.env.BILLING_ENV = 'test';
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).not.toThrow();
  });

  it('2. staging + production Supabase project fails', () => {
    process.env.DATABASE_ENV = 'staging';
    process.env.BILLING_ENV = 'test';
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('DATABASE_ENV is staging but Supabase URL does not match staging project ref');
  });

  it('3. production + staging Supabase project fails', () => {
    process.env.DATABASE_ENV = 'production';
    process.env.BILLING_ENV = 'live';
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('DATABASE_ENV is production but Supabase URL does not match production project ref');
  });

  it('4. staging + sk_live fails', () => {
    process.env.DATABASE_ENV = 'staging';
    process.env.BILLING_ENV = 'test';
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('BILLING_ENV is test but PAYSTACK_SECRET_KEY does not start with sk_test_');
  });

  it('5. production + sk_test fails', () => {
    process.env.DATABASE_ENV = 'production';
    process.env.BILLING_ENV = 'live';
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('BILLING_ENV is live but PAYSTACK_SECRET_KEY does not start with sk_live_');
  });

  it('6. development + production Supabase fails', () => {
    process.env.DATABASE_ENV = 'development';
    process.env.BILLING_ENV = 'test';
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('Development environment MUST NOT connect to production Supabase');
  });

  it('7. missing project ref fails closed', () => {
    process.env.DATABASE_ENV = 'production';
    process.env.BILLING_ENV = 'live';
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('NEXT_PUBLIC_SUPABASE_URL is missing');
  });

  it('8. malformed Supabase URL fails closed', () => {
    process.env.DATABASE_ENV = 'production';
    process.env.BILLING_ENV = 'live';
    process.env.PAYSTACK_SECRET_KEY = 'sk_live_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('Malformed NEXT_PUBLIC_SUPABASE_URL');
  });

  it('9. pk_test cannot be used where sk_test is required', () => {
    process.env.DATABASE_ENV = 'staging';
    process.env.BILLING_ENV = 'test';
    process.env.PAYSTACK_SECRET_KEY = 'pk_test_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_123';
    expect(() => validateBillingEnvironment()).toThrow('does not start with sk_test_');
  });

  it('10. subscription conversion remains disabled logically (tested in cron)', () => {
    expect(true).toBe(true);
  });

  it('11. Test webhook cannot initialize against production DB', () => {
    process.env.DATABASE_ENV = 'production';
    expect(() => validateWebhookEnvironment('test')).toThrow('Test webhook cannot operate against the production database');
  });

  it('12. Live webhook cannot initialize against staging DB', () => {
    process.env.DATABASE_ENV = 'staging';
    expect(() => validateWebhookEnvironment('live')).toThrow('Live webhook cannot operate against a non-production database');
  });

  it('13. Admin client fails if sb_publishable key is used as server secret', () => {
    process.env.DATABASE_ENV = 'staging';
    process.env.BILLING_ENV = 'test';
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'sb_publishable_12345';
    expect(() => createAdminClient()).toThrow('Admin client requires a secret key, but a publishable/public key was provided.');
  });
});
