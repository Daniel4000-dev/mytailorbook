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

const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'mystitchbooks.com';

export const APP_CONFIG = {
  name: 'MyStitchBook',
  tagline: 'Precision. Elegance. Flow.',
  domain,
  baseUrl: `https://${domain}`,
  supportEmail: `support@${domain}`,
  currency: 'NGN',
  locale: 'en-NG',
  phonePrefix: '234',
} as const;
