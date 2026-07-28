'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import ProductionBoard from './_components/ProductionBoard';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import styles from './page.module.css';

export default function ProductionPage() {
  const { user } = useAuth();

  return (
    <PageLayout
      header={
        <TopBar
          title="Production Board"
          subtitle="From first cut to final stitch."
          rightAction={
            <div className={styles.headerActions}>
              <NotificationBell />
            </div>
          }
        />
      }
    >
      <div className={styles.boardWrapper}>
        <Suspense fallback={null}>
          <ProductionBoard userRole={user?.role || 'Staff'} />
        </Suspense>
      </div>
    </PageLayout>
  );
}
