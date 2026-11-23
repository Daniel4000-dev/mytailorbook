import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN } from '@/lib/subscription';
import JsonLd from '@/components/seo/JsonLd';
import HomePageContent from './_components/HomePageContent';
import { HOMEPAGE_FAQS } from './_components/homepageFaqs';

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Measurement, Production & POS App for Tailors & Fashion Houses`,
  description:
    'Your sewing is already great. Now your shop runs like it. Permanent offline measurements, cloth tagging, production tracking, and instant WhatsApp updates for modern tailors.',
  keywords: [
    'tailoring app',
    'measurement app for tailors',
    'fashion designer software',
    'bespoke tailoring management software',
    'ready to wear POS app for fashion houses',
    'offline tailoring measurement app',
    'WhatsApp order tracking for tailors',
    'MyStitchBook',
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    title: `${APP_CONFIG.name} — Your sewing is already great. Now your shop runs like it.`,
    description:
      'Never lose a client’s measurement, mix up fabrics on the cutting table, or chase awkward balances. Run your fashion business with calm, unmistakable control — even offline.',
    type: 'website',
    images: [{ url: '/images/marketing/hero-tailor-tablet.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_CONFIG.name} — Your sewing is already great. Now your shop runs like it.`,
    description:
      'Never lose a client’s measurement, mix up fabrics on the cutting table, or chase awkward balances. Run your fashion business with calm, unmistakable control — even offline.',
    images: ['/images/marketing/hero-tailor-tablet.jpg'],
  },
};

export default function HomePage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_CONFIG.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    url: APP_CONFIG.baseUrl,
    description:
      'All-in-one operating system for bespoke tailors and Ready-to-Wear fashion houses. Includes offline measurement records, fabric intake & digital cutting slips, production board, fitting calendar, Ready-to-Wear POS, debtors ledger, and live WhatsApp order tracking.',
    featureList: [
      'Permanent Cloud-Backed & Offline-Ready Customer Measurement Vault (30+ landmarks & custom style templates)',
      'Fabric Intake Tagging, Fabrics Table & Printable Digital Cutting Slips',
      'Bespoke Production Board & Fitting Calendar with Alteration Notes',
      'Live No-Login WhatsApp Order Progress Links for Customers',
      'Debtors Ledger, One-Tap WhatsApp Balance Reminders & Digital Receipts',
      'Ready-to-Wear (RTW) Showroom Inventory Matrix (XS–3XL) & Counter POS',
      'Auto-Generated Public Portfolio Website & Seasonal Lookbook Catalogues',
      'Role-Based Staff Accounts (Cutter, Tailor, Beader, QC, Manager, Accountant) & Multi-Branch Support',
      'The Tailors Circle Daily Streaks & 90-Day Industrial Sewing Machine Championship',
    ],
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Forever Plan',
        price: '0',
        priceCurrency: 'NGN',
        description: `Unlimited customers, permanent measurement records, Ready-to-Wear POS, public portfolio website, and up to ${FREE_MONTHLY_ORDER_LIMIT} orders per month.`,
      },
      {
        '@type': 'Offer',
        name: 'Premium Plan',
        price: String(PREMIUM_MONTHLY_PRICE_NGN),
        priceCurrency: 'NGN',
        description: 'Unlimited monthly orders, role-based staff accounts, multi-branch switching, and full financial analytics.',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: HOMEPAGE_FAQS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <>
      <JsonLd data={softwareSchema} />
      <JsonLd data={faqSchema} />
      <HomePageContent />
    </>
  );
}
