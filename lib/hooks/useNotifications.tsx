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

/** One icon per production stage — mirrors STATUS_CONFIG (lib/constants.ts). */
const STAGE_ICON: Record<OrderStatus, React.ReactNode> = {
  Documented: <Symbol name="assignment" />,
  Cutting: <Symbol name="content_cut" />,
  Sewing: <Symbol name="settings" />,
  Ready: <Symbol name="check_circle" />,
  Delivered: <Symbol name="inventory_2" />,
};

export type NotificationCategory = 'production' | 'clients' | 'payments' | 'system';

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
  /** Categorization for tab filtering */
  category?: NotificationCategory;
  /** Actor / Client / Staff name */
  actorName?: string;
  actorAvatarUrl?: string;
  /** Overlapping circular badge in bottom-right corner of avatar */
  badgeIcon?: string;
  badgeBg?: string;
  badgeColor?: string;
  /** Media preview thumbnail on far right (garment/lookbook/fabric) */
  thumbnailUrl?: string;
  /** Secondary action label e.g. "Message", "Review", "View Order" */
  actionLabel?: string;
  actionHref?: string;
  isSystem?: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'mock-notif-1',
    icon: <Symbol name="favorite" />,
    tone: 'info',
    title: 'Chief Emeka Okonkwo liked Royal Sovereign Agbada in the studio lookbook.',
    subtitle: 'From his saved fitting session',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    orderId: 'mock-ord-1',
    category: 'clients',
    actorName: 'Chief Emeka Okonkwo',
    badgeIcon: 'favorite',
    badgeBg: '#FEE2E2',
    badgeColor: '#E11D48',
    actionLabel: 'Message',
    thumbnailUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-2',
    icon: <Symbol name="photo_camera" />,
    tone: 'info',
    title: 'Senator Adeleke and 2 others sent 4 event lookbook photos.',
    subtitle: 'Wearing Emerald Velvet Tuxedo at the Annual Gala',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    orderId: 'mock-ord-2',
    category: 'clients',
    actorName: 'Senator Adeleke',
    badgeIcon: 'photo_camera',
    badgeBg: '#FEF3C7',
    badgeColor: '#D97706',
    actionLabel: 'Review Photos',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-3',
    icon: <Symbol name="content_cut" />,
    tone: 'info',
    title: 'Master Ibrahim completed cutting for Babatunde Cole’s Senator Suit.',
    subtitle: 'Awaiting sewing machine allocation',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    orderId: 'mock-ord-3',
    category: 'production',
    actorName: 'Master Ibrahim',
    badgeIcon: 'content_cut',
    badgeBg: '#D1FAE5',
    badgeColor: '#059669',
    actionLabel: 'Assign Tailor',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-4',
    icon: <Symbol name="payments" />,
    tone: 'info',
    title: 'Bank deposit of ₦450,000 confirmed for Alhaji Dangote’s Kaftan.',
    subtitle: 'Access Bank direct settlement verified',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    orderId: 'mock-ord-4',
    category: 'payments',
    actorName: 'Access Settlement',
    badgeIcon: 'payments',
    badgeBg: '#ECFDF5',
    badgeColor: '#047857',
    actionLabel: 'View Receipt',
  },
  {
    id: 'mock-notif-5',
    icon: <Symbol name="chat" />,
    tone: 'warning',
    title: 'Folake Solanke left a fitting note: "Please take in waist 0.5 inch".',
    subtitle: 'From live client tracking portal',
    timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    orderId: 'mock-ord-5',
    category: 'clients',
    actorName: 'Folake Solanke',
    badgeIcon: 'chat',
    badgeBg: '#E0E7FF',
    badgeColor: '#4F46E5',
    actionLabel: 'Reply',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-6',
    icon: <Symbol name="auto_awesome" />,
    tone: 'info',
    title: 'Atelier Weekly Telemetry ready: ₦4.85M revenue, 98% on-time rate.',
    subtitle: 'Tap to view financial margin analysis',
    timestamp: new Date(Date.now() - 180 * 60 * 60 * 1000).toISOString(),
    orderId: '',
    href: '/reports',
    category: 'system',
    actorName: 'MyTailorBook Atelier',
    badgeIcon: 'auto_awesome',
    badgeBg: '#F3E8FF',
    badgeColor: '#7E22CE',
    actionLabel: 'Open Reports',
    isSystem: true,
  },
];

/** Single source of truth for notification data, shared by the header
 *  dropdown and the full /notifications page so they never drift out
 *  of sync with each other. */
export function useNotifications() {
  const { user } = useAuth();
  const { orders, customers, isLoaded } = useData();

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
    const activeOrders = relevantOrders.filter((o) => o.status !== 'Delivered');
    const todayStr = new Date().toISOString().split('T')[0];
    const isDueToday = (o: Order) => !!o.dueDate && new Date(o.dueDate).toISOString().split('T')[0] === todayStr;

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
    const tomorrowMMDD = tomorrowStr.substring(5);
    const isDueTomorrow = (o: Order) => !!o.dueDate && new Date(o.dueDate).toISOString().split('T')[0] === tomorrowStr;

    activeOrders.forEach((o: Order) => {
      const thumb = o.images?.[0]?.url || o.inspirationImages?.[0];
      if (isOverdue(o)) {
        items.push({
          id: `overdue-${o.id}`,
          icon: <Symbol name="warning" />,
          tone: 'alert',
          title: `${o.customerName}'s order is overdue`,
          subtitle: o.dueDate ? `Was due ${new Date(o.dueDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}` : 'No due date set',
          timestamp: o.dueDate || o.updatedAt,
          orderId: o.id,
          category: 'production',
          actorName: o.customerName,
          badgeIcon: 'warning',
          badgeBg: '#FEE2E2',
          badgeColor: '#DC2626',
          actionLabel: 'View Order',
          thumbnailUrl: thumb,
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
          category: 'production',
          actorName: o.customerName,
          badgeIcon: 'schedule',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309',
          actionLabel: 'Check Status',
          thumbnailUrl: thumb,
        });
      } else if (isDueTomorrow(o) && (o.status === 'Documented' || o.status === 'Cutting')) {
        items.push({
          id: `stuck-${o.id}`,
          icon: <Symbol name="running_with_errors" />,
          tone: 'warning',
          title: `${o.customerName}'s order is due tomorrow`,
          subtitle: `Still stuck in ${o.status}`,
          timestamp: o.dueDate || o.updatedAt,
          orderId: o.id,
          category: 'production',
          actorName: o.customerName,
          badgeIcon: 'running_with_errors',
          badgeBg: '#FEF3C7',
          badgeColor: '#B45309',
          actionLabel: 'Expedite',
          thumbnailUrl: thumb,
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
          category: 'production',
          actorName: o.customerName,
          badgeIcon: 'local_fire_department',
          badgeBg: '#FEE2E2',
          badgeColor: '#DC2626',
          actionLabel: 'Expedite',
          thumbnailUrl: thumb,
        });
      }
    });

    relevantOrders.forEach((o) => {
      const thumb = o.images?.[0]?.url || o.inspirationImages?.[0];
      if (hasUnreadComment(o)) {
        items.push({
          id: `comment-${o.id}-${o.lastCommentAt}`,
          icon: <Symbol name="chat" />,
          tone: 'warning',
          title: `${o.customerName} left a comment`,
          subtitle: 'Tap to read and reply',
          timestamp: o.lastCommentAt!,
          orderId: o.id,
          category: 'clients',
          actorName: o.customerName,
          badgeIcon: 'chat',
          badgeBg: '#E0E7FF',
          badgeColor: '#4F46E5',
          actionLabel: 'Reply',
          thumbnailUrl: thumb,
        });
      }
    });

    (!pendingStylePhotos || 'error' in pendingStylePhotos ? [] : pendingStylePhotos).forEach((s) => {
      items.push({
        id: `style-photo-${s.id}`,
        icon: <Symbol name="image" />,
        tone: 'warning',
        title: `A photo for "${s.styleName}" needs your approval`,
        subtitle: `Uploaded by ${s.uploadedByName}`,
        timestamp: s.createdAt,
        orderId: '',
        href: `/styles/${encodeURIComponent(s.styleName)}`,
        category: 'clients',
        actorName: s.uploadedByName,
        badgeIcon: 'photo_camera',
        badgeBg: '#FEF3C7',
        badgeColor: '#D97706',
        actionLabel: 'Review',
        thumbnailUrl: s.photoUrl,
      });
    });

    customers.forEach((c) => {
      if (c.birthdate === tomorrowMMDD) {
        items.push({
          id: `birthday-${c.id}`,
          icon: <Symbol name="cake" />,
          tone: 'info',
          title: `${c.fullName}'s birthday is tomorrow!`,
          subtitle: 'Reach out and wish them well.',
          timestamp: new Date().toISOString(),
          orderId: '',
          href: `/customers/${c.id}`,
          category: 'clients',
          actorName: c.fullName,
          badgeIcon: 'cake',
          badgeBg: '#FCE7F3',
          badgeColor: '#DB2777',
          actionLabel: 'Send Wish',
        });
      }
    });

    const alertCount = items.length;

    // eslint-disable-next-line react-hooks/purity
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    relevantOrders.forEach((o) => {
      const last = o.statusHistory[o.statusHistory.length - 1];
      if (last && last.changedBy === user?.uid) return;
      if (last && new Date(last.timestamp).getTime() >= threeDaysAgo) {
        const thumb = o.images?.[0]?.url || o.inspirationImages?.[0];
        items.push({
          id: `activity-${o.id}-${last.timestamp}`,
          icon: STAGE_ICON[last.to] ?? <Symbol name="check_circle" />,
          tone: 'info',
          title: `${o.customerName}'s order moved to ${last.to}`,
          subtitle: `By ${last.changedByName}`,
          timestamp: last.timestamp,
          orderId: o.id,
          category: 'production',
          actorName: last.changedByName,
          badgeIcon: last.to === 'Cutting' ? 'content_cut' : 'check_circle',
          badgeBg: '#D1FAE5',
          badgeColor: '#059669',
          actionLabel: 'View Order',
          thumbnailUrl: thumb,
        });
      }
    });

    relevantOrders.forEach((o) => {
      const lastPayment = o.payments?.[o.payments.length - 1];
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
          category: 'payments',
          actorName: lastPayment.recordedByName,
          badgeIcon: 'payments',
          badgeBg: '#ECFDF5',
          badgeColor: '#047857',
          actionLabel: 'Receipt',
        });
      }
    });

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
          category: 'clients',
          actorName: o.customerName,
          badgeIcon: 'notifications',
          badgeBg: '#FEF3C7',
          badgeColor: '#D97706',
          actionLabel: 'Send WhatsApp',
        });
      }
    });

    // If real items are low, blend mock activity feed to ensure full immersion
    if (items.length < 5) {
      MOCK_NOTIFICATIONS.forEach((mock) => {
        if (!items.some((i) => i.id === mock.id)) {
          items.push(mock);
        }
      });
    }

    items.sort((a, b) => {
      const toneRank = { alert: 0, warning: 1, info: 2 };
      if (toneRank[a.tone] !== toneRank[b.tone]) return toneRank[a.tone] - toneRank[b.tone];
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return { notifications: items, alertCount };
  }, [relevantOrders, user, pendingStylePhotos, customers]);

  return { notifications, alertCount, isLoaded };
}
