'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { isMockDataAllowed } from '@/lib/constants';
import { updateAppBadge } from '@/lib/badging';

export type NotificationCategory = 'production' | 'clients' | 'payments' | 'system';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  tone: 'alert' | 'warning' | 'info';
  actorName?: string;
  actorAvatarUrl?: string;
  /** Symbol name for the overlapping badge in the bottom-right of the avatar circle. */
  badgeIcon?: string;
  badgeBg?: string;
  badgeColor?: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  actionLabel?: string;
  actionHref?: string;
  /** ISO timestamp string */
  timestamp: string;
  readAt?: string | null;
  /** For backward-compat with any consumer that may check orderId for navigation. */
  orderId?: string;
  /** Direct href override (e.g. for style photo submissions). Alias to actionHref. */
  href?: string;
  isSystem?: boolean;
}

// ---------------------------------------------------------------------------
// DB row → app type mapper
// ---------------------------------------------------------------------------
function mapRowToItem(row: Record<string, unknown>): NotificationItem {
  const title = (row.title as string) || 'Atelier Notification';
  return {
    id: (row.id as string) || `notif-${Math.random()}`,
    category: (row.category as NotificationCategory) ?? 'system',
    tone: (row.tone as NotificationItem['tone']) ?? 'info',
    actorName: (row.actor_name as string | null) ?? undefined,
    actorAvatarUrl: (row.actor_avatar_url as string | null) ?? undefined,
    badgeIcon: (row.badge_icon as string | null) ?? undefined,
    badgeBg: (row.badge_bg as string | null) ?? undefined,
    badgeColor: (row.badge_color as string | null) ?? undefined,
    title,
    subtitle: (row.subtitle as string | null) ?? undefined,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? undefined,
    actionLabel: (row.action_label as string | null) ?? undefined,
    actionHref: (row.action_href as string | null) ?? undefined,
    href: (row.action_href as string | null) ?? undefined,
    timestamp: (row.created_at as string) || new Date().toISOString(),
    readAt: (row.read_at as string | null) ?? null,
    orderId: (row.order_id as string | null) ?? undefined,
    isSystem: (row.category as string) === 'system',
  };
}

// ---------------------------------------------------------------------------
// Zero mock data — notification hub displays authentic atelier events only.
// ---------------------------------------------------------------------------
const MOCK_NOTIFICATIONS: NotificationItem[] = [];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNotifications() {
  const { currentShop } = useData();
  const { user } = useAuth();
  const isMockAllowed = isMockDataAllowed(user?.email);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!currentShop?.id) return;

    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

    try {
      const supabase = createClient();

      // Initial load — most-recent 100 rows for this shop.
      Promise.resolve(
        supabase
          .from('atelier_notifications')
          .select('*')
          .eq('shop_id', currentShop.id)
          .order('created_at', { ascending: false })
          .limit(100)
      )
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) {
            setNotifications([]);
            setIsLoaded(true);
            return;
          }
          const rows = (data || []).filter(Boolean).map(mapRowToItem);
          setNotifications(rows);
          setIsLoaded(true);
        })
        .catch(() => {
          if (!cancelled) {
            setNotifications([]);
            setIsLoaded(true);
          }
        });

      // Realtime subscription — instant delivery without polling.
      channel = supabase
        .channel(`atelier-notifications-${currentShop.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'atelier_notifications',
            filter: `shop_id=eq.${currentShop.id}`,
          },
          (payload) => {
            if (cancelled || !payload?.new) return;
            const newRow = payload.new as Record<string, unknown>;
            if (!newRow || typeof newRow !== 'object' || !newRow.id) return;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newRow.id)) return prev;
              return [mapRowToItem(newRow), ...prev];
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'atelier_notifications',
            filter: `shop_id=eq.${currentShop.id}`,
          },
          (payload) => {
            if (cancelled || !payload?.new) return;
            const updatedRow = payload.new as Record<string, unknown>;
            if (!updatedRow || typeof updatedRow !== 'object' || !updatedRow.id) return;
            const updated = mapRowToItem(updatedRow);
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n)),
            );
          },
        )
        .subscribe();
    } catch {
      if (!cancelled) {
        setNotifications(isMockAllowed ? MOCK_NOTIFICATIONS : []);
        setIsLoaded(true);
      }
    }

    return () => {
      cancelled = true;
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [currentShop?.id]);

  // alertCount = unread non-info items (warnings + alerts) — drives the bell badge.
  const alertCount = notifications.filter(
    (n) => n.tone !== 'info' && !n.readAt,
  ).length;

  // Synchronize mobile/desktop app icon badge with pending alert count
  useEffect(() => {
    updateAppBadge(alertCount);
  }, [alertCount]);

  return { notifications, alertCount, isLoaded };
}
