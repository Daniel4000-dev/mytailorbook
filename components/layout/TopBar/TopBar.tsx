'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import styles from './TopBar.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

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

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const finalRightAction = rightAction || actions;

  return (
    <header className={styles.topBar}>
      {profileMode ? (
        // Profile Greeting Layout (for Dashboard) — the greeting sits at
        // the left end, same as every other page's title, instead of
        // bunched at the right. No create-order button here: the hero
        // panel directly below already has its own "+ New Order" CTA,
        // and since the hero is the first thing on the page (not scrolled
        // out of view), a second identical-purpose button here was just
        // visual noise, not a real fallback.
        <div className={styles.profileHeaderContent}>
          <div className={styles.left}>
            <button className={styles.hamburgerBtn} onClick={toggleMenu} aria-label="Open menu">
              <Symbol name="menu" size={24} />
            </button>
            {leftAction}
            <div className={styles.greetingWrapper}>
              <span className={styles.greetingText}>{profileMode.greeting},</span>
              <span className={styles.profileName}>{profileMode.name}</span>
            </div>
          </div>
          <div className={styles.right} />
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
              <button className={styles.hamburgerBtn} onClick={toggleMenu} aria-label="Open menu">
                <Symbol name="menu" size={24} />
              </button>
            )}
          </div>
          <div className={styles.center}>
            {title && <h1 className={styles.title}>{title}</h1>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <div className={styles.right}>{finalRightAction}</div>
        </>
      )}
    </header>
  );
}
