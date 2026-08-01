import type { Metadata } from 'next';
import { getPublicShopPortfolio } from '@/app/public-actions';
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
      images: portfolio.photos[0] ? [{ url: portfolio.photos[0].url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: portfolio.photos[0] ? [portfolio.photos[0].url] : undefined,
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
  // shop actually has are included, nothing fabricated (no rating/review
  // counts, no fake hours).
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

  return (
    <>
      <script
        type="application/ld+json"
        // shop name/bio/address are owner-entered content, not trusted —
        // JSON.stringify doesn't escape "<", so without this a bio
        // containing "</script>" could break out of the tag and inject
        // arbitrary HTML/script into every visitor's page.
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PortfolioView portfolio={portfolio} />
    </>
  );
}
