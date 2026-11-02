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

  const streakIndicator = (
    <button
      type="button"
      className={styles.streakBadge}
      title={currentStreak > 0 ? `${currentStreak} day streak! Tap to view craft activities` : 'Start daily streak'}
      onClick={() => setIsStreakModalOpen(true)}
      aria-label="Atelier streak status and craft activities"
    >
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
                title={`Atelier Profile • Tier: ${currentTier.name} (${xp} XP)`}
                aria-label={`Atelier Profile • Tier: ${currentTier.name} (${xp} XP)`}
              >
                <div
                  className={styles.brandLogoWrapper}
                  style={{
                    ['--tier-color' as string]: currentTier.color,
                  }}
                >
                  <BrandIcon className={styles.brandLogoImg} alt="MyStitchBook" />
                  <span
                    className={styles.tierNeedleBadge}
                    style={{ backgroundColor: currentTier.color }}
                    title={`Tier: ${currentTier.name} (${xp} XP) - View Master Tailor Challenge`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsChallengeModalOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Tier: ${currentTier.name} (${xp} XP)`}
                  >
                    <Symbol name="needle" size={10} style={{ color: '#ffffff' }} />
                  </span>
                </div>
              </Link>
              {leftAction}
            </div>
            <div className={styles.right}>
              <Link
                href="/circle"
                className={styles.circleBtn}
                title="Atelier Circle & Buddy Pulse"
                aria-label="Atelier Circle & Buddy Pulse"
              >
                <Symbol name="groups" size={24} />
              </Link>

              <NotificationBell />

              <div className={styles.streakContainer} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
