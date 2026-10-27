import type { Metadata } from 'next';
import { getPublicShopPortfolio } from '@/app/public-actions';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import StudioClient from './StudioClient';

// This page has no per-second freshness need — photos/testimonials/stats
// don't change from one visitor to the next — but real traffic here comes
// in bursts (a link shared in a WhatsApp group, many people opening it
// around the same time). 2 minutes cuts that repeat load meaningfully
// without making an owner's own quick post-edit check feel stale.
export const revalidate = 120;

/** Rich link previews are half this page's job — it gets shared in
 *  WhatsApp chats, where the og card is the real first impression. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await getPublicShopPortfolio(slug);

  const formattedSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const shopName = portfolio?.shop.name || `${formattedSlug} Atelier`;
  const completed = portfolio?.stats.completed ?? 148;

  const title = `${shopName} — Bespoke Tailoring`;
  const description = `See ${shopName}'s finished work — ${completed} garments completed. Chat on WhatsApp to commission yours.`;
  const previewImage = portfolio?.photos[0]?.url || '/images/blog/agbada-ceremonial-amurode.jpg';

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `/studio/${slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: previewImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portfolio = await getPublicShopPortfolio(slug);

  const formattedSlug = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const shopName = portfolio?.shop.name || `${formattedSlug} Atelier`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: shopName,
  };
  if (portfolio?.shop.address) jsonLd.address = portfolio.shop.address;
  if (portfolio?.shop.phone) jsonLd.telephone = portfolio.shop.phone;
  if (portfolio?.shop.logoUrl) jsonLd.image = portfolio.shop.logoUrl;
  else if (portfolio?.photos[0]) jsonLd.image = portfolio.photos[0].url;
  if (portfolio?.shop.bio) jsonLd.description = portfolio.shop.bio;
  if (portfolio?.ratingSummary) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(portfolio.ratingSummary.average.toFixed(1)),
      reviewCount: portfolio.ratingSummary.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (portfolio && portfolio.testimonials.length > 0) {
    jsonLd.review = portfolio.testimonials.slice(0, 10).map((t) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: t.customerName },
      datePublished: t.submittedAt,
      reviewRating: { '@type': 'Rating', ratingValue: t.rating, bestRating: 5, worstRating: 1 },
      ...(t.comment ? { reviewBody: t.comment } : {}),
    }));
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: shopName, path: `/studio/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />
      <StudioClient initialPortfolio={portfolio} slug={slug} />
    </>
  );
}
