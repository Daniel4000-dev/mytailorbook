import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import ContactPageContent from './_components/ContactPageContent';

export const metadata: Metadata = {
  title: `Contact — ${APP_CONFIG.name}`,
  description: `Get in touch with the ${APP_CONFIG.name} team — questions, feedback, or support, we read every message.`,
  robots: { index: true, follow: true },
  alternates: { canonical: '/contact' },
  openGraph: {
    title: `Contact — ${APP_CONFIG.name}`,
    description: `Get in touch with the ${APP_CONFIG.name} team.`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Contact — ${APP_CONFIG.name}`,
    description: `Get in touch with the ${APP_CONFIG.name} team.`,
  },
};

export default function ContactPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <ContactPageContent />
    </>
  );
}
