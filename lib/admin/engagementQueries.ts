import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  EngagementTelemetry,
  LiveCraftAction,
  AtRiskShop,
  StreakChampion,
  PowerWorkshop,
  TailorCraftCategory,
} from './engagementTypes';

/**
 * Human-friendly mapping of raw audit & XP actions into plain tailor workshop milestones.
 */
function translateCraftAction(rawAction: string): {
  label: string;
  category: TailorCraftCategory;
  icon: string;
} {
  const norm = rawAction.toLowerCase();

  if (norm.includes('measure') || norm.includes('body_profile')) {
    return { label: 'Recorded client body measurements', category: 'measurement', icon: 'straighten' };
  }
  if (norm.includes('cutting') || norm.includes('fabric_cut') || norm.includes('chalk')) {
    return { label: 'Chalked and cut fabric pattern', category: 'cutting', icon: 'content_cut' };
  }
  if (norm.includes('sewing') || norm.includes('machine') || norm.includes('stitch')) {
    return { label: 'Sewing garment on workshop table', category: 'sewing', icon: 'needle' };
  }
  if (norm.includes('fitting') || norm.includes('baste')) {
    return { label: 'Prepared garment for fitting consultation', category: 'fitting', icon: 'checkroom' };
  }
  if (norm.includes('ready') || norm.includes('pickup') || norm.includes('iron') || norm.includes('pack')) {
    return { label: 'Finished final quality check & ready for pickup', category: 'pickup', icon: 'task_alt' };
  }
  if (norm.includes('payment') || norm.includes('deposit') || norm.includes('bill')) {
    return { label: 'Recorded client deposit / balance payment', category: 'payment', icon: 'payments' };
  }
  if (norm.includes('order_create') || norm.includes('new_order') || norm.includes('intake')) {
    return { label: 'Logged new custom garment order', category: 'order', icon: 'checkroom' };
  }
  if (norm.includes('order_stage') || norm.includes('stage_move') || norm.includes('pipeline')) {
    return { label: 'Advanced garment production milestone', category: 'order', icon: 'sync' };
  }
  if (norm.includes('customer') || norm.includes('client')) {
    return { label: 'Registered new client profile', category: 'client', icon: 'person_add' };
  }
  if (norm.includes('streak') || norm.includes('freeze') || norm.includes('xp') || norm.includes('daily')) {
    return { label: 'Maintained daily cutting & sewing streak', category: 'streak', icon: 'local_fire_department' };
  }

  return { label: 'Updated workshop craft records', category: 'system', icon: 'notes' };
}

export async function getLiveEngagementTelemetry(modeFilter?: string): Promise<EngagementTelemetry> {
  const admin = createAdminClient();
  const now = new Date();

  // Sliding window thresholds
  const onlineThreshold = new Date(now.getTime() - 15 * 60 * 1000).toISOString(); // 15 mins
  const dailyThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weeklyThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthlyThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const inactiveThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48h

  try {
    // 1. Fetch active profiles
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, shop_id, name, role, last_active_at, email')
      .not('last_active_at', 'is', null)
      .gte('last_active_at', monthlyThreshold);

    const activeProfiles = profiles || [];
    let onlineNow = 0;
    let dailyActive = 0;
    let weeklyActive = 0;
    const monthlyActive = activeProfiles.length;

    const roleCounts: Record<string, number> = {};
    for (const p of activeProfiles) {
      if (!p.last_active_at) continue;
      if (p.last_active_at >= onlineThreshold) onlineNow++;
      if (p.last_active_at >= dailyThreshold) {
        dailyActive++;
        const r = p.role || 'Tailor';
        roleCounts[r] = (roleCounts[r] || 0) + 1;
      }
      if (p.last_active_at >= weeklyThreshold) weeklyActive++;
    }

    const roleEngagement = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    // 2. Fetch all shops with mode & streak info
    let shopsQuery = admin
      .from('shops')
      .select('id, org_id, name, business_mode, subscription_status, streak_current, streak_best, streak_freezes, xp, created_at, owner_id');

    if (modeFilter && modeFilter !== 'all') {
      if (modeFilter === 'bespoke') {
        shopsQuery = shopsQuery.or('business_mode.eq.bespoke,business_mode.is.null');
      } else {
        shopsQuery = shopsQuery.eq('business_mode', modeFilter);
      }
    }

    const { data: shops } = await shopsQuery;
    const allShops = shops || [];
    const shopMap = new Map(allShops.map((s) => [s.id, s]));
    const shopIds = allShops.map((s) => s.id);

    // 3. Fetch recent actions from audit_log and xp_ledger (last 7 days)
    const [{ data: auditLogs }, { data: xpLogs }, { data: openOrders }] = await Promise.all([
      admin
        .from('audit_log')
        .select('id, shop_id, created_at, action, actor_name, entity_type')
        .in('shop_id', shopIds.length > 0 ? shopIds : ['00000000-0000-0000-0000-000000000000'])
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('xp_ledger')
        .select('id, shop_id, created_at, action_type, user_id')
        .in('shop_id', shopIds.length > 0 ? shopIds : ['00000000-0000-0000-0000-000000000000'])
        .neq('action_type', 'daily_login')
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('orders')
        .select('id, shop_id, status, due_date')
        .in('shop_id', shopIds.length > 0 ? shopIds : ['00000000-0000-0000-0000-000000000000'])
        .not('status', 'in', '("completed","delivered","canceled")'),
    ]);

    // 4. Construct Live Craft Actions Stream
    const combinedActions: Array<{
      id: string;
      shop_id: string;
      created_at: string;
      action: string;
      actor_name: string;
      entity_type: string;
    }> = [];

    for (const a of auditLogs || []) {
      if (!a.shop_id) continue;
      combinedActions.push({
        id: a.id || `audit-${Math.random()}`,
        shop_id: a.shop_id,
        created_at: a.created_at,
        action: a.action,
        actor_name: a.actor_name || 'Tailor',
        entity_type: a.entity_type || 'workshop',
      });
    }

    for (const x of xpLogs || []) {
      if (!x.shop_id) continue;
      combinedActions.push({
        id: x.id || `xp-${Math.random()}`,
        shop_id: x.shop_id,
        created_at: x.created_at,
        action: `craft.${x.action_type}`,
        actor_name: 'Workshop Member',
        entity_type: 'craft',
      });
    }

    combinedActions.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    const liveFeed: LiveCraftAction[] = combinedActions.slice(0, 40).map((row) => {
      const shop = shopMap.get(row.shop_id);
      const translated = translateCraftAction(row.action);
      return {
        id: row.id,
        shopId: row.shop_id,
        shopName: shop?.name || 'Tailor Workshop',
        orgId: shop?.org_id || row.shop_id,
        businessMode: (shop?.business_mode as any) || 'bespoke',
        actorName: row.actor_name,
        actionRaw: row.action,
        actionLabel: translated.label,
        category: translated.category,
        categoryIcon: translated.icon,
        details: row.entity_type,
        createdAt: row.created_at,
      };
    });

    // 5. Calculate Action Distribution & Power Workshops
    const actionCounts: Record<string, { total: number; breakdown: Record<string, number> }> = {};
    const globalDist: Record<string, { count: number; label: string }> = {};

    for (const act of combinedActions) {
      if (!act.shop_id) continue;
      if (!actionCounts[act.shop_id]) {
        actionCounts[act.shop_id] = { total: 0, breakdown: {} };
      }
      actionCounts[act.shop_id].total++;

      const translated = translateCraftAction(act.action);
      actionCounts[act.shop_id].breakdown[translated.label] =
        (actionCounts[act.shop_id].breakdown[translated.label] || 0) + 1;

      if (!globalDist[act.action]) {
        globalDist[act.action] = { count: 0, label: translated.label };
      }
      globalDist[act.action].count++;
    }

    const actionDistribution = Object.entries(globalDist)
      .map(([action, meta]) => ({ action, label: meta.label, count: meta.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 6. Compute Power Workshops
    const powerWorkshops: PowerWorkshop[] = Object.entries(actionCounts)
      .map(([shopId, data]) => {
        const shop = shopMap.get(shopId);
        const breakdown = Object.entries(data.breakdown)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);

        const grade: 'High' | 'Medium' | 'Low' =
          data.total >= 20 ? 'High' : data.total >= 5 ? 'Medium' : 'Low';

        return {
          shopId,
          shopName: shop?.name || 'Tailor Workshop',
          orgId: shop?.org_id || shopId,
          businessMode: (shop?.business_mode as any) || 'bespoke',
          totalActions7d: data.total,
          activityGrade: grade,
          actionBreakdown: breakdown,
          customerCount: 0,
          orderCount: 0,
        };
      })
      .sort((a, b) => b.totalActions7d - a.totalActions7d)
      .slice(0, 15);

    // 7. Calculate At-Risk Shops (Shops with pending orders but no recent activity > 48h)
    const openOrdersByShop = new Map<string, { total: number; overdue: number }>();
    const nowIso = now.toISOString();

    for (const o of openOrders || []) {
      const stats = openOrdersByShop.get(o.shop_id) || { total: 0, overdue: 0 };
      stats.total++;
      if (o.due_date && o.due_date < nowIso) {
        stats.overdue++;
      }
      openOrdersByShop.set(o.shop_id, stats);
    }

    // Map shop last activity from profiles
    const shopLastActive = new Map<string, string>();
    for (const p of activeProfiles) {
      if (!p.shop_id || !p.last_active_at) continue;
      const existing = shopLastActive.get(p.shop_id);
      if (!existing || p.last_active_at > existing) {
        shopLastActive.set(p.shop_id, p.last_active_at);
      }
    }

    const atRiskShops: AtRiskShop[] = [];
    for (const shop of allShops) {
      const ordersStats = openOrdersByShop.get(shop.id);
      const lastActive = shopLastActive.get(shop.id);

      // If inactive for > 48h or never logged in, but has pending orders
      const isPastInactive = !lastActive || lastActive < inactiveThreshold;
      const hasOpenOrders = ordersStats && ordersStats.total > 0;

      if (isPastInactive && hasOpenOrders) {
        const daysInactive = lastActive
          ? Math.floor((now.getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((now.getTime() - new Date(shop.created_at).getTime()) / (1000 * 60 * 60 * 24));

        let riskReason = `${ordersStats.total} open garment orders pending without craft activity.`;
        if (ordersStats.overdue > 0) {
          riskReason = `⚠️ ${ordersStats.overdue} orders are OVERDUE and workshop is dormant.`;
        }

        atRiskShops.push({
          shopId: shop.id,
          shopName: shop.name || 'Tailor Workshop',
          orgId: shop.org_id || shop.id,
          businessMode: (shop.business_mode as any) || 'bespoke',
          ownerName: 'Workshop Owner',
          ownerEmail: null,
          subscriptionStatus: shop.subscription_status || 'free',
          lastActiveAt: lastActive ?? null,
          daysInactive: Math.max(daysInactive, 2),
          pendingOrdersCount: ordersStats.total,
          overdueOrdersCount: ordersStats.overdue,
          riskReason,
        });
      }
    }

    atRiskShops.sort((a, b) => b.overdueOrdersCount - a.overdueOrdersCount || b.daysInactive - a.daysInactive);

    // 8. Streak Champions
    const streakChampions: StreakChampion[] = allShops
      .filter((s) => (Number(s.streak_current) || 0) > 0 || (Number(s.streak_best) || 0) > 0)
      .map((s) => ({
        shopId: s.id,
        shopName: s.name || 'Tailor Workshop',
        orgId: s.org_id || s.id,
        businessMode: (s.business_mode as any) || 'bespoke',
        currentStreak: Number(s.streak_current) || 0,
        longestStreak: Number(s.streak_best) || 0,
        freezesRemaining: Number(s.streak_freezes) || 0,
        xpPoints: Number(s.xp) || 0,
        lastActiveAt: shopLastActive.get(s.id) ?? null,
      }))
      .sort((a, b) => b.currentStreak - a.currentStreak || b.xpPoints - a.xpPoints)
      .slice(0, 15);

    const stickinessRatio = monthlyActive > 0 ? Math.round((dailyActive / monthlyActive) * 100) : 0;

    return {
      stickinessRatio,
      onlineNow,
      dailyActive,
      weeklyActive,
      monthlyActive,
      atRiskCount: atRiskShops.length,
      activeStreaksCount: streakChampions.filter((s) => s.currentStreak > 0).length,
      liveFeed,
      atRiskShops: atRiskShops.slice(0, 25),
      streakChampions,
      powerWorkshops,
      roleEngagement,
      actionDistribution,
      lastRefreshedAt: now.toISOString(),
    };
  } catch (err) {
    console.error('[getLiveEngagementTelemetry] Error:', err);
    return {
      stickinessRatio: 0,
      onlineNow: 0,
      dailyActive: 0,
      weeklyActive: 0,
      monthlyActive: 0,
      atRiskCount: 0,
      activeStreaksCount: 0,
      liveFeed: [],
      atRiskShops: [],
      streakChampions: [],
      powerWorkshops: [],
      roleEngagement: [],
      actionDistribution: [],
      lastRefreshedAt: now.toISOString(),
    };
  }
}
