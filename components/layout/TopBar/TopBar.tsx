'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNetwork } from '@/lib/hooks/useNetwork';
import { useData } from '@/contexts/DataContext';
import styles from './TopBar.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';

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
  const { toggleMenu } = useSidebar();
  const { isOnline } = useNetwork();
  const { currentShop } = useData();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const finalRightAction = rightAction || actions;
  
  const currentStreak = currentShop?.streakCurrent || 0;
  const prevStreakRef = useRef(currentShop?.streakCurrent);

  useEffect(() => {
    if (currentStreak > (prevStreakRef.current || 0) && prevStreakRef.current !== undefined) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.1, x: 0.8 },
        colors: ['#FF9800', '#FF5722', '#FFC107']
      });
    }
    prevStreakRef.current = currentStreak;
  }, [currentStreak]);

  const streakIndicator = currentStreak > 0 && (
    <div className={styles.streakBadge} title={`${currentStreak} day streak!`}>
      🔥 <span>{currentStreak}</span>
    </div>
  );

  return (
    <header className={styles.topBar}>
      {brandMode ? (
        <div className={styles.profileHeaderContent}>
          <div className={styles.left}>
            <button className={styles.hamburgerBtn} onClick={toggleMenu} aria-label="Open menu" data-tour-id="menu">
              <Symbol name="menu" size={24} />
            </button>
            {leftAction}
          </div>
          <div className={styles.right}>
            {streakIndicator}
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
            <div className={styles.logoBadge}>
              <BrandIcon className={styles.logoBadgeImg} />
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
              <button className={styles.hamburgerBtn} onClick={toggleMenu} aria-label="Open menu" data-tour-id="menu">
                <Symbol name="menu" size={24} />
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
                {streakIndicator}
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
  );
}
