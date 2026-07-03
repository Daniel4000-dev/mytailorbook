'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell, FaTriangleExclamation, FaFireFlameCurved, FaClock, FaCircleCheck } from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { isOverdue } from '@/lib/types';
import { formatDate } from '@/lib/formatters';
import type { Order } from '@/lib/types';
import styles from './NotificationBell.module.css';

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  tone: 'alert' | 'warning' | 'info';
  title: string;
  subtitle: string;
  timestamp: string;
  orderId: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { orders } = useData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const relevantOrders = useMemo(() => {
    if (user?.role === 'Staff') {
      return orders.filter((o) => o.assignedTo === user.uid);
    }
    return orders;
  }, [orders, user]);

  const { notifications, alertCount } = useMemo(() => {
    const items: NotificationItem[] = [];
    const activeOrders = relevantOrders.filter((o) => o.status !== 'Completed' && o.status !== 'Documented');
    const todayStr = new Date().toISOString().split('T')[0];
    const isDueToday = (o: Order) => !!o.dueDate && new Date(o.dueDate).toISOString().split('T')[0] === todayStr;

    activeOrders.forEach((o: Order) => {
      if (isOverdue(o)) {
        items.push({
          id: `overdue-${o.id}`,
          icon: <FaTriangleExclamation />,
          tone: 'alert',
          title: `${o.customerName}'s order is overdue`,
          subtitle: o.dueDate ? `Was due ${new Date(o.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}` : 'No due date set',
          timestamp: o.dueDate || o.updatedAt,
          orderId: o.id,
        });
      } else if (isDueToday(o)) {
        items.push({
          id: `due-${o.id}`,
          icon: <FaClock />,
          tone: 'warning',
          title: `${o.customerName}'s order is due today`,
          subtitle: `Status: ${o.status}`,
          timestamp: o.dueDate || o.updatedAt,
          orderId: o.id,
        });
      } else if (o.priority === 'rush') {
        items.push({
          id: `rush-${o.id}`,
          icon: <FaFireFlameCurved />,
          tone: 'alert',
          title: `${o.customerName}'s order is marked Rush`,
          subtitle: `Status: ${o.status}`,
          timestamp: o.updatedAt,
          orderId: o.id,
        });
      }
    });

    const alertCount = items.length;

    // Recent activity — last status change per order, within the last 3 days.
    // Date.now() is intentionally read fresh on each render so "recent" stays accurate.
    // eslint-disable-next-line react-hooks/purity
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    relevantOrders.forEach((o) => {
      const last = o.statusHistory[o.statusHistory.length - 1];
      if (last && new Date(last.timestamp).getTime() >= threeDaysAgo) {
        items.push({
          id: `activity-${o.id}-${last.timestamp}`,
          icon: <FaCircleCheck />,
          tone: 'info',
          title: `${o.customerName}'s order moved to ${last.to}`,
          subtitle: `By ${last.changedByName}`,
          timestamp: last.timestamp,
          orderId: o.id,
        });
      }
    });

    items.sort((a, b) => {
      const toneRank = { alert: 0, warning: 1, info: 2 };
      if (toneRank[a.tone] !== toneRank[b.tone]) return toneRank[a.tone] - toneRank[b.tone];
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return { notifications: items.slice(0, 12), alertCount };
  }, [relevantOrders]);

  const handleSelect = (orderId: string) => {
    setOpen(false);
    router.push(`/production?order=${orderId}`);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.bellBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        {alertCount > 0 && <span className={styles.badgeCount}>{alertCount}</span>}
        <FaBell className={styles.bellIcon} />
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Notifications</div>
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>You&apos;re all caught up.</div>
          ) : (
            <div className={styles.list}>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`${styles.item} ${styles[n.tone]}`}
                  onClick={() => handleSelect(n.orderId)}
                >
                  <span className={styles.itemIcon}>{n.icon}</span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemSubtitle}>{n.subtitle}</span>
                  </span>
                  <span className={styles.itemTime}>{formatDate(n.timestamp)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
