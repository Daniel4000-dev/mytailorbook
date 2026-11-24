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

const rawDomain = (process.env.NEXT_PUBLIC_SITE_DOMAIN || 'mystitchbook.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '')
  .trim();

// Clean production apex domain — never carries dev., app., or staging. prefixes.
// Used for production public links, support email, and proxy.ts root domain matching.
const apexDomain =
  rawDomain.replace(/^(dev\.app\.|app\.|dev\.|staging\.)/, '') || 'mystitchbook.com';

// Environment detection:
// - Production Supabase project ref: dbbzgdklhxshgqhwrxoq
// - Staging Supabase project ref:    atmtzcimmdzfzkixiiyl
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const isProdDb = supabaseUrl.includes('dbbzgdklhxshgqhwrxoq');
const isStagingDb = supabaseUrl.includes('atmtzcimmdzfzkixiiyl');

const isStagingEnv =
  !isProdDb &&
  (isStagingDb ||
    process.env.DATABASE_ENV === 'staging' ||
    process.env.DATABASE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'preview' ||
    rawDomain.startsWith('dev.') ||
    rawDomain.startsWith('staging.'));

// In Production, ALWAYS lock to the clean apex domain (mystitchbook.com).
// In Staging/Dev, preserve or construct the dev.* staging domain (e.g. dev.app.mystitchbook.com).
const domain = isStagingEnv
  ? rawDomain.startsWith('dev.') || rawDomain.startsWith('staging.')
    ? rawDomain
    : `dev.app.${apexDomain}`
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
