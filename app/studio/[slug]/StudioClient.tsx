'use client';

import { useState, useEffect } from 'react';
import type { PublicPortfolio } from '@/app/public-actions';
import PortfolioView from '@/components/studio/PortfolioView/PortfolioView';
import { getStoredMockPortfolio } from '@/lib/mockPortfolio';
import styles from './page.module.css';

interface StudioClientProps {
  initialPortfolio: PublicPortfolio | null;
  slug: string;
}

export default function StudioClient({ initialPortfolio, slug }: StudioClientProps) {
  const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(initialPortfolio);

  useEffect(() => {
    if (initialPortfolio && initialPortfolio.outfits && initialPortfolio.outfits.length > 0) {
      setPortfolio(initialPortfolio);
    } else {
      // Fallback to client stored mock portfolio for preview/demo inspection
      const formattedSlug = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const mock = getStoredMockPortfolio(slug, `${formattedSlug} Atelier`);
      setPortfolio(mock);
    }
  }, [initialPortfolio, slug]);

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

