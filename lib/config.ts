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

// Strip any dev/app/staging prefixes so public customer links, WhatsApp shares,
// and canonical metadata always point to the clean apex production domain.
const domain = rawDomain.replace(/^(dev\.app\.|app\.|dev\.|staging\.)/, '') || 'mystitchbook.com';

export const APP_CONFIG = {
  name: 'MyStitchBook',
  tagline: 'Manage orders, measurements, and clients.',
  domain,
  baseUrl: `https://${domain}`,
  supportEmail: `support@${domain}`,
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
