import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import PortfolioExamplesContent from './_components/PortfolioExamplesContent';

export const metadata: Metadata = {
  title: `Portfolio Templates — ${APP_CONFIG.name}`,
  description:
    'Three free portfolio templates — Modern, Editorial, and Heritage — automatically built from your finished work. Choose the one that fits how you present your craft.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/portfolio-examples' },
  openGraph: {
    title: `Portfolio Templates — ${APP_CONFIG.name}`,
    description: 'Your work deserves a stage. Three free portfolio templates to choose from.',
    type: 'website',
    images: [{ url: '/images/marketing/portfolio-hero.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Portfolio Templates — ${APP_CONFIG.name}`,
    description: 'Your work deserves a stage. Three free portfolio templates to choose from.',
    images: ['/images/marketing/portfolio-hero.jpg'],
  },
};

export default function PortfolioExamplesPage() {
  return <PortfolioExamplesContent />;
}
