import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import HomePageContent from './_components/HomePageContent';

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — All-in-one business App for tailors`,
  description:
    'Manage customers, store measurements, track orders, send invoices, and keep clients updated - all in one simple app. Free forever, no card required.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    title: `${APP_CONFIG.name} — All-in-one business App for tailors`,
    description:
      'Manage customers, store measurements, track orders, send invoices, and keep clients updated - all in one simple app.',
    type: 'website',
    images: [{ url: '/images/marketing/hero-tailor-tablet.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_CONFIG.name} — All-in-one business App for tailors`,
    description:
      'Manage customers, store measurements, track orders, send invoices, and keep clients updated - all in one simple app.',
    images: ['/images/marketing/hero-tailor-tablet.jpg'],
  },
};

export default function HomePage() {
  return <HomePageContent />;
}
