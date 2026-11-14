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

/**
 * Connect two workshops into a mutual Tailor Circle pod.
 */
export async function adminPairCircleShopsAction(params: {
  shopAId: string;
  shopBId: string;
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    if (!params.shopAId || !params.shopBId) {
      return { success: false, error: 'Both workshops must be selected.' };
    }
    if (params.shopAId === params.shopBId) {
      return { success: false, error: 'Cannot connect a workshop to itself.' };
    }

    const { data: shops } = await admin
      .from('shops')
      .select('id, name')
      .in('id', [params.shopAId, params.shopBId]);

    if (!shops || shops.length < 2) {
      return { success: false, error: 'One or both workshops were not found.' };
    }

    const nameA = shops.find((s) => s.id === params.shopAId)?.name || 'Workshop A';
    const nameB = shops.find((s) => s.id === params.shopBId)?.name || 'Workshop B';

    // 1. Upsert into circle_members (bidirectional)
    try {
      await admin.from('circle_members').upsert([
        { shop_id: params.shopAId, buddy_shop_id: params.shopBId, status: 'active' },
        { shop_id: params.shopBId, buddy_shop_id: params.shopAId, status: 'active' },
      ], { onConflict: 'shop_id, buddy_shop_id' });
    } catch {
      // Graceful fallback if table is not migrated
    }

    // 2. Set shops.buddy_shop_id for backward compatibility
    await admin.from('shops').update({ buddy_shop_id: params.shopBId }).eq('id', params.shopAId);
    await admin.from('shops').update({ buddy_shop_id: params.shopAId }).eq('id', params.shopBId);

    // 3. Log to audit trail
    try {
      await admin.from('admin_audit_log').insert({
        actor_id: adminUser.userId || null,
        actor_email: adminUser.email || 'admin@mystitchbook.com',
        admin_name: adminUser.name || 'Platform Admin',
        action: 'circle.pair_shops',
        target_type: 'circle_pod',
        target_id: `${params.shopAId}:${params.shopBId}`,
        diff: {
          shopAId: params.shopAId,
          shopAName: nameA,
          shopBId: params.shopBId,
          shopBName: nameB,
          note: params.note || null,
        },
      });
    } catch {}

    return { success: true };
  } catch (err) {
    console.error('[adminPairCircleShopsAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to connect workshops into circle.',
    };
  }
}

/**
 * Disconnect/unpair two workshops from a Tailor Circle pod.
 */
export async function adminUnpairCircleShopsAction(params: {
  shopAId: string;
  shopBId: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    // 1. Delete from circle_members
    try {
      await admin
        .from('circle_members')
        .delete()
        .or(`and(shop_id.eq.${params.shopAId},buddy_shop_id.eq.${params.shopBId}),and(shop_id.eq.${params.shopBId},buddy_shop_id.eq.${params.shopAId})`);
    } catch {}

    // 2. Clear legacy buddy_shop_id if pointing to each other
    const { data: shops } = await admin
      .from('shops')
      .select('id, name, buddy_shop_id')
      .in('id', [params.shopAId, params.shopBId]);

    const shopA = shops?.find((s) => s.id === params.shopAId);
    const shopB = shops?.find((s) => s.id === params.shopBId);

    if (shopA?.buddy_shop_id === params.shopBId) {
      await admin.from('shops').update({ buddy_shop_id: null }).eq('id', params.shopAId);
    }
    if (shopB?.buddy_shop_id === params.shopAId) {
      await admin.from('shops').update({ buddy_shop_id: null }).eq('id', params.shopBId);
    }

    // 3. Log to audit trail
    try {
      await admin.from('admin_audit_log').insert({
        actor_id: adminUser.userId || null,
        actor_email: adminUser.email || 'admin@mystitchbook.com',
        admin_name: adminUser.name || 'Platform Admin',
        action: 'circle.unpair_shops',
        target_type: 'circle_pod',
        target_id: `${params.shopAId}:${params.shopBId}`,
        diff: {
          shopAId: params.shopAId,
          shopBId: params.shopBId,
          reason: params.reason || null,
        },
      });
    } catch {}

    return { success: true };
  } catch (err) {
    console.error('[adminUnpairCircleShopsAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to unpair workshops.',
    };
  }
}

/**
 * Toggle sabbatical state for a workshop inside their pod.
 */
export async function adminToggleShopSabbaticalAction(params: {
  shopId: string;
  isSabbatical: boolean;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    // 1. Update circle_members
    try {
      await admin
        .from('circle_members')
        .update({
          status: params.isSabbatical ? 'sabbatical' : 'active',
          sabbatical_reason: params.isSabbatical ? params.reason || 'Resting / Vacation' : null,
          sabbatical_started_at: params.isSabbatical ? new Date().toISOString() : null,
        })
        .eq('shop_id', params.shopId);
    } catch {}

    // 2. Update shops.vacation_mode
    await admin
      .from('shops')
      .update({ vacation_mode: params.isSabbatical })
      .eq('id', params.shopId);

    // 3. Log to audit trail
    try {
      await admin.from('admin_audit_log').insert({
        actor_id: adminUser.userId || null,
        actor_email: adminUser.email || 'admin@mystitchbook.com',
        admin_name: adminUser.name || 'Platform Admin',
        action: 'circle.toggle_sabbatical',
        target_type: 'shop',
        target_id: params.shopId,
        diff: {
          isSabbatical: params.isSabbatical,
          reason: params.reason || null,
        },
      });
    } catch {}

    return { success: true };
  } catch (err) {
    console.error('[adminToggleShopSabbaticalAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to toggle sabbatical.',
    };
  }
}

/**
 * Emergency Freeze Grant: Add 1 or 2 streak freezes to all bespoke workshops (or selected mode).
 */
export async function adminEmergencyStreakFreezeAction(params: {
  freezeCount: number;
  reason: string;
  targetMode?: 'bespoke' | 'all';
}): Promise<{ success: boolean; affectedCount?: number; error?: string }> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    const count = Math.max(1, Math.min(5, Math.floor(params.freezeCount)));
    const reason = params.reason.trim();
    if (!reason) {
      return { success: false, error: 'Reason for emergency streak freeze is required.' };
    }

    let query = admin.from('shops').select('id, name, streak_freezes, business_mode');
    if (params.targetMode !== 'all') {
      query = query.or('business_mode.eq.bespoke,business_mode.is.null');
    }

    const { data: shops, error: fetchErr } = await query;
    if (fetchErr || !shops || shops.length === 0) {
      return { success: false, error: fetchErr?.message || 'No eligible workshops found.' };
    }

    // Apply freeze increments
    let updatedCount = 0;
    for (const shop of shops) {
      const currentFreezes = Number(shop.streak_freezes) || 0;
      const newFreezes = currentFreezes + count;
      const { error: updErr } = await admin
        .from('shops')
        .update({ streak_freezes: newFreezes })
        .eq('id', shop.id);
      if (!updErr) updatedCount++;
    }

    // Log to audit trail
    try {
      await admin.from('admin_audit_log').insert({
        actor_id: adminUser.userId || null,
        actor_email: adminUser.email || 'admin@mystitchbook.com',
        admin_name: adminUser.name || 'Platform Admin',
        action: 'streak.emergency_freeze_grant',
        target_type: 'platform',
        target_id: 'all_shops',
        diff: {
          freezeCount: count,
          reason,
          targetMode: params.targetMode || 'bespoke',
          affectedWorkshops: updatedCount,
        },
      });
    } catch {}

    return { success: true, affectedCount: updatedCount };
  } catch (err) {
    console.error('[adminEmergencyStreakFreezeAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to apply emergency streak freezes.',
    };
  }
}

/**
 * Direct inline adjustment of a shop's streak, freezes, and XP.
 */
export async function adminQuickAdjustStreakAction(params: {
  shopId: string;
  streakCurrent: number;
  streakBest?: number;
  streakFreezes?: number;
  bonusXp?: number;
  note?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    const { data: shop } = await admin
      .from('shops')
      .select('id, name, streak_current, streak_best, streak_freezes, xp')
      .eq('id', params.shopId)
      .single();

    if (!shop) return { success: false, error: 'Shop not found.' };

    const safeCurrent = Math.max(0, Math.floor(params.streakCurrent));
    const currentBest = Number(shop.streak_best) || 0;
    const safeBest = params.streakBest !== undefined ? Math.max(safeCurrent, Math.floor(params.streakBest)) : Math.max(safeCurrent, currentBest);
    const safeFreezes = params.streakFreezes !== undefined ? Math.max(0, Math.floor(params.streakFreezes)) : Number(shop.streak_freezes) || 0;
    const currentXp = Number(shop.xp) || 0;
    const bonusXp = Math.floor(Number(params.bonusXp) || 0);
    const safeXp = Math.max(0, currentXp + bonusXp);

    const { error: updErr } = await admin
      .from('shops')
      .update({
        streak_current: safeCurrent,
        streak_best: safeBest,
        streak_freezes: safeFreezes,
        xp: safeXp,
      })
      .eq('id', shop.id);

    if (updErr) {
      return { success: false, error: updErr.message || 'Failed to update streak.' };
    }

    if (bonusXp !== 0) {
      try {
        await admin.from('xp_ledger').insert({
          shop_id: shop.id,
          amount: bonusXp,
          action_type: bonusXp > 0 ? 'admin_grant' : 'admin_deduction',
          description: params.note ? `Admin Adjustment: ${params.note}` : 'Platform admin craft adjustment',
        });
      } catch {}
    }

    try {
      await admin.from('admin_audit_log').insert({
        actor_id: adminUser.userId || null,
        actor_email: adminUser.email || 'admin@mystitchbook.com',
        admin_name: adminUser.name || 'Platform Admin',
        action: 'streak.admin_adjustment',
        target_type: 'shop',
        target_id: shop.id,
        diff: {
          shopName: shop.name,
          prevStreak: shop.streak_current,
          newStreak: safeCurrent,
          prevBest: shop.streak_best,
          newBest: safeBest,
          prevFreezes: shop.streak_freezes,
          newFreezes: safeFreezes,
          prevXp: currentXp,
          newXp: safeXp,
          note: params.note || null,
        },
      });
    } catch {}

    return {
      success: true,
      message: `Updated ${shop.name}'s streak to ${safeCurrent} days (Best: ${safeBest}, Freezes: ${safeFreezes}, XP: ${safeXp}).`,
    };
  } catch (err) {
    console.error('[adminQuickAdjustStreakAction] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to adjust streak.',
    };
  }
}

