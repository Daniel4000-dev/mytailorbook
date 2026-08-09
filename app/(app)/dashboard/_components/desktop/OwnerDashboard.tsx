'use client';

import Image from 'next/image';

import { useData } from '@/contexts/DataContext';
import type { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { useOwnerDashboardData } from '../../_hooks/useOwnerDashboardData';
import DiscoverBanner from './DiscoverBanner';
import pageStyles from '../../page.module.css';
import styles from './OwnerDashboard.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

// ============================================================
// Owner Dashboard — desktop
//
// Same data as mobile (shared via useOwnerDashboardData), laid out for a
// wide, mouse-driven screen instead of a single scrolling card stack:
// Team Snapshot and Needs Attention sit side by side as a real two-column
// dashboard once there's enough width for both to breathe, and the whole
// page is capped to a max content width so it doesn't sprawl edge-to-edge
// on ultra-wide monitors.
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
    <div className={styles.content}>
      <DiscoverBanner onNavigate={onNavigate} />

      <div className={pageStyles.sectionHeader}>
        <span className={pageStyles.sectionTitle}>Overview Analytics</span>
      </div>

      <div className={pageStyles.financeGrid}>
        <div className={`${pageStyles.financeCard} ${pageStyles.collectedCard}`}>
          <div className={pageStyles.cardHeaderRow}>
            <span className={pageStyles.cardLabel}>Collected</span>
            <button
              type="button"
              onClick={toggleHideCollected}
              className={pageStyles.cardPrivacyBtn}
              title={hideCollected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideCollected ? <Symbol name="visibility_off" /> : <Symbol name="visibility" />}
            </button>
          </div>
          <span className={pageStyles.cardValue}>
            {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
          </span>
        </div>

        <div className={`${pageStyles.financeCard} ${pageStyles.projectedCard}`}>
          <div className={pageStyles.cardHeaderRow}>
            <span className={pageStyles.cardLabel}>Projected</span>
            <button
              type="button"
              onClick={toggleHideProjected}
              className={pageStyles.cardPrivacyBtn}
              title={hideProjected ? 'Show Balance' : 'Hide Balance'}
            >
              {hideProjected ? <Symbol name="visibility_off" /> : <Symbol name="visibility" />}
            </button>
          </div>
          <span className={pageStyles.cardValue}>
            {hideProjected ? '******' : formatCurrency(projected, currentShop?.currency)}
          </span>
        </div>

        <div className={`${pageStyles.financeCard} ${urgentCount > 0 ? pageStyles.alertCard : ''}`}>
          <span className={pageStyles.cardLabel}>Overdue</span>
          <span className={pageStyles.cardValue}>{urgentCount}</span>
        </div>
        <div className={`${pageStyles.financeCard} ${dueTodayCount > 0 ? pageStyles.dueCard : ''}`}>
          <span className={pageStyles.cardLabel}>Due Today</span>
          <span className={pageStyles.cardValue}>{dueTodayCount}</span>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.mainCol}>
          <div className={pageStyles.sectionHeader}>
            <span className={pageStyles.sectionTitle}>Team Snapshot</span>
          </div>

          {teamSnapshot.length === 0 ? (
            <div className={pageStyles.emptyState}>
              <Symbol name="group" className={pageStyles.emptyStateIcon} />
              <span>No staff added yet — invite your team from Settings.</span>
            </div>
          ) : (
            <div className={styles.teamGrid}>
              {teamSnapshot.map(({ staff, active, overdue, completed }) => (
                <button
                  key={staff.uid}
                  className={pageStyles.teamCard}
                  onClick={() => onNavigate(`/production?staff=${staff.uid}`)}
                  type="button"
                >
                  <div className={pageStyles.teamCardHeader}>
                    {staff.avatarUrl ? (
                      <Image src={staff.avatarUrl} alt="" width={40} height={40} className={pageStyles.teamAvatarImage} />
                    ) : (
                      <div className={pageStyles.teamAvatar}>{staff.name[0]}</div>
                    )}
                    <div className={pageStyles.teamName}>{staff.name}</div>
                  </div>
                  <div className={pageStyles.teamStatsRow}>
                    <div className={pageStyles.teamStat}>
                      <span className={pageStyles.teamStatValue}>{active}</span>
                      <span className={pageStyles.teamStatLabel}>Active</span>
                    </div>
                    <div className={pageStyles.teamStat}>
                      <span className={`${pageStyles.teamStatValue} ${overdue > 0 ? pageStyles.teamStatAlert : ''}`}>{overdue}</span>
                      <span className={pageStyles.teamStatLabel}>Overdue</span>
                    </div>
                    <div className={pageStyles.teamStat}>
                      <span className={pageStyles.teamStatValue}>{completed}</span>
                      <span className={pageStyles.teamStatLabel}>Done</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.rail}>
          <div className={pageStyles.sectionHeader}>
            <span className={pageStyles.sectionTitle}>Needs Attention</span>
          </div>

          {visibleAttentionItems.length === 0 ? (
            <div className={pageStyles.emptyState}>
              <Symbol name="check_circle" className={pageStyles.emptyStateIcon} />
              <span>Nothing overdue or rushed — production is on track.</span>
            </div>
          ) : (
            <div className={pageStyles.attentionList}>
              {visibleAttentionItems.map((n) => (
                <button key={n.id} className={pageStyles.attentionRow} onClick={() => onNavigate(`/production?order=${n.orderId}`)} type="button">
                  <div className={pageStyles.attentionInfo}>
                    <div className={`${pageStyles.attentionAvatar} ${pageStyles[`attentionAvatar_${n.tone}`]}`}>{n.icon}</div>
                    <div className={pageStyles.attentionTextGroup}>
                      <span className={pageStyles.attentionCustomer}>{n.title}</span>
                      <span className={pageStyles.attentionDetails}>{n.subtitle}</span>
                    </div>
                  </div>
                </button>
              ))}
              {hasMoreAttentionItems && (
                <button className={pageStyles.attentionSeeAll} onClick={() => onNavigate('/notifications')} type="button">
                  See all notifications
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
