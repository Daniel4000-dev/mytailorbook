'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import PortfolioView from '@/components/studio/PortfolioView/PortfolioView';
import { getPublicShopPortfolio } from '@/app/public-actions';
import type { PublicPortfolio } from '@/app/public-actions';
import styles from './page.module.css';

/** The owner's own portfolio, viewed in-app (same tab, app chrome still
 *  reachable via the back button) — same PortfolioView a visitor sees at
 *  the public /studio/[shopId] link, just not a new tab away from the app.
 *  Sharing from here still hands out that public URL, not this one. */
export default function OwnPortfolioPage() {
  const router = useRouter();
  const { isOwner } = useAuth();
  const { currentShop, isLoaded } = useData();
  const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentShop) return;
    getPublicShopPortfolio(currentShop.id)
      .then(setPortfolio)
      .finally(() => setLoading(false));
  }, [currentShop]);

  if (!isOwner) {
    return (
      <div className={styles.status}>
        <p>Only the studio owner can view this.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <FixedBottomPortal>
        <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <Symbol name="arrow_back" size={22} />
        </button>
      </FixedBottomPortal>

      {!isLoaded || loading ? (
        <div className={styles.status}>
          <p>Loading your portfolio…</p>
        </div>
      ) : portfolio ? (
        <PortfolioView portfolio={portfolio} />
      ) : (
        <div className={styles.status}>
          <p>Could not load your portfolio — check your connection and try again.</p>
        </div>
      )}
    </div>
  );
}
