'use client';

import Image from 'next/image';

import { useData } from '@/contexts/DataContext';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import { useOpenLoops } from '../../_hooks/useOpenLoops';
import DiscoverCarousel from './DiscoverCarousel';
import MilestonesCard from '../MilestonesCard';
import ShopTodayCard from '../ShopTodayCard';
import styles from '../../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import TodaysAgendaWidget from '../TodaysAgendaWidget';

// ============================================================
// Owner Dashboard — mobile
// ============================================================

export default function OwnerDashboard({
  orders,
  staffMembers,
  onNavigate,
}: {
  orders: Order[];
  staffMembers: ReturnType<typeof useData>['staffMembers'];
  onNavigate: (href: string) => void;
}) {
  const { currentShop } = useData();
  const {
    hideCollected,
    hideProjected,
    toggleHideCollected,
    toggleHideProjected,
    collected,
    projected,
    urgentCount,
    dueTodayCount,
    teamSnapshot,
    visibleAttentionItems,
    hasMoreAttentionItems,
  } = useOwnerDashboardData(orders, staffMembers);

  const { customers, exceptions } = useData();
  const openLoops = useOpenLoops(orders, customers, exceptions);

  return (
    <>
      <DiscoverCarousel onNavigate={onNavigate} />

      <TodaysAgendaWidget />

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Overview Analytics</span>
      </div>

      <div className={styles.financeGrid}>
        <div className={`${styles.financeCard} ${styles.collectedCard}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Collected</span>
            <button
              type="button"
              onClick={toggleHideCollected}
              className={styles.cardPrivacyBtn}
              title={hideCollected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideCollected ? <Symbol name="visibility_off" /> : <Symbol name="visibility" />}
            </button>
          </div>
          <span className={styles.cardValue}>
            {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${styles.projectedCard}`}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardLabel}>Projected</span>
            <button
              type="button"
              onClick={toggleHideProjected}
              className={styles.cardPrivacyBtn}
              title={hideProjected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideProjected ? <Symbol name="visibility_off" /> : <Symbol name="visibility" />}
            </button>
          </div>
          <span className={styles.cardValue}>
            {hideProjected ? '******' : formatCurrency(projected, currentShop?.currency)}
          </span>
        </div>

        <div className={`${styles.financeCard} ${urgentCount > 0 ? styles.alertCard : ''}`}>
          <span className={styles.cardLabel}>Overdue</span>
          <span className={styles.cardValue}>{urgentCount}</span>
        </div>
        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <span className={styles.cardLabel}>Due Today</span>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Team Snapshot</span>
      </div>

      {teamSnapshot.length === 0 ? (
        <div className={styles.emptyState}>
          <Symbol name="group" className={styles.emptyStateIcon} />
          <span>No staff added yet — invite your team to see them here.</span>
          <button
            type="button"
            className={styles.emptyStateAction}
            onClick={() => onNavigate('/settings/staff')}
          >
            Invite Team
          </button>
        </div>
      ) : (
      <div className={styles.teamGrid}>
        {teamSnapshot.map(({ staff, active, overdue, completed }) => (
          <button
            key={staff.uid}
            className={styles.teamCard}
            onClick={() => onNavigate(`/production?staff=${staff.uid}`)}
            type="button"
          >
            <div className={styles.teamCardHeader}>
              {staff.avatarUrl ? (
                <Image src={staff.avatarUrl} alt="" width={40} height={40} className={styles.teamAvatarImage} />
              ) : (
                <div className={styles.teamAvatar}>{staff.name[0]}</div>
              )}
              <div className={styles.teamName}>{staff.name}</div>
            </div>
            <div className={styles.teamStatsRow}>
              <div className={styles.teamStat}>
                <span className={styles.teamStatValue}>{active}</span>
                <span className={styles.teamStatLabel}>Active</span>
              </div>
              <div className={styles.teamStat}>
                <span className={`${styles.teamStatValue} ${overdue > 0 ? styles.teamStatAlert : ''}`}>{overdue}</span>
                <span className={styles.teamStatLabel}>Overdue</span>
              </div>
              <div className={styles.teamStat}>
                <span className={styles.teamStatValue}>{completed}</span>
                <span className={styles.teamStatLabel}>Done</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      )}

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Shop Today</span>
      </div>
      <ShopTodayCard loops={openLoops} onNavigate={onNavigate} shop={currentShop} />
      <MilestonesCard />
    </>
  );
}
