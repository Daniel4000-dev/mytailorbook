import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { APP_CONFIG } from '@/lib/config';

const DEFAULT_VAPID_PUBLIC_KEY =
  'BN9WicPA4RvCFc77qA6zMf3iNSy8xcnzJ6aUohFL_D94leTxEy4lf5A6TAHb2xGW_RMrgh4T87zkRL-eJ1OR9aY';
const DEFAULT_VAPID_PRIVATE_KEY =
  'nTaiBsfmO8SObuS-Ybp0jGigbNH_w6fIdHOWcSzrf7E';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) return;

  webpush.setVapidDetails(
    `mailto:${APP_CONFIG.supportEmail}`,
    publicKey,
    privateKey
  );
  vapidConfigured = true;
}

interface PushPayload {
  title: string;
  body: string;
  orderId?: string;
  url?: string;
}

async function sendToSubscription(admin: ReturnType<typeof createAdminClient>, sub: { id: string; endpoint: string; keys: unknown }, payload: PushPayload): Promise<{ success: boolean; error?: string }> {
  ensureVapidConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await admin.from('push_subscriptions').delete().eq('id', sub.id);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[WebPush] Error sending notification:', message);
    return { success: false, error: message };
  }
}

export async function sendPushToProfile(profileId: string, payload: PushPayload): Promise<{ success: boolean; sentCount: number; error?: string }> {
  const admin = createAdminClient();
  const { data: subs, error: fetchErr } = await admin.from('push_subscriptions').select('id, endpoint, keys').eq('profile_id', profileId);
  if (fetchErr) {
    console.error('[WebPush] Failed to fetch subscriptions:', fetchErr.message);
    return { success: false, sentCount: 0, error: fetchErr.message };
  }
  if (!subs?.length) {
    return { success: false, sentCount: 0, error: 'No active push subscriptions registered in database' };
  }
  const results = await Promise.all(subs.map((sub) => sendToSubscription(admin, sub, payload)));
  const sentCount = results.filter((r) => r.success).length;
  const firstError = results.find((r) => !r.success)?.error;
  return {
    success: sentCount > 0,
    sentCount,
    error: sentCount === 0 ? (firstError || 'Failed to deliver push notification') : undefined,
  };
}

export async function sendPushToShop(
  shopId: string,
  excludeProfileId: string | null,
  payload: PushPayload
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .eq('shop_id', shopId)
    .or('active.is.null,active.eq.true');
  const recipientIds = (profiles || []).map((p) => p.id).filter((id) => id !== excludeProfileId);
  if (!recipientIds.length) {
    return { success: false, sentCount: 0, error: 'No active staff profiles found for shop' };
  }
  const results = await Promise.all(recipientIds.map((id) => sendPushToProfile(id, payload)));
  const sentCount = results.reduce((sum, r) => sum + (r.sentCount || 0), 0);
  const firstError = results.find((r) => !r.success)?.error;
  return {
    success: sentCount > 0,
    sentCount,
    error: sentCount === 0 ? firstError : undefined,
  };
}
