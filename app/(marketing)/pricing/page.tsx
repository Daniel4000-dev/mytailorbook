import type { Metadata } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { FREE_MONTHLY_ORDER_LIMIT, PREMIUM_MONTHLY_PRICE_NGN, PREMIUM_YEARLY_PRICE_NGN } from '@/lib/subscription';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import PricingPageContent from './_components/PricingPageContent';

export const metadata: Metadata = {
  title: `Pricing — ${APP_CONFIG.name}`,
  description: `Free forever: unlimited customers, unlimited custom styles, ${FREE_MONTHLY_ORDER_LIMIT} orders/month. Premium: ₦${PREMIUM_MONTHLY_PRICE_NGN.toLocaleString()}/month or ₦${PREMIUM_YEARLY_PRICE_NGN.toLocaleString()}/year for unlimited orders, staff accounts, and business insights.`,
  robots: { index: true, follow: true },
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: `Pricing — ${APP_CONFIG.name}`,
    description: 'Simple, honest pricing. Unlimited customers and styles on every plan, forever.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Pricing — ${APP_CONFIG.name}`,
    description: 'Simple, honest pricing. Unlimited customers and styles on every plan, forever.',
  },
};

const FAQ_JSONLD_ITEMS = [
  {
    q: 'What happens if my payment fails?',
    a: 'You keep every Premium feature for a 3-day grace period, with reminders along the way. If payment still has not gone through after that, your shop reverts to the Free plan — your data is never locked or deleted.',
  },
  {
    q: 'Is there really no limit on customers?',
    a: `Yes — unlimited customers and unlimited custom style templates on the Free plan, forever. The only Free-plan limit is order volume, at ${FREE_MONTHLY_ORDER_LIMIT} orders a month.`,
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, there is no lock-in contract. Cancelling reverts your shop to the Free plan at the end of your current billing period.',
  },
];

export default function PricingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_JSONLD_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />
      <PricingPageContent />
    </>
  );
}
