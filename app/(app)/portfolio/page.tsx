'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import PortfolioView from '@/components/studio/PortfolioView/PortfolioView';
import { getPublicShopPortfolio } from '@/app/public-actions';
import type { PublicPortfolio } from '@/app/public-actions';
import {
  getStoredMockPortfolio,
  wipeMockPortfolio,
  resetMockPortfolio,
} from '@/lib/mockPortfolio';
import styles from './page.module.css';

/**
 * The studio owner's live portfolio preview, rendered in-app with
 * Apple liquid-glass controls and frontend mock inspection capabilities.
 */
export default function OwnPortfolioPage() {
  const router = useRouter();
  const { isOwner, loading: authLoading } = useAuth();
  const { currentShop, isLoaded } = useData();
  const { showToast } = useToast();

  const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    if (!currentShop) {
      const mock = getStoredMockPortfolio();
      setPortfolio(mock);
      setIsUsingMock(true);
      setLoading(false);
      return;
    }

    getPublicShopPortfolio(currentShop.slug)
      .then((res) => {
        if (res && res.outfits && res.outfits.length > 0) {
          setPortfolio(res);
          setIsUsingMock(false);
        } else {
          // Fallback to stored frontend mock portfolio
          const mock = getStoredMockPortfolio(currentShop.slug, currentShop.name);
          setPortfolio(mock);
          setIsUsingMock(true);
        }
      })
      .catch(() => {
        const mock = getStoredMockPortfolio(currentShop.slug, currentShop.name);
        setPortfolio(mock);
        setIsUsingMock(true);
      })
      .finally(() => setLoading(false));
  }, [currentShop]);

  const handleWipeMock = () => {
    const empty = wipeMockPortfolio();
    setPortfolio(empty);
    showToast('Frontend demo outfits wiped. Portfolio gallery is now blank.', 'info');
  };

  const handleResetMock = () => {
    const fresh = resetMockPortfolio(currentShop?.slug, currentShop?.name);
    setPortfolio(fresh);
    setIsUsingMock(true);
    showToast('Sample portfolio restored with 6 signature bespoke commissions!', 'success');
  };

  const handleShare = () => {
    const slug = currentShop?.slug || 'savile-row';
    const url = `${window.location.origin}/studio/${slug}`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showToast('Storefront link copied to clipboard!', 'success');
    } else {
      window.open(url, '_blank');
    }
  };

  if (authLoading) {
    return (
      <div className={styles.status}>
        <p>Loading your atelier portfolio...</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className={styles.status}>
        <p>Only the studio owner can preview this portfolio.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* ── Apple Liquid Glass Top Control Bar ── */}
      <FixedBottomPortal>
        <div className={styles.topFloatingBar}>
          <div className={styles.barLeftGroup}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => router.back()}
              aria-label="Back to Atelier"
            >
              <Symbol name="arrow_back" size={18} />
            </button>
            <div className={styles.barTag}>
              <Symbol name="verified" size={14} />
              <span className={styles.barTagText}>
                {isUsingMock ? 'Demo Storefront Preview' : 'Live Atelier Storefront'}
              </span>
            </div>
          </div>

          <div className={styles.barActions}>
            {isUsingMock ? (
              portfolio && portfolio.outfits && portfolio.outfits.length > 0 ? (
                <button
                  type="button"
                  className={styles.barActionBtn}
                  style={{ color: '#DC2626', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                  onClick={handleWipeMock}
                  title="Wipe frontend demo outfits"
                >
                  <Symbol name="delete" size={13} />
                  <span>Wipe Demo</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.barActionBtn}
                  onClick={handleResetMock}
                  title="Reset sample bespoke outfits"
                >
                  <Symbol name="auto_awesome" size={13} />
                  <span>Load Sample Outfits</span>
                </button>
              )
            ) : null}

            <button
              type="button"
              className={styles.barActionBtn}
              onClick={() => router.push('/settings/portfolio')}
              title="Curate outfits in settings"
            >
              <Symbol name="tune" size={13} />
              <span>Curate</span>
            </button>

            <button
              type="button"
              className={`${styles.barActionBtn} ${styles.barActionPrimary}`}
              onClick={handleShare}
              title="Share public storefront link"
            >
              <Symbol name="share" size={13} />
              <span>Share Link</span>
            </button>
          </div>
        </div>
      </FixedBottomPortal>

      {!isLoaded || loading ? (
        <div className={styles.status}>
          <p>Loading your atelier portfolio...</p>
        </div>
      ) : portfolio ? (
        <PortfolioView portfolio={portfolio} />
      ) : (
        <div className={styles.status}>
          <p>Could not load portfolio. Please check your connection and try again.</p>
        </div>
      )}
    </div>
  );
}
