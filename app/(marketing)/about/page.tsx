import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import AboutPageContent from './_components/AboutPageContent';

export const metadata: Metadata = {
  title: `About — ${APP_CONFIG.name}`,
  description:
    'MyStitchBook merges the tactile heritage of textile arts with the precision of modern software. Our mission, values, and why our brand color honors the Adire Indigo textile tradition.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/about' },
  openGraph: {
    title: `About — ${APP_CONFIG.name}`,
    description: 'Elevating the craft of tailoring through technology.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `About — ${APP_CONFIG.name}`,
    description: 'Elevating the craft of tailoring through technology.',
  },
};

export default function AboutPage() {
  // The Organization entity itself (name, url, logo, founder) lives once,
  // site-wide, in the root layout — this page only adds its own position
  // in the site hierarchy.
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <AboutPageContent />
    </>
  );
}
