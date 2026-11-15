'use server';

import { requireAdmin } from '@/lib/admin/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToShop } from '@/lib/push';

export type FeatureAudienceTarget =
  | 'all'
  // Feature Used
  | 'used_orders'
  | 'used_measurements'
  | 'used_payments'
  | 'used_expenses'
  | 'used_calendar'
  | 'used_catalogue'
  | 'used_streaks'
  | 'used_circle'
  // Feature Not Used (Nudges & Onboarding)
  | 'unused_orders'
  | 'unused_measurements'
  | 'unused_payments'
  | 'unused_expenses'
  | 'unused_calendar'
  | 'unused_catalogue'
  | 'unused_streaks'
  | 'unused_circle';

export interface BroadcastPayload {
  title: string;
  message: string;
  targetMode: 'all' | 'bespoke' | 'rtw' | 'hybrid';
  targetPlan: 'all' | 'free' | 'premium';
  targetAudience: 'all' | 'owners_only' | 'staff_only';
  targetFeature?: FeatureAudienceTarget;
  tone: 'info' | 'warning' | 'alert';
  actionLabel?: string;
  actionHref?: string;
}

export interface BroadcastResult {
  success: boolean;
  shopsNotified: number;
  recipientsNotified: number;
  pushSentCount: number;
  error?: string;
}

export async function sendBroadcastAction(payload: BroadcastPayload): Promise<BroadcastResult> {
  const adminUser = await requireAdmin();
  const admin = createAdminClient();

  const titleRaw = payload.title.trim();
  const messageRaw = payload.message.trim();

  if (!titleRaw || !messageRaw) {
    return { success: false, shopsNotified: 0, recipientsNotified: 0, pushSentCount: 0, error: 'Title and message are required.' };
  }

  // 1. Query target shops based on mode & plan
  let query = admin.from('shops').select('id, name, business_mode, subscription_status').not('owner_id', 'is', null);

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

  const { data: rawShops, error: shopsError } = await query;

  if (shopsError || !rawShops || rawShops.length === 0) {
    return {
      success: false,
      shopsNotified: 0,
      recipientsNotified: 0,
      pushSentCount: 0,
      error: shopsError?.message || 'No shops matched the target filters.',
    };
  }

  // 1b. Filter by Feature Usage (Used vs Unused)
  let shops = rawShops;

  if (payload.targetFeature && payload.targetFeature !== 'all') {
    const isUsedFilter = payload.targetFeature.startsWith('used_');
    const featureName = payload.targetFeature.replace(/^(used_|unused_)/, '');

    const shopIdsWithFeature = new Set<string>();

    if (featureName === 'orders') {
      const { data: rows } = await admin.from('orders').select('shop_id');
      (rows || []).forEach((r) => r.shop_id && shopIdsWithFeature.add(r.shop_id));
    } else if (featureName === 'measurements') {
      const { data: rows } = await admin
        .from('customers')
        .select('shop_id, measurements, style_measurements');
      (rows || []).forEach((r) => {
        const hasMeasure =
          (r.measurements && Object.keys(r.measurements).length > 0) ||
          (r.style_measurements && Object.keys(r.style_measurements).length > 0);
        if (r.shop_id && hasMeasure) shopIdsWithFeature.add(r.shop_id);
      });
    } else if (featureName === 'payments') {
      const { data: rows } = await admin.from('payments').select('shop_id');
      (rows || []).forEach((r) => r.shop_id && shopIdsWithFeature.add(r.shop_id));
    } else if (featureName === 'expenses') {
      const { data: rows } = await admin.from('expenses').select('shop_id');
      (rows || []).forEach((r) => r.shop_id && shopIdsWithFeature.add(r.shop_id));
    } else if (featureName === 'calendar') {
      const { data: rows } = await admin.from('calendar_events').select('shop_id');
      (rows || []).forEach((r) => r.shop_id && shopIdsWithFeature.add(r.shop_id));
    } else if (featureName === 'catalogue') {
      const { data: rows } = await admin.from('style_catalogues').select('shop_id');
      (rows || []).forEach((r) => r.shop_id && shopIdsWithFeature.add(r.shop_id));
    } else if (featureName === 'streaks') {
      const { data: rows } = await admin
        .from('shops')
        .select('id, streak_current, streak_best');
      (rows || []).forEach((r) => {
        if ((r.streak_current || 0) > 0 || (r.streak_best || 0) > 0) {
          shopIdsWithFeature.add(r.id);
        }
      });
    } else if (featureName === 'circle') {
      const { data: rows } = await admin.from('circle_members').select('shop_id');
      (rows || []).forEach((r) => r.shop_id && shopIdsWithFeature.add(r.shop_id));
    }

    if (isUsedFilter) {
      shops = shops.filter((s) => shopIdsWithFeature.has(s.id));
    } else {
      shops = shops.filter((s) => !shopIdsWithFeature.has(s.id));
    }

    if (shops.length === 0) {
      return {
        success: false,
        shopsNotified: 0,
        recipientsNotified: 0,
        pushSentCount: 0,
        error: isUsedFilter
          ? `No shops have used the ${featureName} feature yet matching your filters.`
          : `All shops have already used the ${featureName} feature matching your filters.`,
      };
    }
  }

  const shopIds = shops.map((s) => s.id);
  const actionHref = payload.actionHref?.trim() || undefined;
  const actionLabel = payload.actionLabel?.trim() || (actionHref ? 'View Details' : undefined);

  // 2. Fetch profiles for targeting (Owners vs Staff vs All)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, shop_id, name, role')
    .in('shop_id', shopIds)
    .or('active.is.null,active.eq.true');

  const shopMap = new Map(shops.map((s) => [s.id, s]));
  const profilesByShop = new Map<string, Array<{ id: string; name: string; role: string }>>();
  for (const p of profiles || []) {
    const list = profilesByShop.get(p.shop_id) || [];
    list.push(p);
    profilesByShop.set(p.shop_id, list);
  }

  const isOwnerTarget = payload.targetAudience === 'owners_only';
  const isStaffTarget = payload.targetAudience === 'staff_only';

  const notificationRows: Array<{
    shop_id: string;
    recipient_id: string | null;
    category: 'system';
    tone: 'info' | 'warning' | 'alert';
    actor_name: string;
    badge_icon: string;
    badge_bg: string;
    badge_color: string;
    title: string;
    subtitle: string;
    action_label: string | null;
    action_href: string | null;
    created_at: string;
  }> = [];

  const recipientProfileIds: string[] = [];

  for (const shop of shops) {
    const shopName = shop.name || 'Your Workshop';
    const shopModeName = shop.business_mode === 'rtw' ? 'Ready-to-Wear' : shop.business_mode === 'hybrid' ? 'Hybrid Fashion' : 'Bespoke';
    const shopStaff = profilesByShop.get(shop.id) || [];

    // Filter staff according to role selection
    const targetStaff = shopStaff.filter((p) => {
      const isOwnerRole = p.role === 'OrgAdmin' || p.role === 'BranchManager' || p.role === 'Owner';
      if (isOwnerTarget) return isOwnerRole;
      if (isStaffTarget) return !isOwnerRole;
      return true;
    });

    if (payload.targetAudience === 'all') {
      // Broadcast row for the entire shop
      const renderedTitle = titleRaw.replace(/\{shop_name\}/gi, shopName).replace(/\{mode\}/gi, shopModeName);
      const renderedMessage = messageRaw
        .replace(/\{shop_name\}/gi, shopName)
        .replace(/\{name\}/gi, 'Tailor')
        .replace(/\{first_name\}/gi, 'Tailor')
        .replace(/\{mode\}/gi, shopModeName);

      notificationRows.push({
        shop_id: shop.id,
        recipient_id: null,
        category: 'system',
        tone: payload.tone,
        actor_name: 'MyStitchBook Team',
        badge_icon: payload.tone === 'alert' ? 'warning' : 'campaign',
        badge_bg: payload.tone === 'alert' ? '#fee2e2' : 'rgba(67, 56, 202, 0.08)',
        badge_color: payload.tone === 'alert' ? '#dc2626' : '#4338ca',
        title: renderedTitle,
        subtitle: renderedMessage,
        action_label: actionLabel ?? null,
        action_href: actionHref ?? null,
        created_at: new Date().toISOString(),
      });

      for (const p of targetStaff) {
        recipientProfileIds.push(p.id);
      }
    } else {
      // Individual personalized row for targeted roles (e.g. Owners only or Staff only)
      for (const person of targetStaff) {
        const personName = person.name || 'Tailor';
        const firstName = personName.split(' ')[0] || personName;

        const renderedTitle = titleRaw
          .replace(/\{shop_name\}/gi, shopName)
          .replace(/\{name\}/gi, personName)
          .replace(/\{first_name\}/gi, firstName)
          .replace(/\{mode\}/gi, shopModeName);

        const renderedMessage = messageRaw
          .replace(/\{shop_name\}/gi, shopName)
          .replace(/\{name\}/gi, personName)
          .replace(/\{first_name\}/gi, firstName)
          .replace(/\{mode\}/gi, shopModeName);

        notificationRows.push({
          shop_id: shop.id,
          recipient_id: person.id,
          category: 'system',
          tone: payload.tone,
          actor_name: 'MyStitchBook Team',
          badge_icon: payload.tone === 'alert' ? 'warning' : 'campaign',
          badge_bg: payload.tone === 'alert' ? '#fee2e2' : 'rgba(67, 56, 202, 0.08)',
          badge_color: payload.tone === 'alert' ? '#dc2626' : '#4338ca',
          title: renderedTitle,
          subtitle: renderedMessage,
          action_label: actionLabel ?? null,
          action_href: actionHref ?? null,
          created_at: new Date().toISOString(),
        });

        recipientProfileIds.push(person.id);
      }
    }
  }

  // Batch insert in chunks of 100 to avoid payload size limits
  const CHUNK_SIZE = 100;
  for (let i = 0; i < notificationRows.length; i += CHUNK_SIZE) {
    const chunk = notificationRows.slice(i, i + CHUNK_SIZE);
    const { error: insertErr } = await admin.from('atelier_notifications').insert(chunk);
    if (insertErr) {
      console.error('[Broadcast] Failed inserting notification batch:', insertErr);
    }
  }

  // 3. Best-effort web push dispatch with personalization
  const { sendPushToProfile } = await import('@/lib/push');
  let totalPushSent = 0;

  for (const row of notificationRows) {
    if (row.recipient_id) {
      try {
        const res = await sendPushToProfile(row.recipient_id, {
          title: row.title,
          body: row.subtitle,
          url: actionHref || '/notifications',
        });
        totalPushSent += res.sentCount || 0;
      } catch {
        // Continue looping
      }
    } else {
      // Shop-wide broadcast push
      try {
        const res = await sendPushToShop(row.shop_id, null, {
          title: row.title,
          body: row.subtitle,
          url: actionHref || '/notifications',
        });
        totalPushSent += res.sentCount || 0;
      } catch {
        // Continue looping
      }
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
        title: titleRaw,
        targetMode: payload.targetMode,
        targetPlan: payload.targetPlan,
        targetAudience: payload.targetAudience,
        targetFeature: payload.targetFeature || 'all',
        shopsCount: shops.length,
        recipientsCount: notificationRows.length,
        pushCount: totalPushSent,
      },
    });
  } catch {
    // Graceful audit fallback
  }

  return {
    success: true,
    shopsNotified: shops.length,
    recipientsNotified: notificationRows.length,
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
    targetAudience: (row.diff as any)?.targetAudience || 'all',
    shopsCount: (row.diff as any)?.shopsCount || 0,
    recipientsCount: (row.diff as any)?.recipientsCount || (row.diff as any)?.shopsCount || 0,
    pushCount: (row.diff as any)?.pushCount || 0,
    createdAt: row.created_at,
  }));
}
