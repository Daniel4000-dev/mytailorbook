import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { APP_CONFIG } from '@/lib/config';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  
  webpush.setVapidDetails(
    `mailto:${APP_CONFIG.supportEmail}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
}

interface PushPayload {
  title: string;
  body: string;
  orderId?: string;
  url?: string;
}

async function sendToSubscription(admin: ReturnType<typeof createAdminClient>, sub: { id: string; endpoint: string; keys: unknown }, payload: PushPayload) {
  ensureVapidConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await admin.from('push_subscriptions').delete().eq('id', sub.id);
    }
  }
}

export async function sendPushToProfile(profileId: string, payload: PushPayload) {
  const admin = createAdminClient();
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, keys').eq('profile_id', profileId);
  if (!subs?.length) return;
  await Promise.all(subs.map((sub) => sendToSubscription(admin, sub, payload)));
}

export async function sendPushToShop(shopId: string, excludeProfileId: string | null, payload: PushPayload) {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from('profiles').select('id').eq('shop_id', shopId).eq('active', true);
  const recipientIds = (profiles || []).map((p) => p.id).filter((id) => id !== excludeProfileId);
  if (!recipientIds.length) return;
  await Promise.all(recipientIds.map((id) => sendPushToProfile(id, payload)));
}
