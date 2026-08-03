import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_CONFIG.name,
    url: APP_CONFIG.baseUrl,
    founder: { '@type': 'Group', name: 'DVCH' },
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <AboutPageContent />
    </>
  );
}
