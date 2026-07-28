'use client';

import { useMemo } from 'react';
import { FaTriangleExclamation, FaCircleCheck, FaScissors, FaClipboardList } from 'react-icons/fa6';
import Badge from '@/components/ui/Badge/Badge';
import { isOverdue, isDueSoon } from '@/lib/types';
import { getInitials } from '@/lib/formatters';
import type { Order } from '@/lib/types';
import styles from '../page.module.css';

// ============================================================
// Staff Dashboard
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
  const myOrders = useMemo(() => orders.filter((o) => o.assignedTo === userUid), [orders, userUid]);

  const active = useMemo(
    () => myOrders.filter((o) => o.status === 'Cutting' || o.status === 'Sewing' || o.status === 'Ready').length,
    [myOrders]
  );

  const overdueCount = useMemo(() => myOrders.filter((o) => o.status !== 'Completed' && isOverdue(o)).length, [myOrders]);

  const dueTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return myOrders.filter((o) => {
      if (!o.dueDate || o.status === 'Completed') return false;
      return new Date(o.dueDate).toISOString().split('T')[0] === todayStr;
    }).length;
  }, [myOrders]);

  const completedCount = useMemo(() => myOrders.filter((o) => o.status === 'Completed').length, [myOrders]);

  const myTasks = useMemo(() => {
    return myOrders
      .filter((o) => o.status !== 'Completed')
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
          <span className={styles.cardLabel}>Delivered</span>
          <span className={styles.cardValue}>{completedCount}</span>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          <FaClipboardList style={{ marginRight: 6 }} />
          My Tasks
        </span>
      </div>

      {myTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <FaClipboardList className={styles.emptyStateIcon} />
          <span>No orders assigned to you right now.</span>
        </div>
      ) : (
        <div className={styles.attentionList}>
          {myTasks.map((order) => (
            <button key={order.id} className={styles.attentionRow} onClick={() => onNavigate(`/production?order=${order.id}`)} type="button">
              <div className={styles.attentionInfo}>
                <div className={styles.attentionAvatar}>{getInitials(order.customerName)}</div>
                <div className={styles.attentionTextGroup}>
                  <span className={styles.attentionCustomer}>{order.customerName}</span>
                  <span className={styles.attentionDetails}>{order.orderDetails}</span>
                </div>
              </div>
              <div className={styles.attentionMeta}>
                <Badge variant={order.status.toLowerCase() as 'cutting' | 'sewing' | 'ready' | 'completed'}>
                  {order.status === 'Cutting' ? <FaScissors /> : order.status === 'Ready' ? <FaCircleCheck /> : null}
                  {' '}{order.status}
                </Badge>
                {isOverdue(order) && <Badge variant="default"><FaTriangleExclamation /> Overdue</Badge>}
                {!isOverdue(order) && isDueSoon(order) && <Badge variant="gold">Due Soon</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
