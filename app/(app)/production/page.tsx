'use client';


import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import KanbanBoard from '@/components/kanban/KanbanBoard/KanbanBoard';
import { FaBell, FaBars } from 'react-icons/fa6';
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
              {/* Notification Button */}
              <div className={styles.notificationBtn} title="Notifications">
                <span className={styles.badgeCount}>0</span>
                <FaBell className={styles.bellIcon} />
              </div>
            </div>
          }
        />
      }
    >
      <div className={styles.boardWrapper}>
        <KanbanBoard userRole={user?.role || 'Staff'} />
      </div>
    </PageLayout>
  );
}
