'use server';

import { requireAdmin } from '@/lib/admin/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToShop } from '@/lib/push';

export interface BroadcastPayload {
  title: string;
  message: string;
  targetMode: 'all' | 'bespoke' | 'rtw' | 'hybrid';
  targetPlan: 'all' | 'free' | 'premium';
  tone: 'info' | 'warning' | 'alert';
  actionLabel?: string;
  actionHref?: string;
}

export interface BroadcastResult {
  success: boolean;
  shopsNotified: number;
  pushSentCount: number;
  error?: string;
}

export async function sendBroadcastAction(payload: BroadcastPayload): Promise<BroadcastResult> {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();

  const title = payload.title.trim();
  const message = payload.message.trim();

  if (!title || !message) {
    return { success: false, shopsNotified: 0, pushSentCount: 0, error: 'Title and message are required.' };
  }

  // 1. Query target shops based on mode & plan
  let query = admin.from('shops').select('id, business_mode, subscription_status').not('owner_id', 'is', null);

  if (payload.targetMode === 'bespoke') {
    query = query.or('business_mode.eq.bespoke,business_mode.is.null');
  } else if (payload.targetMode === 'rtw') {
    query = query.eq('business_mode', 'rtw');
  } else if (payload.targetMode === 'hybrid') {
    query = query.eq('business_mode', 'hybrid');
  }

  if (payload.targetPlan === 'free') {
    query = query.or('subscription_status.eq.free,subscription_status.is.null');
  } else if (payload.targetPlan === 'premium') {
    query = query.in('subscription_status', ['active', 'past_due', 'trialing']);
  }

  const { data: shops, error: shopsError } = await query;

  if (shopsError || !shops || shops.length === 0) {
    return {
      success: false,
      shopsNotified: 0,
      pushSentCount: 0,
      error: shopsError?.message || 'No shops matched the target filters.',
    };
  }

  const actionHref = payload.actionHref?.trim() || undefined;
  const actionLabel = payload.actionLabel?.trim() || (actionHref ? 'View Details' : undefined);

  // 2. Insert notifications for each targeted shop in bulk
  const notificationRows = shops.map((s) => ({
    shop_id: s.id,
    recipient_id: null, // Broadcast to all shop members
    category: 'system' as const,
    tone: payload.tone,
    actor_name: 'MyStitchBook Team',
    badge_icon: payload.tone === 'alert' ? 'warning' : 'campaign',
    badge_bg: payload.tone === 'alert' ? '#fee2e2' : 'rgba(67, 56, 202, 0.08)',
    badge_color: payload.tone === 'alert' ? '#dc2626' : '#4338ca',
    title,
    subtitle: message,
    action_label: actionLabel ?? null,
    action_href: actionHref ?? null,
    created_at: new Date().toISOString(),
  }));

  // Batch insert in chunks of 100 to avoid payload size limits
  const CHUNK_SIZE = 100;
  for (let i = 0; i < notificationRows.length; i += CHUNK_SIZE) {
    const chunk = notificationRows.slice(i, i + CHUNK_SIZE);
    const { error: insertErr } = await admin.from('atelier_notifications').insert(chunk);
    if (insertErr) {
      console.error('[Broadcast] Failed inserting notification batch:', insertErr);
    }
  }

  // 3. Best-effort web push dispatch
  let totalPushSent = 0;
  for (const s of shops) {
    try {
      const res = await sendPushToShop(s.id, null, {
        title,
        body: message,
        url: actionHref || '/notifications',
      });
      totalPushSent += res.sentCount;
    } catch {
      // Best-effort push; continue looping
    }
  }

  // 4. Audit Log Entry
  try {
    await admin.from('admin_audit_log').insert({
      admin_user_id: adminUser.userId,
      admin_name: adminUser.name || adminUser.email || 'Admin',
      action: 'broadcast.dispatch',
      target_type: 'shops',
      target_id: `${shops.length}_shops`,
      diff: {
        title,
        targetMode: payload.targetMode,
        targetPlan: payload.targetPlan,
        shopsCount: shops.length,
        pushCount: totalPushSent,
      },
    });
  } catch {
    // Graceful audit fallback
  }

  return {
    success: true,
    shopsNotified: shops.length,
    pushSentCount: totalPushSent,
  };
}

export async function getRecentBroadcastsAction(limit = 10) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data } = await admin
    .from('admin_audit_log')
    .select('id, admin_name, diff, created_at')
    .eq('action', 'broadcast.dispatch')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map((row) => ({
    id: row.id,
    adminName: row.admin_name,
    title: (row.diff as any)?.title || 'Broadcast Announcement',
    targetMode: (row.diff as any)?.targetMode || 'all',
    targetPlan: (row.diff as any)?.targetPlan || 'all',
    shopsCount: (row.diff as any)?.shopsCount || 0,
    pushCount: (row.diff as any)?.pushCount || 0,
    createdAt: row.created_at,
  }));
}
