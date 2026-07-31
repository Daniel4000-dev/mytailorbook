import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import HomePageContent from './_components/HomePageContent';

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Business Management & Customer Experience for Tailors`,
  description:
    'Run your tailoring business and delight your customers in one place — unlimited customers and custom styles, a production board, public order tracking, and a free portfolio page. Free forever, no card required.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  openGraph: {
    title: `${APP_CONFIG.name} — Precision. Elegance. Flow.`,
    description:
      'The business and customer-relationship platform built for tailors and fashion designers across Nigeria and Africa.',
    type: 'website',
    images: [{ url: '/images/marketing/hero-tailor-tablet.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_CONFIG.name} — Precision. Elegance. Flow.`,
    description:
      'The business and customer-relationship platform built for tailors and fashion designers across Nigeria and Africa.',
    images: ['/images/marketing/hero-tailor-tablet.jpg'],
  },
};

export default function HomePage() {
  return <HomePageContent />;
}
