'use server';

import { requireAdmin } from '@/lib/admin/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToShop } from '@/lib/push';
import { getLiveEngagementTelemetry } from '@/lib/admin/engagementQueries';
import type { EngagementTelemetry } from '@/lib/admin/engagementTypes';

/**
 * Fetch latest real-time engagement telemetry for auto-refresh or mode filter.
 */
export async function fetchEngagementTelemetryAction(mode?: string): Promise<EngagementTelemetry> {
  await requireAdmin();
  return getLiveEngagementTelemetry(mode);
}

/**
 * Send an instant tailor push nudge or in-app notification directly to a specific shop.
 */
export async function sendTailorNudgeAction(params: {
  shopId: string;
  title: string;
  message: string;
  badgeIcon?: string;
}): Promise<{ success: boolean; error?: string; pushSentCount?: number }> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    const title = params.title.trim();
    const message = params.message.trim();

    if (!title || !message) {
      return { success: false, error: 'Notification title and message are required.' };
    }

    // 1. Insert In-App Notification into atelier_notifications
    const { error: notifError } = await admin.from('atelier_notifications').insert({
      shop_id: params.shopId,
      recipient_id: null, // delivered to entire workshop
      category: 'system',
      tone: 'info',
      actor_name: 'MyStitchBook Control Tower',
      badge_icon: params.badgeIcon || 'notifications_active',
      badge_bg: 'rgba(16, 185, 129, 0.1)',
      badge_color: '#059669',
      title,
      subtitle: message,
      action_label: 'Open Workshop',
      action_href: '/dashboard',
      created_at: new Date().toISOString(),
    });

    if (notifError) {
      console.error('[sendTailorNudgeAction] Notification insert error:', notifError);
    }

    // 2. Dispatch Web Push notification
    let pushSentCount = 0;
    try {
      const res = await sendPushToShop(params.shopId, null, {
        title,
        body: message,
        url: '/dashboard',
      });
      pushSentCount = res.sentCount || 0;
    } catch (pushErr) {
      console.warn('[sendTailorNudgeAction] Web push dispatch warning:', pushErr);
    }

    // 3. Log to audit trail
    try {
      await admin.from('admin_audit_log').insert({
        actor_id: adminUser.userId || null,
        actor_email: adminUser.email || 'admin@mystitchbook.com',
        admin_name: adminUser.name || 'Platform Admin',
        action: 'engagement.nudge_shop',
        target_type: 'shop',
        target_id: params.shopId,
        diff: {
          title,
          message,
          pushSentCount,
        },
      });
    } catch {
      // Graceful fallback
    }

    return {
      success: true,
      pushSentCount,
    };
  } catch (err: unknown) {
    console.error('[sendTailorNudgeAction] Exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send tailor nudge.',
    };
  }
}
