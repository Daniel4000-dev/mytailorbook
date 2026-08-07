'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

import { useData } from '@/contexts/DataContext';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { getClientCookie, setClientCookie } from '@/lib/client-cookies';
import { formatCurrency } from '@/lib/formatters';
import { getBalanceOwed, isOverdue } from '@/lib/types';
import type { Order } from '@/lib/types';
import DiscoverCarousel from './DiscoverCarousel';
import styles from '../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';

// ============================================================
// Owner Dashboard
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
  // Persisted across refresh/logout/login — a hidden balance shouldn't
  // reveal itself just because the tab reloaded or the session changed.
  const [hideCollected, setHideCollected] = useState(() => getClientCookie('mtb_hide_collected') === '1');
  const [hideProjected, setHideProjected] = useState(() => getClientCookie('mtb_hide_projected') === '1');

  const toggleHideCollected = () => {
    setHideCollected((prev) => {
      const next = !prev;
      setClientCookie('mtb_hide_collected', next ? '1' : '0');
      return next;
    });
  };
  const toggleHideProjected = () => {
    setHideProjected((prev) => {
      const next = !prev;
      setClientCookie('mtb_hide_projected', next ? '1' : '0');
      return next;
    });
  };

  const collected = useMemo(() => orders.reduce((sum, o) => sum + o.depositPaid, 0), [orders]);

  const projected = useMemo(
    () => orders.filter((o) => o.status !== 'Completed').reduce((sum, o) => sum + getBalanceOwed(o), 0),
    [orders]
  );

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

  const teamSnapshot = useMemo(() => {
    return staffMembers
      .filter((s) => s.role === 'Staff')
      .map((staff) => {
        const assigned = orders.filter((o) => o.assignedTo === staff.uid);
        const active = assigned.filter((o) => o.status === 'Cutting' || o.status === 'Sewing' || o.status === 'Ready').length;
        const overdue = assigned.filter((o) => o.status !== 'Completed' && isOverdue(o)).length;
        const completed = assigned.filter((o) => o.status === 'Completed').length;
        return { staff, active, overdue, completed };
      });
  }, [orders, staffMembers]);

  // Same source as the bell/full Notifications page, so this list can
  // never drift out of sync with what's shown there — just the
  // needs-action tones (alert/warning), capped short so this section
  // can't grow into a second scrolling page on its own; "See all" covers
  // the rest via the real Notifications page instead of listing them here.
  const { notifications } = useNotifications();
  const ATTENTION_LIMIT = 4;
  const attentionItems = useMemo(
    () => notifications.filter((n) => n.tone !== 'info'),
    [notifications]
  );
  const visibleAttentionItems = attentionItems.slice(0, ATTENTION_LIMIT);
  const hasMoreAttentionItems = attentionItems.length > ATTENTION_LIMIT;

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
