'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useNetwork } from '@/lib/hooks/useNetwork';
import { useData } from '@/contexts/DataContext';
import styles from './TopBar.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import FlameIcon from "@/components/ui/FlameIcon/FlameIcon";
import { getTierForXp } from '@/lib/gamification';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import StreakModal from '@/components/ui/StreakModal/StreakModal';
import ChallengeModal from '@/components/ui/ChallengeModal/ChallengeModal';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  actions?: ReactNode; // Fallback for existing components
  brandMode?: boolean;
}

export default function TopBar({
  title,
  subtitle,
  showBack,
  onBack,
  leftAction,
  rightAction,
  actions,
  brandMode,
}: TopBarProps) {
  const router = useRouter();
  const { isOnline } = useNetwork();
  const { currentShop } = useData();
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const finalRightAction = rightAction || actions;

  const currentStreak = currentShop?.streakCurrent || 0;
  const xp = currentShop?.xp || 0;
  const currentTier = getTierForXp(xp);

  const prevStreakRef = useRef(currentShop?.streakCurrent);

  useEffect(() => {
    if (currentStreak > (prevStreakRef.current || 0) && prevStreakRef.current !== undefined) {
      // Streak increased! Show the Duolingo-style modal
      setIsStreakModalOpen(true);
    }
    prevStreakRef.current = currentStreak;
  }, [currentStreak]);

  const streakIndicator = currentStreak > 0 && (
    <button className={styles.streakBadge} title={`${currentStreak} day streak!`} onClick={() => setIsStreakModalOpen(true)}>
      <FlameIcon size={18} style={{ marginRight: '4px' }} /> <span>{currentStreak}</span>
    </button>
  );

  return (
    <>
      <header className={styles.topBar}>
        {brandMode ? (
          <div className={styles.profileHeaderContent}>
            <div className={styles.left}>
              <Link
                href="/settings"
                className={styles.brandLogoLink}
                title="Atelier Profile & Settings"
                aria-label="Atelier Profile & Settings"
              >
                <BrandIcon className={styles.brandLogoImg} alt="MyStitchBook" />
              </Link>
              {leftAction}
            </div>
            <div className={styles.right}>
              <NotificationBell />

              <div className={styles.streakContainer} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className={styles.tierBadge}
                  title={`${xp} XP - ${currentTier.name} (View Master Tailor Challenge)`}
                  onClick={() => setIsChallengeModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--sf-bg-surface)',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    border: `1px solid ${currentTier.color}`,
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: 0.9,
                  }}
                >
                  <Symbol name={currentTier.icon} size={13} style={{ color: currentTier.color, fontVariationSettings: "'FILL' 1" }} />
                  <span style={{ color: currentTier.color }}>{currentTier.name}</span>
                </button>
                {streakIndicator}
              </div>

            </div>
          </div>
        ) : (
          // Standard Title Layout
          <>
            <div className={styles.left}>
              {leftAction}
              {showBack && (
                <button className={styles.backBtn} onClick={handleBack} aria-label="Go back">
                  <Symbol name="arrow_back" size={24} />
                </button>
              )}
            </div>
            <div className={styles.center}>
              {title && <h1 className={styles.title}>{title}</h1>}
              {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            <div className={styles.right}>
              {finalRightAction || (
                <>
                  <button className={styles.notificationBtn} onClick={() => router.push('/notifications')} aria-label="Notifications">
                    {!isOnline ? (
                      <Symbol name="cloud_off" size={24} className={styles.offlineIcon} />
                    ) : (
                      <>
                        <Symbol name="notifications" size={24} />
                        <span className={styles.notificationBadge} />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </header>


      <StreakModal 
        isOpen={isStreakModalOpen} 
        onClose={() => setIsStreakModalOpen(false)} 
        streakCount={currentStreak} 
      />

      <ChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
      />
    </>
  );
}
