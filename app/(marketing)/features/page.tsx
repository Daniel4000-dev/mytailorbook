import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import FeaturesPageContent from './_components/FeaturesPageContent';

export const metadata: Metadata = {
  title: `Features — ${APP_CONFIG.name}`,
  description:
    'A production board, digital client profiles, unlimited custom styles, public order tracking, a free portfolio page, receipts & invoices, and staff accounts when you grow.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/features' },
  openGraph: {
    title: `Features — ${APP_CONFIG.name}`,
    description: 'Everything you need to run your tailoring business and delight your customers, in one place.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Features — ${APP_CONFIG.name}`,
    description: 'Everything you need to run your tailoring business and delight your customers, in one place.',
  },
};

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
