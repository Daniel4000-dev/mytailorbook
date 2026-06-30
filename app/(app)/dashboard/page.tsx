'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaTriangleExclamation, 
  FaFireFlameCurved, 
  FaBars,
  FaScissors,
  FaCheck,
  FaCircleCheck,
  FaArrowRight,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useSidebar } from '@/contexts/SidebarContext';
import CircleIconButton from '@/components/ui/CircleIconButton/CircleIconButton';
import PageLayout from '@/components/layout/PageLayout/PageLayout';
import TopBar from '@/components/layout/TopBar/TopBar';
import { formatCurrency } from '@/lib/formatters';
import { getBalanceOwed, isOverdue } from '@/lib/types';

import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { orders } = useData();
  const { toggleMenu } = useSidebar();

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const stats = useMemo(() => {
    const cutting = orders.filter((o) => o.status === 'Cutting').length;
    const sewing = orders.filter((o) => o.status === 'Sewing').length;
    const inProgress = cutting + sewing;
    const ready = orders.filter((o) => o.status === 'Ready').length;
    const completed = orders.filter((o) => o.status === 'Completed').length;
    const overdueCount = orders.filter((o) => isOverdue(o)).length;
    const rushCount = orders.filter((o) => o.priority === 'rush' && o.status !== 'Completed').length;
    const outstanding = orders
      .filter((o) => o.status !== 'Completed')
      .reduce((sum, o) => sum + getBalanceOwed(o), 0);
      
    return { cutting, sewing, inProgress, ready, completed, overdueCount, rushCount, outstanding };
  }, [orders]);

  const activeOrdersCount = stats.inProgress + stats.ready;
  const hasUrgentAlerts = stats.rushCount > 0 || stats.overdueCount > 0;

  // Calculate widths for the progress bar
  const totalActive = Math.max(1, activeOrdersCount);
  const cutPct = (stats.cutting / totalActive) * 100;
  const sewPct = (stats.sewing / totalActive) * 100;
  const readyPct = (stats.ready / totalActive) * 100;

  const collected = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.depositPaid, 0);
  }, [orders]);

  const projected = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'Completed')
      .reduce((sum, o) => sum + getBalanceOwed(o), 0);
  }, [orders]);

  const urgentCount = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'Completed') return false;
      return isOverdue(o) || o.priority === 'rush' || o.priority === 'urgent';
    }).length;
  }, [orders]);

  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return orders.filter((o) => {
      if (!o.dueDate || o.status === 'Completed') return false;
      const dueStr = new Date(o.dueDate).toISOString().split('T')[0];
      return dueStr === todayStr;
    }).length;
  }, [orders]);

  const [hideCollected, setHideCollected] = useState(false);
  const [hideProjected, setHideProjected] = useState(false);

  return (
    <PageLayout 
      className={styles.pageGrid}
      header={
        <TopBar 
          profileMode={{
            greeting: "Overview",
            name: firstName,
            avatarInitials: firstName[0]
          }}
          leftAction={
            <div className={styles.mobileOnly}>
              <CircleIconButton 
                icon={<FaBars />} 
                onClick={toggleMenu} 
                ariaLabel="Open menu"
              />
            </div>
          }
        />
      }
    >
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Overview Analytics</span>
      </div>

      <div className={styles.financeGrid}>
        <div className={styles.financeCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Total Collected</span>
            <button 
              type="button"
              onClick={() => setHideCollected(!hideCollected)} 
              className={styles.cardPrivacyBtn}
              title={hideCollected ? "Show Balance" : "Hide Balance"}
            >
              {hideCollected ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <span className={`${styles.cardValue} ${hideCollected ? styles.blurredValue : ''}`}>
            {formatCurrency(collected)}
          </span>
        </div>
        
        <div className={styles.financeCard}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Projected Earnings</span>
            <button 
              type="button"
              onClick={() => setHideProjected(!hideProjected)} 
              className={styles.cardPrivacyBtn}
              title={hideProjected ? "Show Balance" : "Hide Balance"}
            >
              {hideProjected ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <span className={`${styles.cardValue} ${hideProjected ? styles.blurredValue : ''}`}>
            {formatCurrency(projected)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${urgentCount > 0 ? styles.alertCard : ''}`}>
          <span className={styles.cardLabel}>Overdue & Urgent</span>
          <span className={styles.cardValue}>{urgentCount}</span>
        </div>
        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <span className={styles.cardLabel}>Due Today</span>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
      </div>
    </PageLayout>
  );
}
