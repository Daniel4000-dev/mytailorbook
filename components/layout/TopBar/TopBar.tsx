'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import { useNetwork } from '@/lib/hooks/useNetwork';
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
  profileMode?: {
    greeting: string;
    name: string;
  };
}

export default function TopBar({
  title,
  subtitle,
  showBack,
  onBack,
  leftAction,
  rightAction,
  actions,
  profileMode,
}: TopBarProps) {
  const router = useRouter();
  const { toggleMenu } = useSidebar();
  const { isOnline } = useNetwork();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const finalRightAction = rightAction || actions;

  return (
    <header className={styles.topBar}>
      {profileMode ? (
        <div className={styles.profileHeaderContent}>
          <div className={styles.left}>
            <button className={styles.hamburgerBtn} onClick={toggleMenu} aria-label="Open menu" data-tour-id="menu">
              <Symbol name="menu" size={24} />
            </button>
            {leftAction}
            
            <div className={styles.greetingWrapper}>
              <span className={styles.greetingText}>{profileMode.greeting},</span>
              <span className={styles.profileName}>{profileMode.name}</span>
            </div>
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
            )}
          </div>
        </>
      )}
    </header>
  );
}
