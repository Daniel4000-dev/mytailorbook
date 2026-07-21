import type { Metadata } from 'next';
import { getPublicShopPortfolio } from '@/app/public-actions';
import PortfolioView from '@/components/studio/PortfolioView/PortfolioView';
import styles from './page.module.css';

/** Rich link previews are half this page's job — it gets shared in
 *  WhatsApp chats, where the og card is the real first impression. */
export async function generateMetadata({ params }: { params: Promise<{ shopId: string }> }): Promise<Metadata> {
  const { shopId } = await params;
  const portfolio = await getPublicShopPortfolio(shopId);
  if (!portfolio) return { title: 'Portfolio not found' };

  const title = `${portfolio.shop.name} — Bespoke Tailoring`;
  const description = `See ${portfolio.shop.name}'s finished work${
    portfolio.stats.completed > 0 ? ` — ${portfolio.stats.completed} garments completed` : ''
  }. Chat on WhatsApp to commission yours.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: portfolio.photos[0] ? [{ url: portfolio.photos[0].url }] : undefined,
    },
  };
}

export default async function StudioPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const portfolio = await getPublicShopPortfolio(shopId);

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

  return <PortfolioView portfolio={portfolio} />;
}
