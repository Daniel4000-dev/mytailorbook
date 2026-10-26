'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/lib/hooks/useNetwork';
import { useData } from '@/contexts/DataContext';
import styles from './TopBar.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import FlameIcon from "@/components/ui/FlameIcon/FlameIcon";
import { getTierForXp } from '@/lib/gamification';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import StreakModal from '@/components/ui/StreakModal/StreakModal';
import ChallengeModal from '@/components/ui/ChallengeModal/ChallengeModal';
import AccountSheet from '../AccountSheet/AccountSheet';

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
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { currentShop } = useData();
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);

  const userInitial = user?.name?.charAt(0) || user?.email?.charAt(0) || 'A';

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
              <button
                type="button"
                className={styles.profileAvatarBtn}
                onClick={() => setIsAccountSheetOpen(true)}
                aria-label="Open account and atelier menu"
              >
                {user?.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="" width={36} height={36} className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarInitial}>{userInitial.toUpperCase()}</span>
                )}
                <span className={styles.avatarOnlineDot} />
              </button>
              {leftAction}
            </div>
            <div className={styles.right}>
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

              <div className={styles.streakContainer} style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={styles.tierBadge}
                  title={`${xp} XP - ${currentTier.name} (View Master Tailor Challenge)`}
                  onClick={() => setIsChallengeModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'var(--sf-bg-surface)',
                    padding: '4px 9px',
                    borderRadius: '100px',
                    border: `1px solid ${currentTier.color}`,
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  <Symbol name={currentTier.icon} size={16} style={{ color: currentTier.color, fontVariationSettings: "'FILL' 1" }} />
                  <span style={{ color: currentTier.color }}>{currentTier.name}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(234, 179, 8, 0.15)', padding: '2px 5px', borderRadius: '100px' }}>
                    <Symbol name="workspace_premium" size={12} style={{ color: '#eab308' }} />
                  </span>
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
              {showBack ? (
                <button className={styles.backBtn} onClick={handleBack} aria-label="Go back">
                  <Symbol name="arrow_back" size={24} />
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.profileAvatarBtnSmall}
                  onClick={() => setIsAccountSheetOpen(true)}
                  aria-label="Open account and atelier menu"
                >
                  {user?.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="" width={30} height={30} className={styles.avatarImgSmall} />
                  ) : (
                    <span className={styles.avatarInitialSmall}>{userInitial.toUpperCase()}</span>
                  )}
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

      <AccountSheet
        isOpen={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
      />

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
