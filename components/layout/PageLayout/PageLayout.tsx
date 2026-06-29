'use client';

import React, { ReactNode } from 'react';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  header?: ReactNode;
  children: ReactNode;
  padding?: 'normal' | 'none';
  className?: string;
}

export default function PageLayout({
  header,
  children,
  padding = 'normal',
  className = '',
}: PageLayoutProps) {
  return (
    <div className={styles.layoutWrapper}>
      {header && <div className={styles.headerContainer}>{header}</div>}
      <div className={`${styles.contentContainer} ${styles[padding]} ${className}`}>
        {children}
      </div>
    </div>
  );
}
