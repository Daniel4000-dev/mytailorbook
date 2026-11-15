import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlatformSettings } from './platformSettings';
import type {
  EngagementTelemetry,
  LiveCraftAction,
  AtRiskShop,
  StreakChampion,
  PowerWorkshop,
  TailorCraftCategory,
  CirclePod,
  CirclePodMember,
  CircleTelemetry,
  XpLedgerEntry,
  XpTelemetry,
  AdminShopLookup,
  FeatureUsageTelemetry,
} from './engagementTypes';

/**
 * Human-friendly mapping of raw audit & craft actions into plain tailor workshop milestones.
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
  if (norm.includes('expense') || norm.includes('outflow')) {
    return { label: 'Logged workshop operational expense', category: 'payment', icon: 'receipt_long' };
  }
  if (norm.includes('calendar') || norm.includes('schedule') || norm.includes('appointment')) {
    return { label: 'Scheduled fitting or workshop milestone', category: 'fitting', icon: 'calendar_today' };
  }
  if (norm.includes('catalogue') || norm.includes('lookbook')) {
    return { label: 'Curated digital style lookbook', category: 'system', icon: 'photo_library' };
  }
  if (norm.includes('order_create') || norm.includes('new_order') || norm.includes('intake') || norm.includes('order.created')) {
    return { label: 'Logged new custom garment order', category: 'order', icon: 'checkroom' };
  }
  if (norm.includes('order_stage') || norm.includes('stage_move') || norm.includes('pipeline') || norm.includes('order.updated')) {
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
    // 1. Fetch active profiles and platform settings snapshot
    const [profilesRes, platformSettings] = await Promise.all([
      admin
        .from('profiles')
        .select('id, shop_id, name, role, last_active_at, email')
        .not('last_active_at', 'is', null)
        .gte('last_active_at', monthlyThreshold),
      getPlatformSettings(),
    ]);

    const activeProfiles = profilesRes.data || [];
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
      .select('id, org_id, name, business_mode, subscription_status, streak_current, streak_best, streak_freezes, xp, created_at, owner_id, buddy_shop_id, vacation_mode');

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
    const safeShopIds = shopIds.length > 0 ? shopIds : ['00000000-0000-0000-0000-000000000000'];

    // 3. Scan holistic real craft activity across all tables
    const [
      { data: auditLogs },
      { data: xpLogs },
      { data: recentOrders },
      { data: recentCustomers },
      { data: recentPayments },
      { data: recentExpenses },
      { data: recentCalendar },
      { data: recentCatalogues },
      circleRowsRes,
      xpLedgerRes,
      { data: allOrdersMeta },
      { data: allCustomersMeta },
      { data: allPaymentsMeta },
      { data: allExpensesMeta },
      { data: allCalendarMeta },
      { data: allCataloguesMeta },
    ] = await Promise.all([
      admin
        .from('audit_log')
        .select('id, shop_id, created_at, action, actor_name, entity_type')
        .in('shop_id', safeShopIds)
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('xp_ledger')
        .select('id, shop_id, created_at, action_type, user_id')
        .in('shop_id', safeShopIds)
        .neq('action_type', 'daily_login')
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('orders')
        .select('id, shop_id, customer_name, status, due_date, created_at, updated_at')
        .in('shop_id', safeShopIds)
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(150),
      admin
        .from('customers')
        .select('id, shop_id, name, measurements, style_measurements, created_at, updated_at')
        .in('shop_id', safeShopIds)
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(150),
      admin
        .from('payments')
        .select('id, shop_id, amount, method, created_at')
        .in('shop_id', safeShopIds)
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('expenses')
        .select('id, shop_id, amount, category, description, created_at')
        .in('shop_id', safeShopIds)
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('calendar_events')
        .select('id, shop_id, title, type, date, created_at')
        .in('shop_id', safeShopIds)
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(100),
      admin
        .from('style_catalogues')
        .select('id, shop_id, title, created_at')
        .in('shop_id', safeShopIds)
        .gte('created_at', weeklyThreshold)
        .order('created_at', { ascending: false })
        .limit(50),
      (async () => {
        try {
          const res = await admin
            .from('circle_members')
            .select('shop_id, buddy_shop_id, status, sabbatical_reason, sabbatical_started_at, created_at');
          return res.data || [];
        } catch {
          return [];
        }
      })(),
      (async () => {
        try {
          const res = await admin
            .from('xp_ledger')
            .select('id, shop_id, amount, action_type, description, created_at')
            .order('created_at', { ascending: false })
            .limit(50);
          return res.data || [];
        } catch {
          return [];
        }
      })(),
      // Meta counts for feature usage analytics & power workshops
      admin.from('orders').select('id, shop_id, created_at, status, due_date').in('shop_id', safeShopIds),
      admin.from('customers').select('id, shop_id, created_at, measurements, style_measurements').in('shop_id', safeShopIds),
      admin.from('payments').select('id, shop_id, created_at').in('shop_id', safeShopIds),
      admin.from('expenses').select('id, shop_id, created_at').in('shop_id', safeShopIds),
      admin.from('calendar_events').select('id, shop_id, created_at').in('shop_id', safeShopIds),
      admin.from('style_catalogues').select('id, shop_id, created_at').in('shop_id', safeShopIds),
    ]);

    const circleRows = Array.isArray(circleRowsRes) ? circleRowsRes : [];
    const fullXpLedger = Array.isArray(xpLedgerRes) ? xpLedgerRes : [];

    // Accurate shop order and customer count maps
    const orderCountByShop = new Map<string, number>();
    for (const o of allOrdersMeta || []) {
      if (o.shop_id) {
        orderCountByShop.set(o.shop_id, (orderCountByShop.get(o.shop_id) || 0) + 1);
      }
    }

    const customerCountByShop = new Map<string, number>();
    for (const c of allCustomersMeta || []) {
      if (c.shop_id) {
        customerCountByShop.set(c.shop_id, (customerCountByShop.get(c.shop_id) || 0) + 1);
      }
    }

    // 4. Construct Holistic Live Craft Actions Stream
    const combinedActions: Array<{
      id: string;
      shop_id: string;
      created_at: string;
      action: string;
      actor_name: string;
      entity_type: string;
    }> = [];

    // A. Real orders created
    for (const o of recentOrders || []) {
      if (!o.shop_id) continue;
      combinedActions.push({
        id: `order-created-${o.id}`,
        shop_id: o.shop_id,
        created_at: o.created_at,
        action: 'order.created',
        actor_name: 'Workshop Team',
        entity_type: o.customer_name ? `Client: ${o.customer_name}` : 'Custom Order',
      });
    }

    // B. Real customers registered & measurements logged
    for (const c of recentCustomers || []) {
      if (!c.shop_id) continue;
      combinedActions.push({
        id: `client-reg-${c.id}`,
        shop_id: c.shop_id,
        created_at: c.created_at,
        action: 'customer.registered',
        actor_name: 'Front Desk / Tailor',
        entity_type: c.name ? `Client: ${c.name}` : 'New Client',
      });

      const hasMeasurements =
        (c.measurements && Object.keys(c.measurements).length > 0) ||
        (c.style_measurements && Object.keys(c.style_measurements).length > 0);

      if (hasMeasurements) {
        combinedActions.push({
          id: `measure-logged-${c.id}`,
          shop_id: c.shop_id,
          created_at: c.updated_at || c.created_at,
          action: 'measurement.recorded',
          actor_name: 'Master Tailor',
          entity_type: c.name ? `Measurements: ${c.name}` : 'Body Profile',
        });
      }
    }

    // C. Real payments received
    for (const pay of recentPayments || []) {
      if (!pay.shop_id) continue;
      combinedActions.push({
        id: `pay-${pay.id}`,
        shop_id: pay.shop_id,
        created_at: pay.created_at,
        action: 'payment.received',
        actor_name: 'Cashier / Accountant',
        entity_type: pay.method ? `Method: ${pay.method.toUpperCase()}` : 'Client Payment',
      });
    }

    // D. Real workshop expenses logged
    for (const exp of recentExpenses || []) {
      if (!exp.shop_id) continue;
      combinedActions.push({
        id: `exp-${exp.id}`,
        shop_id: exp.shop_id,
        created_at: exp.created_at,
        action: 'expense.logged',
        actor_name: 'Workshop Manager',
        entity_type: exp.category ? `Category: ${exp.category}` : 'Operational Expense',
      });
    }

    // E. Real calendar events & fittings scheduled
    for (const cal of recentCalendar || []) {
      if (!cal.shop_id) continue;
      combinedActions.push({
        id: `cal-${cal.id}`,
        shop_id: cal.shop_id,
        created_at: cal.created_at,
        action: 'calendar.scheduled',
        actor_name: 'Workshop Staff',
        entity_type: cal.title || 'Workshop Fitting',
      });
    }

    // F. Real style catalogues created
    for (const cat of recentCatalogues || []) {
      if (!cat.shop_id) continue;
      combinedActions.push({
        id: `cat-${cat.id}`,
        shop_id: cat.shop_id,
        created_at: cat.created_at,
        action: 'catalogue.curated',
        actor_name: 'Creative Director',
        entity_type: cat.title || 'Lookbook Album',
      });
    }

    // G. Audit log & XP logs
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

    const liveFeed: LiveCraftAction[] = combinedActions.slice(0, 50).map((row) => {
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

    // 5. Calculate Action Distribution & Power Workshops with Real Actions
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

    // 6. Compute True Power Workshops (including real customerCount and orderCount)
    const powerWorkshops: PowerWorkshop[] = Object.entries(actionCounts)
      .map(([shopId, data]) => {
        const shop = shopMap.get(shopId);
        const breakdown = Object.entries(data.breakdown)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);

        const grade: 'High' | 'Medium' | 'Low' =
          data.total >= 15 ? 'High' : data.total >= 5 ? 'Medium' : 'Low';

        return {
          shopId,
          shopName: shop?.name || 'Tailor Workshop',
          orgId: shop?.org_id || shopId,
          businessMode: (shop?.business_mode as any) || 'bespoke',
          totalActions7d: data.total,
          activityGrade: grade,
          actionBreakdown: breakdown,
          customerCount: customerCountByShop.get(shopId) || 0,
          orderCount: orderCountByShop.get(shopId) || 0,
        };
      })
      .sort((a, b) => b.totalActions7d - a.totalActions7d)
      .slice(0, 20);

    // 7. Calculate At-Risk Shops (Shops with pending orders but no recent activity > 48h)
    const openOrdersByShop = new Map<string, { total: number; overdue: number }>();
    const nowIso = now.toISOString();

    for (const o of allOrdersMeta || []) {
      const isDeliveredOrDone = o.status === 'Completed' || o.status === 'Delivered' || o.status === 'completed' || o.status === 'delivered' || o.status === 'canceled';
      if (isDeliveredOrDone) continue;

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

    // 9. Construct Tailor Circle Pods & Co-Op Telemetry
    const todayStartIso = new Date(now.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString();
    const pairedEdges: Array<{
      shopA: string;
      shopB: string;
      status: string;
      reason?: string;
    }> = [];

    const seenPair = new Set<string>();
    if (circleRows && circleRows.length > 0) {
      for (const r of circleRows) {
        if (!r.shop_id || !r.buddy_shop_id) continue;
        const pairKey = [r.shop_id, r.buddy_shop_id].sort().join(':');
        if (!seenPair.has(pairKey)) {
          seenPair.add(pairKey);
          pairedEdges.push({
            shopA: r.shop_id,
            shopB: r.buddy_shop_id,
            status: r.status || 'active',
            reason: r.sabbatical_reason || undefined,
          });
        }
      }
    }

    // Fallback: check legacy shops.buddy_shop_id
    for (const s of allShops) {
      if (s.buddy_shop_id && s.buddy_shop_id !== s.id) {
        const pairKey = [s.id, s.buddy_shop_id].sort().join(':');
        if (!seenPair.has(pairKey)) {
          seenPair.add(pairKey);
          pairedEdges.push({
            shopA: s.id,
            shopB: s.buddy_shop_id,
            status: s.vacation_mode ? 'sabbatical' : 'active',
          });
        }
      }
    }

    const circlePods: CirclePod[] = [];
    let podIndex = 1;

    for (const edge of pairedEdges) {
      const shopA = shopMap.get(edge.shopA);
      const shopB = shopMap.get(edge.shopB);
      if (!shopA || !shopB) continue;

      const lastActiveA = shopLastActive.get(shopA.id) || null;
      const lastActiveB = shopLastActive.get(shopB.id) || null;

      const isActiveTodayA = Boolean(lastActiveA && lastActiveA >= todayStartIso);
      const isActiveTodayB = Boolean(lastActiveB && lastActiveB >= todayStartIso);

      const isSabbA = Boolean(shopA.vacation_mode || edge.status === 'sabbatical');
      const isSabbB = Boolean(shopB.vacation_mode);

      const memberA: CirclePodMember = {
        shopId: shopA.id,
        shopName: shopA.name || 'Tailor Workshop',
        orgId: shopA.org_id || shopA.id,
        businessMode: (shopA.business_mode as any) || 'bespoke',
        streakCurrent: Number(shopA.streak_current) || 0,
        lastActiveAt: lastActiveA,
        isActiveToday: isActiveTodayA,
        isSabbatical: isSabbA,
        sabbaticalReason: isSabbA ? edge.reason : undefined,
      };

      const memberB: CirclePodMember = {
        shopId: shopB.id,
        shopName: shopB.name || 'Tailor Workshop',
        orgId: shopB.org_id || shopB.id,
        businessMode: (shopB.business_mode as any) || 'bespoke',
        streakCurrent: Number(shopB.streak_current) || 0,
        lastActiveAt: lastActiveB,
        isActiveToday: isActiveTodayB,
        isSabbatical: isSabbB,
      };

      const activeTodayCount = (isActiveTodayA ? 1 : 0) + (isActiveTodayB ? 1 : 0);
      const isCoOpSecuredToday = activeTodayCount >= 2;
      const sharedStreak = Math.max(memberA.streakCurrent, memberB.streakCurrent);

      let podStatus: 'active' | 'partial' | 'sabbatical' | 'dormant' = 'dormant';
      if (isSabbA || isSabbB) {
        podStatus = 'sabbatical';
      } else if (isCoOpSecuredToday) {
        podStatus = 'active';
      } else if (activeTodayCount === 1) {
        podStatus = 'partial';
      }

      circlePods.push({
        id: `pod-${podIndex++}-${shopA.id.slice(0, 4)}-${shopB.id.slice(0, 4)}`,
        members: [memberA, memberB],
        sharedStreak,
        isCoOpSecuredToday,
        status: podStatus,
      });
    }

    const uniquePairedShops = new Set<string>();
    circlePods.forEach((p) => p.members.forEach((m) => uniquePairedShops.add(m.shopId)));

    const circleTelemetry: CircleTelemetry = {
      totalPods: circlePods.length,
      pairedWorkshopsCount: uniquePairedShops.size,
      coOpSecuredTodayCount: circlePods.filter((p) => p.isCoOpSecuredToday).length,
      sabbaticalCount: circlePods.reduce(
        (acc, p) => acc + p.members.filter((m) => m.isSabbatical).length,
        0
      ),
      pods: circlePods,
    };

    // 10. Compute XP & Tier Distribution Telemetry
    let apprenticeCount = 0;
    let artisanCount = 0;
    let seniorCount = 0;
    let masterTailorCount = 0;
    let totalXpCirculating = 0;

    for (const s of allShops) {
      const xp = Number(s.xp) || 0;
      totalXpCirculating += xp;
      if (xp < 500) apprenticeCount++;
      else if (xp < 1500) artisanCount++;
      else if (xp < 3500) seniorCount++;
      else masterTailorCount++;
    }

    const recentXpEntries: XpLedgerEntry[] = fullXpLedger.map((entry: any) => {
      const shop = shopMap.get(entry.shop_id);
      return {
        id: entry.id,
        shopId: entry.shop_id,
        shopName: shop?.name || 'Tailor Workshop',
        orgId: shop?.org_id || entry.shop_id,
        amount: entry.amount,
        actionType: entry.action_type,
        description: entry.description,
        createdAt: entry.created_at,
      };
    });

    const xpTelemetry: XpTelemetry = {
      tierDistribution: {
        apprenticeCount,
        artisanCount,
        seniorCount,
        masterTailorCount,
        totalXpCirculating,
      },
      recentLedger: recentXpEntries,
    };

    // 11. Feature Usage Telemetry — Identify Best & Most-Used Platform Features
    const totalPlatformShops = Math.max(allShops.length, 1);

    // Helper to calculate feature usage metrics
    const computeFeatureStats = (
      featureKey: string,
      name: string,
      description: string,
      icon: string,
      rows: Array<{ shop_id: string; created_at: string }>
    ) => {
      let count7d = 0;
      let count24h = 0;
      const allShopsSet = new Set<string>();
      const shops7dSet = new Set<string>();

      for (const r of rows) {
        if (!r.shop_id) continue;
        allShopsSet.add(r.shop_id);
        if (r.created_at >= weeklyThreshold) {
          count7d++;
          shops7dSet.add(r.shop_id);
        }
        if (r.created_at >= dailyThreshold) {
          count24h++;
        }
      }

      return {
        featureKey,
        name,
        description,
        icon,
        totalUsageAllTime: rows.length,
        usageLast7d: count7d,
        usageLast24h: count24h,
        activeShops7d: shops7dSet.size,
        activeShopsAllTime: allShopsSet.size,
        adoptionRate: Math.round((allShopsSet.size / totalPlatformShops) * 100),
      };
    };

    // Measurements calculation (rows in customers that have measurements)
    const measurementRows: Array<{ shop_id: string; created_at: string }> = [];
    for (const c of allCustomersMeta || []) {
      const hasMeasure =
        (c.measurements && Object.keys(c.measurements).length > 0) ||
        (c.style_measurements && Object.keys(c.style_measurements).length > 0);
      if (hasMeasure) {
        measurementRows.push({ shop_id: c.shop_id, created_at: c.created_at });
      }
    }

    // Daily streak rows
    const streakRows: Array<{ shop_id: string; created_at: string }> = [];
    for (const s of allShops) {
      if ((s.streak_current || 0) > 0 || (s.streak_best || 0) > 0) {
        streakRows.push({ shop_id: s.id, created_at: s.created_at });
      }
    }

    // Circle rows
    const circleMemberRows: Array<{ shop_id: string; created_at: string }> = [];
    for (const cm of circleRows) {
      if (cm.shop_id) {
        circleMemberRows.push({ shop_id: cm.shop_id, created_at: cm.created_at || nowIso });
      }
    }

    const rawFeatures = [
      computeFeatureStats(
        'orders',
        'Garment Orders & Production Pipeline',
        'Tracking custom client orders from cutting, sewing, to fitting and ready for pickup.',
        'checkroom',
        (allOrdersMeta || []).map((o) => ({ shop_id: o.shop_id, created_at: o.created_at }))
      ),
      computeFeatureStats(
        'measurements',
        'Client Body Profiles & Measurements',
        'Saving precise chest, waist, sleeve, and custom style measurement profiles.',
        'straighten',
        measurementRows
      ),
      computeFeatureStats(
        'payments',
        'Invoicing, Receipts & Payments',
        'Logging deposits, bank transfers, POS, and balance settlements from clients.',
        'payments',
        (allPaymentsMeta || []).map((p) => ({ shop_id: p.shop_id, created_at: p.created_at }))
      ),
      computeFeatureStats(
        'expenses',
        'Workshop Expenses & Outflows',
        'Tracking materials, threads, buttons, machine servicing, fuel, and workshop costs.',
        'receipt_long',
        (allExpensesMeta || []).map((e) => ({ shop_id: e.shop_id, created_at: e.created_at }))
      ),
      computeFeatureStats(
        'calendar',
        'Fitting Calendar & Market Runs',
        'Scheduling client fittings, delivery deadlines, and fabric sourcing trips.',
        'calendar_today',
        (allCalendarMeta || []).map((cal) => ({ shop_id: cal.shop_id, created_at: cal.created_at }))
      ),
      computeFeatureStats(
        'catalogue',
        'Digital Style Catalogues & Lookbooks',
        'Showcasing curated garment styles, lookbook photos, and signature designs.',
        'photo_library',
        (allCataloguesMeta || []).map((cat) => ({ shop_id: cat.shop_id, created_at: cat.created_at }))
      ),
      computeFeatureStats(
        'customers',
        'Client Profiles & Contact Directory',
        'Managing client contact details, garment preferences, and communication.',
        'person_add',
        (allCustomersMeta || []).map((c) => ({ shop_id: c.shop_id, created_at: c.created_at }))
      ),
      computeFeatureStats(
        'streaks',
        'Daily Work Streaks & Momentum',
        'Tailor craft consistency tracking and rest-day protection across workshop days.',
        'local_fire_department',
        streakRows
      ),
      computeFeatureStats(
        'circle',
        'Tailor Circle Accountability',
        'Multi-workshop peer accountability pods and shared craft consistency streaks.',
        'groups',
        circleMemberRows
      ),
    ];

    // Compute weekly percent share across all features
    const totalWeeklyActions = rawFeatures.reduce((acc, f) => acc + f.usageLast7d, 0) || 1;

    // Rank features by 7-day usage (primary) and all-time usage (secondary)
    rawFeatures.sort((a, b) => b.usageLast7d - a.usageLast7d || b.totalUsageAllTime - a.totalUsageAllTime);

    const featureTelemetry: FeatureUsageTelemetry[] = rawFeatures.map((f, index) => {
      const rank = index + 1;
      return {
        ...f,
        rank,
        percentShare7d: Math.round((f.usageLast7d / totalWeeklyActions) * 100),
        isTopFeature: rank === 1,
      };
    });

    // 12. All Shops Lookup for Admin Pairings & Quick Controls
    const allShopsList: AdminShopLookup[] = allShops.map((s) => ({
      id: s.id,
      name: s.name || 'Tailor Workshop',
      orgId: s.org_id || s.id,
      businessMode: (s.business_mode as any) || 'bespoke',
      streakCurrent: Number(s.streak_current) || 0,
      streakBest: Number(s.streak_best) || 0,
      streakFreezes: Number(s.streak_freezes) || 0,
      xpPoints: Number(s.xp) || 0,
    }));

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
      circleTelemetry,
      xpTelemetry,
      featureTelemetry,
      isXpSystemPluggedIn: Boolean(platformSettings.featureFlags?.xpSystemEnabled),
      allShopsList,
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
      circleTelemetry: {
        totalPods: 0,
        pairedWorkshopsCount: 0,
        coOpSecuredTodayCount: 0,
        sabbaticalCount: 0,
        pods: [],
      },
      xpTelemetry: {
        tierDistribution: {
          apprenticeCount: 0,
          artisanCount: 0,
          seniorCount: 0,
          masterTailorCount: 0,
          totalXpCirculating: 0,
        },
        recentLedger: [],
      },
      featureTelemetry: [],
      isXpSystemPluggedIn: false,
      allShopsList: [],
      lastRefreshedAt: now.toISOString(),
    };
  }
}
