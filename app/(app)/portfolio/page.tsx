'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';
import Symbol from '@/components/ui/Symbol/Symbol';
import WhatsappIcon from '@/components/ui/WhatsappIcon/WhatsappIcon';
import FixedBottomPortal from '@/components/ui/FixedBottomPortal/FixedBottomPortal';
import PortfolioView from '@/components/studio/PortfolioView/PortfolioView';
import { getPublicShopPortfolio } from '@/app/public-actions';
import type { PublicPortfolio } from '@/app/public-actions';
import styles from './page.module.css';

/**
 * The studio owner's live portfolio preview, rendered in-app with
 * Apple liquid-glass controls.
 */
export default function OwnPortfolioPage() {
  const router = useRouter();
  const { isOwner, loading: authLoading } = useAuth();
  const { currentShop, isLoaded } = useData();
  const { showToast } = useToast();

  const [portfolio, setPortfolio] = useState<PublicPortfolio | null>(() => {
    if (typeof window === 'undefined' || !currentShop?.slug) return null;
    try {
      const stored = localStorage.getItem(`mtb_portfolio_${currentShop.slug}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!portfolio);

  useEffect(() => {
    if (!currentShop?.slug) {
      setPortfolio(null);
      setLoading(false);
      return;
    }

    // Immediate hydration from cache if not already loaded
    try {
      const stored = localStorage.getItem(`mtb_portfolio_${currentShop.slug}`);
      if (stored && !portfolio) {
        setPortfolio(JSON.parse(stored));
        setLoading(false);
      }
    } catch {
      // Fallback to fetch
    }

    getPublicShopPortfolio(currentShop.slug)
      .then((res) => {
        if (res) {
          setPortfolio(res);
          try {
            localStorage.setItem(`mtb_portfolio_${currentShop.slug}`, JSON.stringify(res));
          } catch {}
        }
      })
      .catch(() => {
        // Retain cached data on network error
      })
      .finally(() => setLoading(false));
  }, [currentShop?.slug]);

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

  const handleShareWhatsApp = () => {
    const slug = currentShop?.slug || 'savile-row';
    const shopName = currentShop?.name || 'our shop';
    const url = `${window.location.origin}/studio/${slug}`;
    const text = `Greetings from ${shopName}! Explore our signature bespoke collections, handcrafted commissions, and creation stories:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (authLoading) {
    return (
      <div className={styles.status}>
        <p>Loading your shop portfolio...</p>
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
              aria-label="Back to Workshop"
            >
              <Symbol name="arrow_back" size={18} />
            </button>
            <div className={styles.barTag}>
              <Symbol name="verified" size={14} />
              <span className={styles.barTagText}>Live Public Storefront</span>
            </div>
          </div>

          <div className={styles.barActions}>
            <button
              type="button"
              className={styles.barActionBtn}
              onClick={() => router.push('/settings/portfolio?new=1')}
              title="Add and publish new outfit"
            >
              <Symbol name="add" size={13} />
              <span>+ Outfit</span>
            </button>

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
              className={styles.barActionBtn}
              onClick={handleShareWhatsApp}
              title="Share showcase on WhatsApp"
            >
              <WhatsappIcon size={14} />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              className={`${styles.barActionBtn} ${styles.barActionPrimary}`}
              onClick={handleShare}
              title="Share public storefront link"
            >
              <Symbol name="share" size={13} />
              <span>Copy Link</span>
            </button>
          </div>
        </div>
      </FixedBottomPortal>

      {!isLoaded || loading ? (
        <div className={styles.status}>
          <p>Loading your shop portfolio...</p>
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
