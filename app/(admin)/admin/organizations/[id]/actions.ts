'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/lib/admin/queries';

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Switch a tailor shop's operating mode between Bespoke, Ready-to-Wear (RTW), and Hybrid.
 */
export async function updateShopBusinessModeAction(params: {
  shopId: string;
  orgId: string;
  mode: 'bespoke' | 'rtw' | 'hybrid';
  note?: string;
}): Promise<ActionResult> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    const { data: shop, error: fetchErr } = await admin
      .from('shops')
      .select('id, name, business_mode')
      .eq('id', params.shopId)
      .maybeSingle();

    if (fetchErr || !shop) {
      return { success: false, error: 'Tailor shop not found.' };
    }

    const prevMode = shop.business_mode || 'bespoke';

    const { error: updateErr } = await admin
      .from('shops')
      .update({ business_mode: params.mode })
      .eq('id', params.shopId);

    if (updateErr) {
      return { success: false, error: updateErr.message || 'Failed to update shop mode.' };
    }

    await logAdminAction({
      adminUserId: adminUser.userId,
      adminName: adminUser.name,
      action: 'update_shop_mode',
      targetType: 'shop',
      targetId: params.shopId,
      diff: {
        shopName: shop.name,
        fromMode: prevMode,
        toMode: params.mode,
        note: params.note || null,
      },
    });

    revalidatePath(`/admin/organizations/${params.orgId}`);
    revalidatePath('/admin/organizations');
    revalidatePath('/admin');

    const modeLabels: Record<string, string> = {
      bespoke: 'Bespoke (Custom Fit)',
      rtw: 'Ready-to-Wear (RTW)',
      hybrid: 'Hybrid (Bespoke & RTW)',
    };

    return {
      success: true,
      message: `Successfully switched ${shop.name} to ${modeLabels[params.mode]}.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

/**
 * Grant or extend a VIP / comped premium subscription for a tailor shop.
 */
export async function grantCompedSubscriptionAction(params: {
  shopId: string;
  orgId: string;
  plan: string;
  durationDays: number;
  reason: string;
}): Promise<ActionResult> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    const { data: shop, error: fetchErr } = await admin
      .from('shops')
      .select('id, name, subscription_status, subscription_plan, current_period_end')
      .eq('id', params.shopId)
      .maybeSingle();

    if (fetchErr || !shop) {
      return { success: false, error: 'Tailor shop not found.' };
    }

    const now = Date.now();
    let baseTime = now;
    if (shop.current_period_end) {
      const existingEnd = new Date(shop.current_period_end).getTime();
      if (existingEnd > now) {
        baseTime = existingEnd;
      }
    }

    const extensionMs = params.durationDays * 24 * 60 * 60 * 1000;
    const newPeriodEnd = new Date(baseTime + extensionMs).toISOString();
    const chosenPlan = params.plan || 'growth';

    const { error: updateErr } = await admin
      .from('shops')
      .update({
        subscription_status: 'active',
        subscription_plan: chosenPlan,
        current_period_end: newPeriodEnd,
        grace_expires_at: null,
      })
      .eq('id', params.shopId);

    if (updateErr) {
      return { success: false, error: updateErr.message || 'Failed to grant subscription override.' };
    }

    // Record billing event for clean financial and audit trail
    await admin.from('subscription_events').insert({
      org_id: params.orgId,
      event_type: 'admin_comped_override',
      status: 'active',
      amount_kobo: 0,
    });

    await logAdminAction({
      adminUserId: adminUser.userId,
      adminName: adminUser.name,
      action: 'grant_comped_subscription',
      targetType: 'shop',
      targetId: params.shopId,
      diff: {
        shopName: shop.name,
        plan: chosenPlan,
        durationDays: params.durationDays,
        previousStatus: shop.subscription_status,
        newPeriodEnd,
        reason: params.reason || 'Admin VIP Grant',
      },
    });

    revalidatePath(`/admin/organizations/${params.orgId}`);
    revalidatePath('/admin/organizations');
    revalidatePath('/admin');

    const formattedDate = new Date(newPeriodEnd).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    return {
      success: true,
      message: `Granted ${params.durationDays} days of ${chosenPlan.toUpperCase()} to ${shop.name} (Valid until ${formattedDate}).`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

/**
 * Revert a tailor shop's subscription back to the Free plan.
 */
export async function revokeSubscriptionAction(params: {
  shopId: string;
  orgId: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    const { data: shop, error: fetchErr } = await admin
      .from('shops')
      .select('id, name, subscription_status, subscription_plan')
      .eq('id', params.shopId)
      .maybeSingle();

    if (fetchErr || !shop) {
      return { success: false, error: 'Tailor shop not found.' };
    }

    const { error: updateErr } = await admin
      .from('shops')
      .update({
        subscription_status: 'free',
        subscription_plan: 'free',
        current_period_end: null,
        grace_expires_at: null,
      })
      .eq('id', params.shopId);

    if (updateErr) {
      return { success: false, error: updateErr.message || 'Failed to revert subscription.' };
    }

    await admin.from('subscription_events').insert({
      org_id: params.orgId,
      event_type: 'admin_subscription_revocation',
      status: 'free',
      amount_kobo: 0,
    });

    await logAdminAction({
      adminUserId: adminUser.userId,
      adminName: adminUser.name,
      action: 'revoke_subscription',
      targetType: 'shop',
      targetId: params.shopId,
      diff: {
        shopName: shop.name,
        fromStatus: shop.subscription_status,
        toStatus: 'free',
        reason: params.reason || 'Admin manual reset to Free plan',
      },
    });

    revalidatePath(`/admin/organizations/${params.orgId}`);
    revalidatePath('/admin/organizations');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Reverted ${shop.name} to the Free plan.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

/**
 * Adjust streak, best streak, freezes, or XP for a tailor shop (e.g. restoring lost streak due to technical glitch).
 */
export async function updateShopStreakAction(params: {
  shopId: string;
  orgId: string;
  streakCurrent: number;
  streakBest?: number;
  streakFreezes?: number;
  bonusXp?: number;
  note?: string;
}): Promise<ActionResult> {
  try {
    const adminUser = await requireAdmin();
    const admin = createAdminClient();

    const { data: shop, error: fetchErr } = await admin
      .from('shops')
      .select('id, name, streak_current, streak_best, streak_freezes, xp')
      .eq('id', params.shopId)
      .maybeSingle();

    if (fetchErr || !shop) {
      return { success: false, error: 'Tailor shop not found.' };
    }

    const safeCurrent = Math.max(0, Math.floor(params.streakCurrent));
    const currentBest = Number(shop.streak_best) || 0;
    const specifiedBest = params.streakBest !== undefined ? Math.max(0, Math.floor(params.streakBest)) : currentBest;
    const safeBest = Math.max(safeCurrent, specifiedBest);

    const safeFreezes =
      params.streakFreezes !== undefined
        ? Math.max(0, Math.floor(params.streakFreezes))
        : Number(shop.streak_freezes) || 0;

    const currentXp = Number(shop.xp) || 0;
    const safeXp =
      params.bonusXp !== undefined
        ? Math.max(0, currentXp + Math.floor(params.bonusXp))
        : currentXp;

    const { error: updateErr } = await admin
      .from('shops')
      .update({
        streak_current: safeCurrent,
        streak_best: safeBest,
        streak_freezes: safeFreezes,
        xp: safeXp,
      })
      .eq('id', params.shopId);

    if (updateErr) {
      return { success: false, error: updateErr.message || 'Failed to update shop streak & stats.' };
    }

    await logAdminAction({
      adminUserId: adminUser.userId,
      adminName: adminUser.name,
      action: 'update_shop_streak',
      targetType: 'shop',
      targetId: params.shopId,
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

    revalidatePath(`/admin/organizations/${params.orgId}`);
    revalidatePath('/admin');

    return {
      success: true,
      message: `Updated ${shop.name}'s streak to ${safeCurrent} days (Best: ${safeBest} days, Freezes: ${safeFreezes}, XP: ${safeXp}).`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}
