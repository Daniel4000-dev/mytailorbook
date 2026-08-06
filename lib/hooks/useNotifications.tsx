'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { isOverdue, hasUnreadComment, isOwnerLikeRole } from '@/lib/types';
import type { Order, OrderStatus } from '@/lib/types';
import { formatCurrency } from '@/lib/formatters';
import { getPendingStylePhotoSubmissions } from '@/app/actions';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import Symbol from '@/components/ui/Symbol/Symbol';

/** One icon per production stage — "moved to X" used to show the same
 *  generic checkmark for every stage, which made the activity feed
 *  unreadable at a glance. Mirrors the icon names already assigned to
 *  each stage in STATUS_CONFIG (lib/constants.ts). */
const STAGE_ICON: Record<OrderStatus, React.ReactNode> = {
  Documented: <Symbol name="assignment" />,
  Cutting: <Symbol name="content_cut" />,
  Sewing: <Symbol name="settings" />,
  Ready: <Symbol name="check_circle" />,
  Completed: <Symbol name="inventory_2" />,
};

export interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  tone: 'alert' | 'warning' | 'info';
  title: string;
  subtitle: string;
  timestamp: string;
  orderId: string;
  /** Overrides the default /production?order= navigation for items that
   *  aren't about one specific order (e.g. a pending style photo). */
  href?: string;
}

/** Single source of truth for notification data, shared by the header
 *  dropdown and the full /notifications page so they never drift out
 *  of sync with each other. */
export function useNotifications() {
  const { user } = useAuth();
  const { orders, isLoaded } = useData();

  // Owner-only — Staff can't approve these anyway, so there's nothing
  // actionable for them to see. Not revalidated on every focus (matches
  // this app's general "push-based invalidation over polling" preference
  // closely enough — a stale-by-a-minute pending-approval badge is low
  // stakes compared to the order data DataContext already keeps fresh).
  const isOwner = isOwnerLikeRole(user?.role);
  const { data: pendingStylePhotos } = useSWR(
    FEATURE_FLAGS.stylePhotoApprovalNotification && isOwner ? 'pending-style-photo-submissions' : null,
    getPendingStylePhotoSubmissions,
    { dedupingInterval: 60_000 }
  );

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
          icon: <Symbol name="warning" />,
          tone: 'alert',
          title: `${o.customerName}'s order is overdue`,
          subtitle: o.dueDate ? `Was due ${new Date(o.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}` : 'No due date set',
          timestamp: o.dueDate || o.updatedAt,
          orderId: o.id,
        });
      } else if (isDueToday(o)) {
        items.push({
          id: `due-${o.id}`,
          icon: <Symbol name="schedule" />,
          tone: 'warning',
          title: `${o.customerName}'s order is due today`,
          subtitle: `Status: ${o.status}`,
          timestamp: o.dueDate || o.updatedAt,
          orderId: o.id,
        });
      } else if (o.priority === 'rush' || o.priority === 'urgent') {
        items.push({
          id: `rush-${o.id}`,
          icon: <Symbol name="local_fire_department" />,
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
          icon: <Symbol name="chat" />,
          tone: 'warning',
          title: `${o.customerName} left a comment`,
          subtitle: 'Tap to read and reply',
          timestamp: o.lastCommentAt!,
          orderId: o.id,
        });
      }
    });

    // A staff-uploaded style photo awaiting the Owner's approve/discard —
    // a genuine "needs your action" item (only the Owner can act on it),
    // so it gets the same warning tone and Needs Attention visibility as
    // an unread customer comment, not the info-tone "fyi" treatment.
    (pendingStylePhotos || []).forEach((s) => {
      items.push({
        id: `style-photo-${s.id}`,
        icon: <Symbol name="image" />,
        tone: 'warning',
        title: `A photo for "${s.styleName}" needs your approval`,
        subtitle: `Uploaded by ${s.uploadedByName}`,
        timestamp: s.createdAt,
        orderId: '',
        href: `/styles/${encodeURIComponent(s.styleName)}`,
      });
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
          icon: STAGE_ICON[last.to] ?? <Symbol name="check_circle" />,
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
          icon: <Symbol name="payments" />,
          tone: 'info',
          title: `Payment recorded for ${o.customerName}'s order`,
          subtitle: `${formatCurrency(lastPayment.amount)} — by ${lastPayment.recordedByName}`,
          timestamp: lastPayment.timestamp,
          orderId: o.id,
        });
      }
    });

    // A customer clicking "Send a reminder" on the public tracking page —
    // same 3-day recency window as the activity items above. Tone is 'info',
    // not 'warning': like a status move or a payment, this is a point-in-time
    // "something just happened" ping, not an ongoing state the shop owes a
    // fix to (that's what overdue/due-today/rush/unread-comment are for) —
    // so it belongs in the full notification feed, but not the dashboard's
    // short Needs Attention list (see app/(app)/dashboard/page.tsx, which
    // filters this hook's output to tone !== 'info' for that section).
    relevantOrders.forEach((o) => {
      if (o.lastReminderAt && new Date(o.lastReminderAt).getTime() >= threeDaysAgo) {
        items.push({
          id: `reminder-${o.id}-${o.lastReminderAt}`,
          icon: <Symbol name="notifications" />,
          tone: 'info',
          title: `${o.customerName} sent a reminder about their order`,
          subtitle: `Status: ${o.status}`,
          timestamp: o.lastReminderAt,
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
  }, [relevantOrders, user, pendingStylePhotos]);

  return { notifications, alertCount, isLoaded };
}
