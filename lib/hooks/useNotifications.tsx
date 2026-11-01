'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useData } from '@/contexts/DataContext';

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
  return {
    id: row.id as string,
    category: (row.category as NotificationCategory) ?? 'system',
    tone: (row.tone as NotificationItem['tone']) ?? 'info',
    actorName: (row.actor_name as string | null) ?? undefined,
    actorAvatarUrl: (row.actor_avatar_url as string | null) ?? undefined,
    badgeIcon: (row.badge_icon as string | null) ?? undefined,
    badgeBg: (row.badge_bg as string | null) ?? undefined,
    badgeColor: (row.badge_color as string | null) ?? undefined,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? undefined,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? undefined,
    actionLabel: (row.action_label as string | null) ?? undefined,
    actionHref: (row.action_href as string | null) ?? undefined,
    href: (row.action_href as string | null) ?? undefined,
    timestamp: row.created_at as string,
    readAt: (row.read_at as string | null) ?? null,
    orderId: (row.order_id as string | null) ?? undefined,
    isSystem: (row.category as string) === 'system',
  };
}

// ---------------------------------------------------------------------------
// Mock data — shown only for new shops with zero DB rows, so the hub is never
// empty on first launch. Replaced by real data the moment any event fires.
// ---------------------------------------------------------------------------
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'mock-notif-1',
    category: 'clients',
    tone: 'info',
    title: 'Chief Emeka Okonkwo liked Royal Sovereign Agbada in the studio lookbook.',
    subtitle: 'From his saved fitting session',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actorName: 'Chief Emeka Okonkwo',
    badgeIcon: 'favorite',
    badgeBg: '#FEE2E2',
    badgeColor: '#E11D48',
    actionLabel: 'Message',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-2',
    category: 'clients',
    tone: 'info',
    title: 'Senator Adeleke and 2 others sent 4 event lookbook photos.',
    subtitle: 'Wearing Emerald Velvet Tuxedo at the Annual Gala',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    actorName: 'Senator Adeleke',
    badgeIcon: 'photo_camera',
    badgeBg: '#FEF3C7',
    badgeColor: '#D97706',
    actionLabel: 'Review Photos',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-3',
    category: 'production',
    tone: 'info',
    title: "Master Ibrahim completed cutting for Babatunde Cole's Senator Suit.",
    subtitle: 'Awaiting sewing machine allocation',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    actorName: 'Master Ibrahim',
    badgeIcon: 'content_cut',
    badgeBg: '#D1FAE5',
    badgeColor: '#059669',
    actionLabel: 'Assign Tailor',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-4',
    category: 'payments',
    tone: 'info',
    title: "Bank deposit of N450,000 confirmed for Alhaji Dangote's Kaftan.",
    subtitle: 'Access Bank direct settlement verified',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    actorName: 'Access Settlement',
    badgeIcon: 'payments',
    badgeBg: '#ECFDF5',
    badgeColor: '#047857',
    actionLabel: 'View Receipt',
  },
  {
    id: 'mock-notif-5',
    category: 'clients',
    tone: 'warning',
    title: 'Folake Solanke left a fitting note: "Please take in waist 0.5 inch".',
    subtitle: 'From live client tracking portal',
    timestamp: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
    actorName: 'Folake Solanke',
    badgeIcon: 'chat',
    badgeBg: '#E0E7FF',
    badgeColor: '#4F46E5',
    actionLabel: 'Reply',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'mock-notif-6',
    category: 'production',
    tone: 'alert',
    title: "Ambassador Osei's Grand Boubou is overdue by 2 days.",
    subtitle: 'Still in Cutting — due date was Monday',
    timestamp: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(),
    actorName: 'System',
    badgeIcon: 'warning',
    badgeBg: '#FEE2E2',
    badgeColor: '#DC2626',
    actionLabel: 'View Order',
    isSystem: true,
  },
  {
    id: 'mock-notif-7',
    category: 'system',
    tone: 'info',
    title: "Today's Schedule — 3 fittings and 1 new customer intake.",
    subtitle: 'Tap to see your full calendar for today',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    actorName: 'MyStitchBook',
    badgeIcon: 'calendar_today',
    badgeBg: '#EDE9FE',
    badgeColor: '#7C3AED',
    actionLabel: 'Open Calendar',
    actionHref: '/calendar',
    isSystem: true,
  },
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNotifications() {
  const { currentShop } = useData();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!currentShop?.id) return;

    const supabase = createClient();
    let cancelled = false;

    // Initial load — most-recent 100 rows for this shop.
    supabase
      .from('atelier_notifications')
      .select('*')
      .eq('shop_id', currentShop.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data || []).map(mapRowToItem);
        // If the shop has no real notifications yet, seed with immersive mock data
        // so the hub is never blank on first run.
        setNotifications(rows.length > 0 ? rows : MOCK_NOTIFICATIONS);
        setIsLoaded(true);
      });

    // Realtime subscription — instant delivery without polling.
    const channel = supabase
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
          if (cancelled) return;
          setNotifications((prev) => {
            // Guard against duplicate delivery (Supabase Realtime can replay on reconnect).
            if (prev.some((n) => n.id === (payload.new as Record<string, unknown>).id)) return prev;
            return [mapRowToItem(payload.new as Record<string, unknown>), ...prev];
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
          if (cancelled) return;
          const updated = mapRowToItem(payload.new as Record<string, unknown>);
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentShop?.id]);

  // alertCount = unread non-info items (warnings + alerts) — drives the bell badge.
  const alertCount = notifications.filter(
    (n) => n.tone !== 'info' && !n.readAt,
  ).length;

  return { notifications, alertCount, isLoaded };
}
