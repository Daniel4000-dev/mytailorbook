import type { Metadata } from 'next';
import { getPublicShopPortfolio } from '@/app/public-actions';
import { breadcrumbJsonLd } from '@/lib/breadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import PortfolioView from '@/components/studio/PortfolioView/PortfolioView';
import styles from './page.module.css';

// This page has no per-second freshness need — photos/testimonials/stats
// don't change from one visitor to the next — but real traffic here comes
// in bursts (a link shared in a WhatsApp group, many people opening it
// around the same time). 2 minutes cuts that repeat load meaningfully
// without making an owner's own quick post-edit check feel stale. The
// in-app owner preview (app/(app)/portfolio) is a separate client-invoked
// call, unaffected by this page-level cache.
export const revalidate = 120;

/** Rich link previews are half this page's job — it gets shared in
 *  WhatsApp chats, where the og card is the real first impression. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const portfolio = await getPublicShopPortfolio(slug);
  if (!portfolio) return { title: 'Portfolio not found' };

  const title = `${portfolio.shop.name} — Bespoke Tailoring`;
  const description = `See ${portfolio.shop.name}'s finished work${
    portfolio.stats.completed > 0 ? ` — ${portfolio.stats.completed} garments completed` : ''
  }. Chat on WhatsApp to commission yours.`;
  // A shop with no completed-work photos yet previously got no og:image at
  // all — a shared link showed a blank preview instead of any branding.
  // Falls back to the same site-wide logo image the root layout already
  // uses, so there's always a real preview, personalized once real photos
  // exist.
  const previewImage = portfolio.photos[0]?.url || '/images/og-image.png';
  return {
    title,
    description,
    // The one page in the app that's genuinely meant to be found —
    // explicit opt-in overrides the root layout's site-wide noindex default.
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

  if (!portfolio) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorCard}>
          <h2>Portfolio not found</h2>
          <p>This studio link may have changed — ask the tailor for a fresh one.</p>
        </div>
      </div>
    );
  }

  // Structured data for local-business discovery — only real fields the
  // shop actually has are included, nothing fabricated (no fake hours).
  // The rating/review data below is real too: ratingSummary is computed
  // from every approved order_ratings row for this shop (not just the
  // capped/ordered testimonials list), so the AggregateRating claim always
  // matches what a customer could independently verify.
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: portfolio.shop.name,
  };
  if (portfolio.shop.address) jsonLd.address = portfolio.shop.address;
  if (portfolio.shop.phone) jsonLd.telephone = portfolio.shop.phone;
  if (portfolio.shop.logoUrl) jsonLd.image = portfolio.shop.logoUrl;
  else if (portfolio.photos[0]) jsonLd.image = portfolio.photos[0].url;
  if (portfolio.shop.bio) jsonLd.description = portfolio.shop.bio;
  if (portfolio.ratingSummary) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(portfolio.ratingSummary.average.toFixed(1)),
      reviewCount: portfolio.ratingSummary.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (portfolio.testimonials.length > 0) {
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
    { name: portfolio.shop.name, path: `/studio/${portfolio.shop.slug}` },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />
      <PortfolioView portfolio={portfolio} />
    </>
  );
}
