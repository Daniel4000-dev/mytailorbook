'use client';

import { useMemo } from 'react';
import {
  FaTriangleExclamation,
  FaFireFlameCurved,
  FaClock,
  FaClipboardList,
  FaScissors,
  FaGears,
  FaCircleCheck,
  FaBoxOpen,
  FaRegCommentDots,
  FaSackDollar,
} from 'react-icons/fa6';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { isOverdue, hasUnreadComment } from '@/lib/types';
import type { Order, OrderStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';

/** One icon per production stage — "moved to X" used to show the same
 *  generic checkmark for every stage, which made the activity feed
 *  unreadable at a glance. Mirrors the icon names already assigned to
 *  each stage in STATUS_CONFIG (lib/constants.ts). */
const STAGE_ICON: Record<OrderStatus, React.ReactNode> = {
  Documented: <FaClipboardList />,
  Cutting: <FaScissors />,
  Sewing: <FaGears />,
  Ready: <FaCircleCheck />,
  Completed: <FaBoxOpen />,
};

export interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  tone: 'alert' | 'warning' | 'info';
  title: string;
  subtitle: string;
  timestamp: string;
  orderId: string;
}

/** Single source of truth for notification data, shared by the header
 *  dropdown and the full /notifications page so they never drift out
 *  of sync with each other. */
export function useNotifications() {
  const { user } = useAuth();
  const { orders } = useData();

  const relevantOrders = useMemo(() => {
    if (user?.role === 'Staff') {
      return orders.filter((o) => o.assignedTo === user.uid);
    }
    return orders;
  }, [orders, user]);

  const { notifications, alertCount } = useMemo(() => {
    const items: NotificationItem[] = [];
    const activeOrders = relevantOrders.filter((o) => o.status !== 'Completed');
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
      } else if (o.priority === 'rush' || o.priority === 'urgent') {
        items.push({
          id: `rush-${o.id}`,
          icon: <FaFireFlameCurved />,
          tone: 'alert',
          title: `${o.customerName}'s order is marked ${o.priority === 'rush' ? 'Rush' : 'Urgent'}`,
          subtitle: `Status: ${o.status}`,
          timestamp: o.updatedAt,
          orderId: o.id,
        });
      }
    });

    // A customer comment can land on any order regardless of stage (even
    // a completed one), so this checks every relevant order, not just the
    // active ones above — and it counts toward the badge, since a customer
    // waiting on a reply is exactly a "needs attention" case.
    relevantOrders.forEach((o) => {
      if (hasUnreadComment(o)) {
        items.push({
          id: `comment-${o.id}-${o.lastCommentAt}`,
          icon: <FaRegCommentDots />,
          tone: 'warning',
          title: `${o.customerName} left a comment`,
          subtitle: 'Tap to read and reply',
          timestamp: o.lastCommentAt!,
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
      // Skip your own moves — you don't need to be told about the thing
      // you just did yourself.
      if (last && last.changedBy === user?.uid) return;
      if (last && new Date(last.timestamp).getTime() >= threeDaysAgo) {
        items.push({
          id: `activity-${o.id}-${last.timestamp}`,
          icon: STAGE_ICON[last.to] ?? <FaCircleCheck />,
          tone: 'info',
          title: `${o.customerName}'s order moved to ${last.to}`,
          subtitle: `By ${last.changedByName}`,
          timestamp: last.timestamp,
          orderId: o.id,
        });
      }
    });

    // A payment recorded on an order — same 3-day recency window as the
    // status-change activity above, since both are "things that just
    // happened on this order" rather than "needs attention right now".
    relevantOrders.forEach((o) => {
      const lastPayment = o.payments?.[o.payments.length - 1];
      // Same self-action skip as status moves above.
      if (lastPayment && lastPayment.recordedBy === user?.uid) return;
      if (lastPayment && new Date(lastPayment.timestamp).getTime() >= threeDaysAgo) {
        items.push({
          id: `payment-${o.id}-${lastPayment.id}`,
          icon: <FaSackDollar />,
          tone: 'info',
          title: `Payment recorded for ${o.customerName}'s order`,
          subtitle: `${formatCurrency(lastPayment.amount)} — by ${lastPayment.recordedByName}`,
          timestamp: lastPayment.timestamp,
          orderId: o.id,
        });
      }
    });

    items.sort((a, b) => {
      const toneRank = { alert: 0, warning: 1, info: 2 };
      if (toneRank[a.tone] !== toneRank[b.tone]) return toneRank[a.tone] - toneRank[b.tone];
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return { notifications: items, alertCount };
  }, [relevantOrders, user]);

  return { notifications, alertCount };
}
