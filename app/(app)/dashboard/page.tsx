'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaTriangleExclamation, 
  FaFireFlameCurved, 
  FaBars,
  FaScissors,
  FaCheck,
  FaCircleCheck,
  FaArrowRight
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
      {/* ── Dynamic Island Alert ── */}
      {hasUrgentAlerts && (
        <div className={styles.dynamicIsland} onClick={() => router.push('/production')}>
          <div className={styles.islandLeft}>
            <div className={styles.islandIconWrapper}>
              {stats.overdueCount > 0 ? <FaTriangleExclamation /> : <FaFireFlameCurved />}
            </div>
            <div className={styles.islandText}>
              <span className={styles.islandTitle}>Action Required</span>
              <span className={styles.islandSubtitle}>
                {stats.overdueCount > 0 && `${stats.overdueCount} overdue orders. `}
                {stats.rushCount > 0 && `${stats.rushCount} rush orders.`}
              </span>
            </div>
          </div>
          <span className={styles.islandAction}>View</span>
        </div>
      )}

      <div className={styles.bentoGrid}>
        
        {/* ── Hero Balance Card (Span 2) ── */}
        <div className={`${styles.bentoCard} ${styles.colSpan2} ${styles.heroBento}`}>
          <div className={styles.heroContent}>
            <span className={styles.heroGreeting}>{greeting}, {firstName}</span>
            
            <span className={styles.heroBalanceLabel}>Outstanding Balance</span>
            <span className={styles.heroBalance}>{formatCurrency(stats.outstanding)}</span>
          </div>
        </div>

        {/* ── Pipeline Progress Card (Span 2) ── */}
        <div className={`${styles.bentoCard} ${styles.colSpan2} ${styles.pipelineCard}`} onClick={() => router.push('/production')}>
          <div className={styles.pipelineHeader}>
            <span className={styles.pipelineTitle}>{activeOrdersCount} Active Orders</span>
            <FaArrowRight style={{ color: 'var(--sf-text-tertiary)', fontSize: 16 }} />
          </div>
          <div className={styles.pipelineTrack}>
            <div className={styles.pipeCut} style={{ width: `${cutPct}%` }}></div>
            <div className={styles.pipeSew} style={{ width: `${sewPct}%` }}></div>
            <div className={styles.pipeReady} style={{ width: `${readyPct}%` }}></div>
          </div>
          <div className={styles.pipelineLegend}>
            <div className={styles.legendItem}>
              <div className={`${styles.dot} ${styles.dotCut}`}></div>
              {stats.cutting} Cutting
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.dot} ${styles.dotSew}`}></div>
              {stats.sewing} Sewing
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.dot} ${styles.dotReady}`}></div>
              {stats.ready} Ready
            </div>
          </div>
        </div>

        {/* ── Single Stat Bento 1 ── */}
        <div className={styles.bentoCard}>
          <div className={`${styles.bentoIcon} ${styles.iconPurple}`}>
            <FaScissors />
          </div>
          <span className={styles.bentoValue}>{stats.inProgress}</span>
          <span className={styles.bentoLabel}>In Progress</span>
        </div>

        {/* ── Single Stat Bento 2 ── */}
        <div className={styles.bentoCard}>
          <div className={`${styles.bentoIcon} ${styles.iconGreen}`}>
            <FaCircleCheck />
          </div>
          <span className={styles.bentoValue}>{stats.completed}</span>
          <span className={styles.bentoLabel}>Completed</span>
        </div>

      </div>

    </PageLayout>
  );
}
