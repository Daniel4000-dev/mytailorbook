import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToShop, sendPushToProfile } from '@/lib/push';

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
): Promise<{ pushSentCount: number; pushError?: string }> {
  const admin = createAdminClient();

  // Guard: if a notification explicitly targets the actor themselves, drop it.
  if (payload.recipientId && payload.excludeActorId && payload.recipientId === payload.excludeActorId) {
    return { pushSentCount: 0 };
  }

  const pushPayload = {
    title: payload.title,
    body: payload.subtitle ?? '',
    orderId: payload.orderId ?? undefined,
    url: payload.pushUrl ?? payload.actionHref,
  };

  // Case 1: Broadcast to shop, but an actor triggered it (e.g. order stage change, payment logged)
  if (!payload.recipientId && payload.excludeActorId) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .eq('shop_id', payload.shopId);

    const otherProfiles = (profiles || []).filter((p) => p.id !== payload.excludeActorId);

    // Solo shop: The person taking the action is the only person in the workshop.
    // They already know what they just did. Suppress self-notification completely.
    if (otherProfiles.length === 0) {
      return { pushSentCount: 0 };
    }

    // Multi-staff workshop: persist notification addressed specifically to other staff members,
    // so the actor's in-app bell drawer does NOT show their own action.
    const rows = otherProfiles.map((p) => ({
      shop_id: payload.shopId,
      recipient_id: p.id,
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
    }));

    const { error } = await admin.from('atelier_notifications').insert(rows);
    if (error) {
      console.error('[atelier_notifications] insert failed:', error.message);
    }

    try {
      const res = await sendPushToShop(
        payload.shopId,
        payload.excludeActorId,
        pushPayload,
      );
      return { pushSentCount: res.sentCount, pushError: res.error };
    } catch (err) {
      console.error('[atelier_notifications] push delivery failed:', err);
      return {
        pushSentCount: 0,
        pushError: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Case 2: System broadcast (excludeActorId is null, e.g. public client reviews) OR targeted recipient
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
    console.error('[atelier_notifications] insert failed:', error.message);
  }

  try {
    if (payload.recipientId) {
      const res = await sendPushToProfile(payload.recipientId, pushPayload);
      return { pushSentCount: res.sentCount, pushError: res.error };
    } else {
      const res = await sendPushToShop(
        payload.shopId,
        payload.excludeActorId ?? null,
        pushPayload,
      );
      return { pushSentCount: res.sentCount, pushError: res.error };
    }
  } catch (err) {
    console.error('[atelier_notifications] push delivery failed:', err);
    return {
      pushSentCount: 0,
      pushError: err instanceof Error ? err.message : String(err),
    };
  }
}

