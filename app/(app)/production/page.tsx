'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import KanbanBoard from '@/components/kanban/KanbanBoard/KanbanBoard';
import NotificationBell from '@/components/layout/NotificationBell/NotificationBell';
import { FaBars } from 'react-icons/fa6';
import styles from './page.module.css';

export default function ProductionPage() {
  const { user } = useAuth();
  const { toggleMenu } = useSidebar();

  return (
    <PageLayout
      header={
        <TopBar 
          title="Production Board"
          subtitle="Track and manage custom orders through the workshop cutting and sewing phases."
          leftAction={
            <div className={styles.mobileOnly}>
              <button className={styles.mobileMenuBtn} onClick={toggleMenu} aria-label="Menu">
                <FaBars />
              </button>
            </div>
          }
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
          <KanbanBoard userRole={user?.role || 'Staff'} />
        </Suspense>
      </div>
    </PageLayout>
  );
}
