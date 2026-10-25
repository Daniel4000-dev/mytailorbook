'use client';

import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import Badge from '@/components/ui/Badge/Badge';
import { STATUS_CONFIG } from '@/lib/constants';
import { isOverdue, isDueSoon, CRAFT_ROLE_LABELS } from '@/lib/types';
import { getInitials, formatCurrency } from '@/lib/formatters';
import type { Order } from '@/lib/types';
import styles from '../page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import EmptyState from '@/components/ui/EmptyState/EmptyState';
import TodaysAgendaWidget from './TodaysAgendaWidget';

// ============================================================
// Staff Dashboard — Artisan Workshop Workbench
// ============================================================

export default function StaffDashboard({
  orders,
  userUid,
  onNavigate,
}: {
  orders: Order[];
  userUid?: string;
  onNavigate: (href: string) => void;
}) {
  const { currentShop, staffMembers } = useData();

  const currentStaff = useMemo(
    () => staffMembers.find((s) => s.uid === userUid),
    [staffMembers, userUid]
  );

  const myOrders = useMemo(() => orders.filter((o) => o.assignedTo === userUid), [orders, userUid]);

  const active = useMemo(
    () => myOrders.filter((o) => o.status === 'Cutting' || o.status === 'Sewing' || o.status === 'Ready').length,
    [myOrders]
  );

  const overdueCount = useMemo(() => myOrders.filter((o) => o.status !== 'Delivered' && isOverdue(o)).length, [myOrders]);

  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return myOrders.filter((o) => {
      if (!o.dueDate || o.status === 'Delivered') return false;
      return new Date(o.dueDate).toISOString().split('T')[0] === todayStr;
    }).length;
  }, [myOrders]);

  const completedCount = useMemo(() => myOrders.filter((o) => o.status === 'Delivered').length, [myOrders]);

  // Weekly earnings calculation for piece-rate tailors / cutters
  const oneWeekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const weeklyCompletedOrders = useMemo(() => {
    return myOrders.filter((o) => {
      if (o.status !== 'Ready' && o.status !== 'Delivered') return false;
      return new Date(o.updatedAt) >= oneWeekAgo;
    });
  }, [myOrders, oneWeekAgo]);

  const weeklyEarnings = useMemo(() => {
    if (!currentStaff) return 0;
    if (currentStaff.payrollType === 'piece_rate') {
      return (currentStaff.payrollAmount || 0) * weeklyCompletedOrders.length;
    }
    if (currentStaff.payrollType === 'salary') {
      return currentStaff.payrollAmount || 0;
    }
    return 0;
  }, [currentStaff, weeklyCompletedOrders]);

  const myTasks = useMemo(() => {
    return myOrders
      .filter((o) => o.status !== 'Delivered')
      .sort((a, b) => {
        const aOverdue = isOverdue(a) ? 1 : 0;
        const bOverdue = isOverdue(b) ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        const aRush = a.priority === 'rush' ? 1 : 0;
        const bRush = b.priority === 'rush' ? 1 : 0;
        if (aRush !== bRush) return bRush - aRush;
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      });
  }, [myOrders]);

  return (
    <>
      {/* Artisan Identity & Earnings Pulse */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.05) 0%, rgba(79, 70, 229, 0.08) 100%)',
        border: '1px solid var(--sf-border-light)',
        borderRadius: 'var(--sf-radius-lg)',
        padding: '16px 20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
              {currentStaff?.name || 'Artisan Workbench'}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: currentStaff?.craftRole === 'apprentice' ? '#D97706' : 'var(--sf-accent-indigo, #4F46E5)',
              background: currentStaff?.craftRole === 'apprentice' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(79, 70, 229, 0.08)',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}>
              {CRAFT_ROLE_LABELS[currentStaff?.craftRole || 'general']}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--sf-text-secondary)' }}>
            {currentShop?.name || 'Atelier'} Floor Workbench
          </div>
        </div>

        {currentStaff?.payrollType && currentStaff.payrollType !== 'none' && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Weekly Earnings
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sf-success, #059669)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(weeklyEarnings, currentShop?.currency)}
            </div>
            {currentStaff.payrollType === 'piece_rate' && (
              <div style={{ fontSize: '11px', color: 'var(--sf-text-tertiary)' }}>
                {weeklyCompletedOrders.length} {weeklyCompletedOrders.length === 1 ? 'piece' : 'pieces'} completed
              </div>
            )}
          </div>
        )}
      </div>

      <TodaysAgendaWidget />
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>My Workload</span>
      </div>

      <div className={styles.financeGrid}>
        <div className={styles.financeCard}>
          <span className={styles.cardLabel}>Active Orders</span>
          <span className={styles.cardValue}>{active}</span>
        </div>
        <div className={`${styles.financeCard} ${dueTodayCount > 0 ? styles.dueCard : ''}`}>
          <span className={styles.cardLabel}>Due Today</span>
          <span className={styles.cardValue}>{dueTodayCount}</span>
        </div>
        <div className={`${styles.financeCard} ${overdueCount > 0 ? styles.alertCard : ''}`}>
          <span className={styles.cardLabel}>Overdue</span>
          <span className={styles.cardValue}>{overdueCount}</span>
        </div>
        <div className={styles.financeCard}>
          <span className={styles.cardLabel}>Completed</span>
          <span className={styles.cardValue}>{completedCount}</span>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          <Symbol name="assignment" style={{ marginRight: 6 }} />
          My Assigned Floor Tasks
        </span>
      </div>

      {myTasks.length === 0 ? (
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <EmptyState
            icon={<Symbol name="assignment" size={32} />}
            title="No assigned orders"
            description="No orders currently assigned to your workbench queue."
          />
        </div>
      ) : (
        <div className={styles.attentionList}>
          {myTasks.map((order) => {
            // Anti-poaching protection: protect customer direct contact info
            const displayName = order.customerName
              ? order.customerName.split(' ')[0] + (order.customerName.split(' ')[1] ? ` ${order.customerName.split(' ')[1][0]}.` : '')
              : 'Workshop Client';

            return (
              <button key={order.id} className={styles.attentionRow} onClick={() => onNavigate(`/production?order=${order.id}`)} type="button">
                <div className={styles.attentionInfo}>
                  <div className={styles.attentionAvatar}>{getInitials(displayName)}</div>
                  <div className={styles.attentionTextGroup}>
                    <span className={styles.attentionCustomer}>{displayName}</span>
                    <span className={styles.attentionDetails}>{order.styleName || order.orderDetails}</span>
                  </div>
                </div>
                <div className={styles.attentionMeta}>
                  <Badge variant={order.status.toLowerCase() as 'cutting' | 'sewing' | 'ready' | 'delivered'}>
                    {order.status === 'Cutting' ? <Symbol name="content_cut" /> : order.status === 'Ready' ? <Symbol name="check_circle" /> : null}
                    {' '}{STATUS_CONFIG[order.status].label}
                  </Badge>
                  {isOverdue(order) && <Badge variant="default"><Symbol name="warning" /> Overdue</Badge>}
                  {!isOverdue(order) && isDueSoon(order) && <Badge variant="gold">Due Soon</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
