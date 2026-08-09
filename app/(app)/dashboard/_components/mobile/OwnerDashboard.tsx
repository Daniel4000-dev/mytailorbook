'use client';

import Image from 'next/image';

import { useData } from '@/contexts/DataContext';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import DiscoverCarousel from './DiscoverCarousel';
import styles from '../../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

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

  return (
    <>
      <DiscoverCarousel onNavigate={onNavigate} />

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

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Needs Attention</span>
      </div>

      {visibleAttentionItems.length === 0 ? (
        <div className={styles.emptyState}>
          <Symbol name="check_circle" className={styles.emptyStateIcon} />
          <span>Nothing overdue or rushed — production is on track.</span>
        </div>
      ) : (
        <div className={styles.attentionList}>
          {visibleAttentionItems.map((n) => (
            <button key={n.id} className={styles.attentionRow} onClick={() => onNavigate(`/production?order=${n.orderId}`)} type="button">
              <div className={styles.attentionInfo}>
                <div className={`${styles.attentionAvatar} ${styles[`attentionAvatar_${n.tone}`]}`}>{n.icon}</div>
                <div className={styles.attentionTextGroup}>
                  <span className={styles.attentionCustomer}>{n.title}</span>
                  <span className={styles.attentionDetails}>{n.subtitle}</span>
                </div>
              </div>
            </button>
          ))}
          {hasMoreAttentionItems && (
            <button className={styles.attentionSeeAll} onClick={() => onNavigate('/notifications')} type="button">
              See all notifications
            </button>
          )}
        </div>
      )}
    </>
  );
}
