'use client';

import Image from 'next/image';

import { useData } from '@/contexts/DataContext';
import { useSidebar } from '@/contexts/SidebarContext';
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
  const { openCreateMenu } = useSidebar();
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
      {/* Hero: one dominant focal point instead of four equal-weight cards.
          Uses only tokens already in the app's own two-color system —
          var(--sf-nav), the same dark chrome color already used for
          toasts, and the existing indigo accent — nothing new. */}
      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroIdentity}>
            <span className={styles.heroEyebrow}>Studio Pulse</span>
            <span className={styles.heroShopName}>{currentShop?.name || 'Your Studio'}</span>
          </div>
          <button type="button" className={styles.heroCta} onClick={openCreateMenu}>
            <Symbol name="add" size={18} />
            New Order
          </button>
        </div>

        <div className={styles.heroMain}>
          <div className={styles.heroPrimaryStat}>
            <div className={styles.heroPrimaryLabelRow}>
              <span className={styles.heroPrimaryLabel}>Collected</span>
              <button
                type="button"
                onClick={toggleHideCollected}
                className={styles.heroPrivacyBtn}
                title={hideCollected ? 'Show Balance' : 'Hide Balance'}
              >
                {hideCollected ? <Symbol name="visibility_off" size={16} /> : <Symbol name="visibility" size={16} />}
              </button>
            </div>
            <span className={styles.heroPrimaryValue}>
              {hideCollected ? '******' : formatCurrency(collected, currentShop?.currency)}
            </span>
          </div>

          <div className={styles.heroStatRow}>
            <div className={styles.heroStat}>
              <div className={styles.heroStatLabelRow}>
                <span className={styles.heroStatLabel}>Projected</span>
                <button
                  type="button"
                  onClick={toggleHideProjected}
                  className={styles.heroStatPrivacyBtn}
                  title={hideProjected ? 'Show Balance' : 'Hide Balance'}
                >
                  {hideProjected ? <Symbol name="visibility_off" size={12} /> : <Symbol name="visibility" size={12} />}
                </button>
              </div>
              <span className={styles.heroStatValue}>
                {hideProjected ? '******' : formatCurrency(projected, currentShop?.currency)}
              </span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Overdue</span>
              <span className={`${styles.heroStatValue} ${urgentCount > 0 ? styles.heroStatDanger : ''}`}>
                {urgentCount}
              </span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatLabel}>Due Today</span>
              <span className={`${styles.heroStatValue} ${dueTodayCount > 0 ? styles.heroStatDue : ''}`}>
                {dueTodayCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      <DiscoverBanner onNavigate={onNavigate} />

      <div className={styles.twoCol}>
        <div className={styles.mainCol}>
          <div className={pageStyles.sectionHeader}>
            <span className={pageStyles.sectionTitle}>Team Snapshot</span>
          </div>

          {teamSnapshot.length === 0 ? (
            <div className={pageStyles.emptyState}>
              <Symbol name="group" className={pageStyles.emptyStateIcon} />
              <span>No staff added yet — invite your team to see them here.</span>
              <button
                type="button"
                className={pageStyles.emptyStateAction}
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
