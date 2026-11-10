import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import FeaturesPageContent from './_components/FeaturesPageContent';

export const metadata: Metadata = {
  title: `Features — ${APP_CONFIG.name} Operating System for Tailors & Fashion Houses`,
  description:
    'Explore MyStitchBook features: offline customer measurement vault, fabric intake & digital cutting slips, Ready-to-Wear POS, debtors ledger, live WhatsApp tracking, and multi-branch staff roles.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/features' },
  openGraph: {
    title: `Features — ${APP_CONFIG.name} Operating System for Tailors & Fashion Houses`,
    description:
      'From offline measurement records and digital cutting slips to Ready-to-Wear POS, debtors ledger, and live WhatsApp order tracking.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Features — ${APP_CONFIG.name} Operating System for Tailors & Fashion Houses`,
    description:
      'From offline measurement records and digital cutting slips to Ready-to-Wear POS, debtors ledger, and live WhatsApp order tracking.',
  },
};

export default function FeaturesPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Features', path: '/features' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <FeaturesPageContent />
    </>
  );
}
