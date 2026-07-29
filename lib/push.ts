import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

webpush.setVapidDetails(
  'mailto:support@sabitailors.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  orderId: string;
}

async function sendToSubscription(admin: ReturnType<typeof createAdminClient>, sub: { id: string; endpoint: string; keys: unknown }, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Subscription is gone (uninstalled, permission revoked) — stop
      // trying it again on every future send.
      await admin.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }
}

/** Sends a push notification to every device a specific profile has
 *  subscribed on. Silently does nothing if they have none. */
export async function sendPushToProfile(profileId: string, payload: PushPayload) {
  const admin = createAdminClient();
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, keys').eq('profile_id', profileId);
  if (!subs?.length) return;
  await Promise.all(subs.map((sub) => sendToSubscription(admin, sub, payload)));
}

/** Sends to every active profile in a shop (branch), excluding one actor —
 *  the same self-action-suppression already used for in-app notifications
 *  (see lib/hooks/useNotifications.tsx). */
export async function sendPushToShop(shopId: string, excludeProfileId: string | null, payload: PushPayload) {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from('profiles').select('id').eq('shop_id', shopId).eq('active', true);
  const recipientIds = (profiles || []).map((p) => p.id).filter((id) => id !== excludeProfileId);
  if (!recipientIds.length) return;
  await Promise.all(recipientIds.map((id) => sendPushToProfile(id, payload)));
}
