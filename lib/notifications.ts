import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToShop } from '@/lib/push';

export interface AtelierNotificationPayload {
  shopId: string;
  /** uid of the person who triggered the event; excluded from Web Push so they
   *  don't receive a push for their own action. Pass null for system/cron events. */
  excludeActorId?: string | null;
  /** null = all shop staff (broadcast row); pass a specific uid to address one person. */
  recipientId?: string | null;
  category: 'production' | 'clients' | 'payments' | 'system';
  tone?: 'alert' | 'warning' | 'info';
  actorName?: string;
  actorAvatarUrl?: string;
  badgeIcon?: string;
  badgeBg?: string;
  badgeColor?: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  actionLabel?: string;
  actionHref?: string;
  orderId?: string | null;
  /** Falls back to actionHref when not supplied. */
  pushUrl?: string;
}

/**
 * Persist a notification row in `atelier_notifications` and fire Web Push
 * in the same call. The DB row is the source of truth; push is best-effort.
 *
 * Use this everywhere instead of calling `sendPushToShop` directly so that
 * every event is visible in the real-time notification hub regardless of
 * whether the user has push subscriptions registered.
 */
export async function createAtelierNotification(
  payload: AtelierNotificationPayload,
): Promise<void> {
  const admin = createAdminClient();

  // Persist the notification row (service role bypasses RLS insert restriction).
  const { error } = await admin.from('atelier_notifications').insert({
    shop_id: payload.shopId,
    recipient_id: payload.recipientId ?? null,
    category: payload.category,
    tone: payload.tone ?? 'info',
    actor_name: payload.actorName ?? null,
    actor_avatar_url: payload.actorAvatarUrl ?? null,
    badge_icon: payload.badgeIcon ?? null,
    badge_bg: payload.badgeBg ?? null,
    badge_color: payload.badgeColor ?? null,
    title: payload.title,
    subtitle: payload.subtitle ?? null,
    thumbnail_url: payload.thumbnailUrl ?? null,
    action_label: payload.actionLabel ?? null,
    action_href: payload.actionHref ?? null,
    order_id: payload.orderId ?? null,
  });

  if (error) {
    // Log but do not throw — a missing notification row is better than a
    // failed action (e.g. order status change must not be rolled back because
    // the notification insert fails).
    console.error('[atelier_notifications] insert failed:', error.message);
  }

  // Fire Web Push in parallel; swallow errors — DB row is the source of truth.
  sendPushToShop(
    payload.shopId,
    payload.excludeActorId ?? null,
    {
      title: payload.title,
      body: payload.subtitle ?? '',
      orderId: payload.orderId ?? undefined,
      url: payload.pushUrl ?? payload.actionHref,
    },
  ).catch(() => {});
}

