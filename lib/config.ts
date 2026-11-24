/* ============================================================
   MyStitchBook App Configuration
   ============================================================
   Central config — change values here to rebrand the app.
   `domain` reads from NEXT_PUBLIC_SITE_DOMAIN so switching domains later
   (e.g. once a shorter/better one is bought) is a single env var change
   in Vercel, not a code edit — baseUrl and supportEmail both derive from
   it automatically. The brand name shown in the UI is separate from the
   domain on purpose and does not need to match it.
   ============================================================ */

const rawDomain = (
  process.env.NEXT_PUBLIC_SITE_DOMAIN ||
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
  'mystitchbook.com'
)
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .trim();

// Clean production apex domain — strips dev.app., app., dev., or staging. prefixes.
// Automatically works with whatever domain is configured on Vercel (e.g. mystitchbooks.com or mystitchbook.com).
const apexDomain =
  rawDomain.replace(/^(dev\.app\.|app\.|dev\.|staging\.)/, '') || 'mystitchbook.com';

// Environment detection:
// - Production Supabase project ref: dbbzgdklhxshgqhwrxoq
// - Staging Supabase project ref:    atmtzcimmdzfzkixiiyl
// - Vercel automatically sets VERCEL_ENV / NEXT_PUBLIC_VERCEL_ENV ('production' | 'preview' | 'development')
//   and VERCEL_GIT_COMMIT_REF / NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ('staging' | 'main').
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isProdDb = supabaseUrl.includes('dbbzgdklhxshgqhwrxoq');
const isStagingDb = supabaseUrl.includes('atmtzcimmdzfzkixiiyl');
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
const gitBranch = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF || process.env.VERCEL_GIT_COMMIT_REF;

const isStagingEnv =
  !isProdDb &&
  (isStagingDb ||
    process.env.DATABASE_ENV === 'staging' ||
    process.env.DATABASE_ENV === 'development' ||
    vercelEnv === 'preview' ||
    gitBranch === 'staging' ||
    rawDomain.startsWith('dev.') ||
    rawDomain.startsWith('staging.'));

// In Production, ALWAYS lock to the clean apex domain (e.g. mystitchbooks.com / mystitchbook.com).
// In Staging/Dev, preserve or construct the dev.app.* staging domain (e.g. dev.app.mystitchbooks.com).
const domain = isStagingEnv
  ? rawDomain.startsWith('dev.') || rawDomain.startsWith('staging.')
    ? rawDomain
    : (process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL || `dev.app.${apexDomain}`)
  : apexDomain;

export const APP_CONFIG = {
  name: 'MyStitchBook',
  tagline: 'Manage orders, measurements, and clients.',
  domain,
  apexDomain,
  isStagingEnv,
  baseUrl: `https://${domain}`,
  supportEmail: `support@${apexDomain}`,
  supportPhone: '+2348163752061',
  supportWhatsApp: '2348163752061',
  currency: 'NGN',
  locale: 'en-NG',
  phonePrefix: '234',
  social: {
    instagram: 'https://www.instagram.com/mystitchbook_',
    facebook: 'https://web.facebook.com/people/Mystitchbook/61593656157347/',
    tiktok: 'https://www.tiktok.com/@mystitchbook',
  },
} as const;
