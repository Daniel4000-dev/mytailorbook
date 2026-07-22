'use client';

import React, { ReactNode } from 'react';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  header?: ReactNode;
  children: ReactNode;
  padding?: 'normal' | 'none';
  /** Desktop content width. 'full' spans the shell (tables, card grids);
   *  'narrow' caps single-column reading/settings/detail content to a
   *  comfortable measure so it reads as a designed column instead of a
   *  mobile list stretched edge-to-edge on wide desktops. */
  width?: 'full' | 'narrow';
  className?: string;
}

export default function PageLayout({
  header,
  children,
  padding = 'normal',
  width = 'full',
  className = '',
}: PageLayoutProps) {
  return (
    <div className={styles.layoutWrapper}>
      {header && <div className={styles.headerContainer}>{header}</div>}
      <div
        className={`${styles.contentContainer} ${styles[padding]} ${width === 'narrow' ? styles.narrow : ''} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
