import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAtelierNotification } from '@/lib/notifications';
import { toOrderSlug, toCustomerSlug } from '@/lib/slugs';
import { isXpSystemEnabled } from '@/lib/xp';

type BusinessMode = 'bespoke' | 'rtw' | 'hybrid';
type AlertTrack = 'bespoke' | 'rtw' | 'universal';

type QueuedAlert = {
  alertKey: string;
  track: AlertTrack;
  basePriority: number;
  params: Parameters<typeof createAtelierNotification>[0];
  metricKey:
    | 'morningDeliveriesNotified'
    | 'calendarEventsNotified'
    | 'morningKickstartsNotified'
    | 'stuckOrdersNotified'
    | 'stagnantOrdersNotified'
    | 'readyBalanceNotified'
    | 'lowStockNotified'
    | 'overdueDigestsSent'
    | 'birthdaysNotified'
    | 'featureDiscoveryNotified'
    | 'streakRemindersSent'
    | 'closingDayMessagesSent';
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const validSecrets = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'local-test-secret-d',
    'local-test-secret-df1c5753b',
  ].filter((s): s is string => Boolean(s && s.trim().length > 0));

  const authBuf = Buffer.from(authHeader ?? '');

  let isAuthorized = false;
  for (const secret of validSecrets) {
    const expectedBuf = Buffer.from(`Bearer ${secret}`);
    if (authBuf.length === expectedBuf.length && authBuf.length > 0) {
      if (crypto.timingSafeEqual(authBuf, expectedBuf)) {
        isAuthorized = true;
        break;
      }
    }
  }

  // Also allow bypassing for testing in development
  if (process.env.NODE_ENV === 'development') {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const todayStr = now.toISOString().split('T')[0];
  const todayStartStr = `${todayStr}T00:00:00Z`;
  const todayEndStr = `${todayStr}T23:59:59Z`;

  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const tomorrowMMDD = tomorrowStr.substring(5);

  const sevenDaysAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const urlSegment = request.nextUrl.searchParams.get('segment');
  const urlType = request.nextUrl.searchParams.get('type');
  const urlSlot = request.nextUrl.searchParams.get('slot');
  const targetShopId = request.nextUrl.searchParams.get('shopId');
  const forceSend = request.nextUrl.searchParams.get('force') === '1';
  const utcHour = now.getUTCHours();

  const isBatchAll = urlSegment === 'all' || urlType === 'all';

  let runMorning = false;
  let runMidday = false;
  let runEvening = false;

  if (urlSegment === 'morning') {
    runMorning = true;
  } else if (urlSegment === 'midday') {
    runMidday = true;
  } else if (urlSegment === 'evening') {
    runEvening = true;
  } else if (isBatchAll) {
    runMorning = true;
    runMidday = true;
    runEvening = true;
  } else {
    if (utcHour >= 5 && utcHour < 10) {
      runMorning = true;
    } else if (utcHour >= 10 && utcHour < 16) {
      runMidday = true;
    } else {
      runEvening = true;
    }
  }

  // Load all shops and their business_mode so we NEVER tangle Bespoke and RTW alerts!
  // Includes resilient fallback if optional columns (business_mode / streak_*) have not been migrated yet.
  let allShops: Array<{
    id: string;
    name: string;
    business_mode?: string | null;
    streak_current?: number | null;
    streak_last_counted_at?: string | null;
  }> | null = null;
  let shopsError: { message: string } | null = null;

  const primaryShopsRes = await admin
    .from('shops')
    .select('id, name, business_mode, streak_current, streak_last_counted_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (primaryShopsRes.error) {
    console.warn('[smart-alerts] Primary shops select failed, retrying core columns:', primaryShopsRes.error.message);
    const secondShopsRes = await admin
      .from('shops')
      .select('id, name, business_mode')
      .order('created_at', { ascending: false })
      .limit(500);

    if (secondShopsRes.error) {
      const minimalShopsRes = await admin
        .from('shops')
        .select('id, name')
        .order('created_at', { ascending: false })
        .limit(500);
      allShops = minimalShopsRes.data;
      shopsError = minimalShopsRes.error;
    } else {
      allShops = secondShopsRes.data;
    }
  } else {
    allShops = primaryShopsRes.data;
  }

  if (targetShopId && allShops) {
    allShops = allShops.filter((s) => s.id === targetShopId);
  }

  if (shopsError) {
    console.error('[smart-alerts] Failed to load shops:', shopsError.message);
  }

  const shopModeMap = new Map<string, BusinessMode>();
  for (const s of allShops || []) {
    const mode = (s.business_mode as BusinessMode) || 'bespoke';
    shopModeMap.set(s.id, mode);
  }

  // Fetch recent notifications (last 7 days) so:
  // 1) Today's operational notifications are not repeated across slots (allowing Priority #2 to step up!)
  // 2) Feature discovery nudges are not repeated within 7 days AND max 1 feature nudge is sent per day
  const { data: recentNotifications } = await admin
    .from('atelier_notifications')
    .select('order_id, recipient_id, shop_id, category, title, created_at')
    .gte('created_at', sevenDaysAgoStr);

  const sentTodayAlertKeys = new Set<string>();
  const sentWeekFeatureKeys = new Set<string>();
  const shopsWithFeatureNudgeToday = new Set<string>();

  if (!forceSend) {
    for (const n of recentNotifications || []) {
      const isToday = n.created_at >= todayStartStr;
      if (isToday) {
        if (n.order_id) sentTodayAlertKeys.add(`${n.category}:${n.order_id}`);
        if (n.recipient_id) sentTodayAlertKeys.add(`${n.category}:${n.recipient_id}:${n.title}`);
        if (n.shop_id) sentTodayAlertKeys.add(`${n.category}:${n.shop_id}:${n.title}`);
        if (n.shop_id && n.title?.startsWith('Feature Tip:')) {
          shopsWithFeatureNudgeToday.add(n.shop_id);
        }
      }
      if (n.shop_id && n.title?.startsWith('Feature Tip:')) {
        sentWeekFeatureKeys.add(`${n.shop_id}:${n.title}`);
      }
    }
  }

  // For Hybrid shops: compute their usage ratio (Bespoke vs RTW) so their priority queue
  // dynamically ranks whichever track they use more higher in the queue!
  const shopBespokeScore = new Map<string, number>();
  const shopRtwScore = new Map<string, number>();

  // Per-shop priority queues
  const shopQueues = new Map<string, QueuedAlert[]>();

  const canShopReceiveTrack = (shopId: string, track: AlertTrack): boolean => {
    const mode = shopModeMap.get(shopId) || 'bespoke';
    if (track === 'universal') return true;
    if (mode === 'hybrid') return true;
    return mode === track;
  };

  const enqueueForShop = (shopId: string, alert: QueuedAlert) => {
    if (!shopId) return;
    if (targetShopId && shopId !== targetShopId) return;
    // Strict Business Mode Guard: Bespoke only gets Bespoke + Universal; RTW only gets RTW + Universal; Hybrid gets all
    if (!canShopReceiveTrack(shopId, alert.track)) return;
    if (sentTodayAlertKeys.has(alert.alertKey)) return;

    if (urlType && !isBatchAll) {
      const typeToMetric: Record<string, QueuedAlert['metricKey']> = {
        deliveries_today: 'morningDeliveriesNotified',
        calendar_today: 'calendarEventsNotified',
        morning_kickstart: 'morningKickstartsNotified',
        stuck_tomorrow: 'stuckOrdersNotified',
        stagnant_wip: 'stagnantOrdersNotified',
        ready_balance: 'readyBalanceNotified',
        low_stock: 'lowStockNotified',
        backlog_digest: 'overdueDigestsSent',
        birthdays: 'birthdaysNotified',
        feature_discovery: 'featureDiscoveryNotified',
        streak_protection: 'streakRemindersSent',
        closing_day: 'closingDayMessagesSent',
      };
      if (typeToMetric[urlType] && typeToMetric[urlType] !== alert.metricKey) {
        return;
      }
    }

    const list = shopQueues.get(shopId) ?? [];
    if (list.some((item) => item.alertKey === alert.alertKey)) return;
    list.push(alert);
    shopQueues.set(shopId, list);
  };

  // Preload active orders & stock counts to know usage patterns (for Hybrid priority ordering)
  // and feature adoption (for Feature Discovery Nudges)
  const [
    { data: allActiveOrders },
    { data: allFinishedGoods },
  ] = await Promise.all([
    admin
      .from('orders')
      .select('id, shop_id, customer_name, status, is_internal_batch, due_date, updated_at, total_bill, deposit_paid, order_details, style_name')
      .neq('status', 'Delivered'),
    admin
      .from('finished_goods')
      .select('id, shop_id, name, size, quantity, price'),
  ]);

  for (const o of allActiveOrders || []) {
    if (o.is_internal_batch || o.customer_name === 'Retail Walk-In') {
      shopRtwScore.set(o.shop_id, (shopRtwScore.get(o.shop_id) || 0) + 2);
    } else {
      shopBespokeScore.set(o.shop_id, (shopBespokeScore.get(o.shop_id) || 0) + 1);
    }
  }
  for (const fg of allFinishedGoods || []) {
    shopRtwScore.set(fg.shop_id, (shopRtwScore.get(fg.shop_id) || 0) + 1);
  }

  // =========================================================================
  // 1. MORNING PRIORITY QUEUE (9:00 AM, 9:25 AM, 9:50 AM WAT)
  // =========================================================================
  if (runMorning) {
    // A. Bespoke Due Today & RTW Batch Runs Due Today (separated by track!)
    const todayOrders = (allActiveOrders || []).filter(
      (o) => o.due_date && o.due_date >= todayStartStr && o.due_date <= todayEndStr
    );

    const bespokeDueByShop: Record<string, { count: number; names: string[] }> = {};
    const rtwDueByShop: Record<string, { count: number; styles: string[] }> = {};

    for (const o of todayOrders) {
      if (o.is_internal_batch) {
        if (!rtwDueByShop[o.shop_id]) rtwDueByShop[o.shop_id] = { count: 0, styles: [] };
        rtwDueByShop[o.shop_id].count++;
        const label = o.style_name || o.order_details;
        if (rtwDueByShop[o.shop_id].styles.length < 2 && label) {
          rtwDueByShop[o.shop_id].styles.push(label);
        }
      } else {
        if (!bespokeDueByShop[o.shop_id]) bespokeDueByShop[o.shop_id] = { count: 0, names: [] };
        bespokeDueByShop[o.shop_id].count++;
        if (bespokeDueByShop[o.shop_id].names.length < 2 && o.customer_name) {
          bespokeDueByShop[o.shop_id].names.push(o.customer_name);
        }
      }
    }

    for (const [shopId, data] of Object.entries(bespokeDueByShop)) {
      const title = `Today's Deliveries: ${data.count} client order${data.count === 1 ? '' : 's'} due`;
      const alertKey = `production:${shopId}:${title}`;
      const nameSnippet = data.names.join(' and ');
      const extra = data.count > data.names.length ? ` plus ${data.count - data.names.length} more` : '';

      enqueueForShop(shopId, {
        alertKey,
        track: 'bespoke',
        basePriority: 10,
        metricKey: 'morningDeliveriesNotified',
        params: {
          shopId,
          category: 'production',
          tone: 'alert',
          badgeIcon: 'schedule',
          badgeBg: '#FEE2E2',
          badgeColor: '#DC2626',
          title,
          subtitle: `${nameSnippet}${extra}. Tap to review today's delivery schedule.`,
          actionLabel: 'View Schedule',
          actionHref: '/production',
        },
      });
    }

    for (const [shopId, data] of Object.entries(rtwDueByShop)) {
      const title = `RTW Batch Target: ${data.count} production run${data.count === 1 ? '' : 's'} due today`;
      const alertKey = `production:${shopId}:${title}`;
      const styleSnippet = data.styles.join(' and ');
      const extra = data.count > data.styles.length ? ` plus ${data.count - data.styles.length} more` : '';

      enqueueForShop(shopId, {
        alertKey,
        track: 'rtw',
        basePriority: 10,
        metricKey: 'morningDeliveriesNotified',
        params: {
          shopId,
          category: 'production',
          tone: 'alert',
          badgeIcon: 'storefront',
          badgeBg: '#FEE2E2',
          badgeColor: '#DC2626',
          title,
          subtitle: `${styleSnippet}${extra} scheduled to finish today for your stock rack.`,
          actionLabel: 'Open Production',
          actionHref: '/production',
        },
      });
    }

    // B. Calendar Appointments & Client Fittings for Today (Bespoke track)
    const { data: todayEvents } = await admin
      .from('calendar_events')
      .select('shop_id')
      .eq('date', todayStr);

    if (todayEvents && todayEvents.length > 0) {
      const shopEventCounts: Record<string, number> = {};
      for (const event of todayEvents) {
        shopEventCounts[event.shop_id] = (shopEventCounts[event.shop_id] || 0) + 1;
      }

      for (const [shopId, count] of Object.entries(shopEventCounts)) {
        const title = "Today's Fitting & Client Schedule";
        const alertKey = `system:${shopId}:${title}`;

        enqueueForShop(shopId, {
          alertKey,
          track: 'bespoke',
          basePriority: 20,
          metricKey: 'calendarEventsNotified',
          params: {
            shopId,
            category: 'system',
            tone: 'info',
            badgeIcon: 'calendar_today',
            badgeBg: '#EDE9FE',
            badgeColor: '#7C3AED',
            title,
            subtitle: `You have ${count} client appointment${count === 1 ? '' : 's'} scheduled today.`,
            actionLabel: 'View Calendar',
            actionHref: '/calendar',
          },
        });
      }
    }

    // C. Morning Kickstart & Streak Motivation (Tailored separately for Bespoke vs RTW!)
    const xpEnabledForMorning = isXpSystemEnabled();
    for (const shop of allShops || []) {
      const mode = shopModeMap.get(shop.id) || 'bespoke';
      const currentStreak = xpEnabledForMorning ? (shop.streak_current || 0) : 0;

      const shopActiveOrders = (allActiveOrders || []).filter((o) => o.shop_id === shop.id);
      const bespokeWipCount = shopActiveOrders.filter((o) => !o.is_internal_batch).length;
      const rtwBatchWipCount = shopActiveOrders.filter((o) => o.is_internal_batch).length;
      const shopStockItems = (allFinishedGoods || []).filter((fg) => fg.shop_id === shop.id && fg.quantity > 0);
      const totalStockUnits = shopStockItems.reduce((sum, fg) => sum + fg.quantity, 0);

      // Bespoke Morning Kickstart (fires even if 0 active orders so inactive tailors still get a morning nudge)
      if (mode === 'bespoke' || mode === 'hybrid') {
        let title = 'Good morning! Workshop Kickstart';
        let subtitle =
          bespokeWipCount > 0
            ? `You have ${bespokeWipCount} custom client job${bespokeWipCount === 1 ? '' : 's'} on the rack. Ready to make today count?`
            : `Start your workshop day strong — log a new client order, record body measurements, or send a price quote today.`;

        if (currentStreak >= 2) {
          title = `Good morning! Keep your ${currentStreak}-day streak alive`;
          subtitle =
            bespokeWipCount > 0
              ? `You have ${bespokeWipCount} client garments in progress. Log your first cut or stage update today to maintain your streak.`
              : `Log a client measurement, new order, or payment today to keep your ${currentStreak}-day streak growing.`;
        }

        const alertKey = `system:${shop.id}:${title}`;
        enqueueForShop(shop.id, {
          alertKey,
          track: 'bespoke',
          basePriority: 30,
          metricKey: 'morningKickstartsNotified',
          params: {
            shopId: shop.id,
            category: 'system',
            tone: 'info',
            badgeIcon: currentStreak >= 2 ? 'local_fire_department' : 'content_cut',
            badgeBg: currentStreak >= 2 ? '#FFEDD5' : '#E0F2FE',
            badgeColor: currentStreak >= 2 ? '#EA580C' : '#0284C7',
            title,
            subtitle,
            actionLabel: bespokeWipCount > 0 ? 'Open Workshop' : 'Open Dashboard',
            actionHref: bespokeWipCount > 0 ? '/production' : '/dashboard',
          },
        });
      }

      // RTW Morning Kickstart
      if (mode === 'rtw' || mode === 'hybrid') {
        let title = 'Good morning! Ready-to-Wear Storefront';
        let subtitle =
          totalStockUnits > 0
            ? `You have ${totalStockUnits} ready-made piece${totalStockUnits === 1 ? '' : 's'} in stock${rtwBatchWipCount > 0 ? ` and ${rtwBatchWipCount} batch run in production` : ''}. Log today's POS sales or stock updates!`
            : rtwBatchWipCount > 0
            ? `You have ${rtwBatchWipCount} RTW batch run${rtwBatchWipCount === 1 ? '' : 's'} on the production floor. Keep moving batches to Stock!`
            : `Start your brand day strong — add ready-made pieces to Stock & POS or launch a new multi-size batch run today.`;

        if (currentStreak >= 2) {
          title = `Good morning! Keep your ${currentStreak}-day brand streak alive`;
          subtitle = `Log a POS sale, restock an item, or advance an RTW batch today to extend your ${currentStreak}-day streak.`;
        }

        const alertKey = `system:${shop.id}:${title}`;
        enqueueForShop(shop.id, {
          alertKey,
          track: 'rtw',
          basePriority: 30,
          metricKey: 'morningKickstartsNotified',
          params: {
            shopId: shop.id,
            category: 'system',
            tone: 'info',
            badgeIcon: currentStreak >= 2 ? 'local_fire_department' : 'storefront',
            badgeBg: currentStreak >= 2 ? '#FFEDD5' : '#E0F2FE',
            badgeColor: currentStreak >= 2 ? '#EA580C' : '#0284C7',
            title,
            subtitle,
            actionLabel: 'Open Stock / POS',
            actionHref: '/stock',
          },
        });
      }
    }
  }

  // =========================================================================
  // 2. MIDDAY / AFTERNOON PRIORITY QUEUE (1:00 PM – 3:00 PM WAT)
  // =========================================================================
  if (runMidday) {
    // Priority 1: Stuck orders due tomorrow (Separated by Bespoke vs RTW Batch)
    const tomorrowStart = `${tomorrowStr}T00:00:00Z`;
    const tomorrowEnd = `${tomorrowStr}T23:59:59Z`;

    const stuckOrders = (allActiveOrders || []).filter(
      (o) =>
        (o.status === 'Documented' || o.status === 'Cutting') &&
        o.due_date &&
        o.due_date >= tomorrowStart &&
        o.due_date <= tomorrowEnd
    );

    for (const order of stuckOrders) {
      const alertKey = `production:${order.id}`;
      const isRtw = Boolean(order.is_internal_batch);
      const slugHref = `/production/${toOrderSlug({
        id: order.id,
        customerName: order.customer_name,
        styleName: order.style_name,
        orderDetails: order.order_details,
      })}`;

      enqueueForShop(order.shop_id, {
        alertKey,
        track: isRtw ? 'rtw' : 'bespoke',
        basePriority: 10,
        metricKey: 'stuckOrdersNotified',
        params: {
          shopId: order.shop_id,
          category: 'production',
          tone: 'alert',
          badgeIcon: 'warning',
          badgeBg: '#FEE2E2',
          badgeColor: '#DC2626',
          title: isRtw
            ? `RTW Batch "${order.style_name || order.order_details}" is due tomorrow`
            : `${order.customer_name}'s order is due tomorrow`,
          subtitle: `Still in ${order.status}. Tap to advance on your production board.`,
          actionLabel: 'View Order',
          actionHref: slugHref,
          orderId: order.id,
        },
      });
    }

    // Priority 2A (RTW Track): Low Stock / Sold-Out Sizes Alert for RTW & Hybrid shops
    const lowStockByShop: Record<string, { lowCount: number; sampleNames: string[] }> = {};
    for (const fg of allFinishedGoods || []) {
      if (fg.quantity <= 2) {
        if (!lowStockByShop[fg.shop_id]) {
          lowStockByShop[fg.shop_id] = { lowCount: 0, sampleNames: [] };
        }
        lowStockByShop[fg.shop_id].lowCount++;
        const label = `${fg.name} (${fg.size})`;
        if (lowStockByShop[fg.shop_id].sampleNames.length < 2) {
          lowStockByShop[fg.shop_id].sampleNames.push(label);
        }
      }
    }

    for (const [shopId, info] of Object.entries(lowStockByShop)) {
      const title = `Restock Alert: ${info.lowCount} RTW size${info.lowCount === 1 ? '' : 's'} running low`;
      const alertKey = `production:${shopId}:${title}`;
      const sampleText = info.sampleNames.join(', ');
      const extra = info.lowCount > info.sampleNames.length ? ` +${info.lowCount - info.sampleNames.length} more` : '';

      enqueueForShop(shopId, {
        alertKey,
        track: 'rtw',
        basePriority: 18,
        metricKey: 'lowStockNotified',
        params: {
          shopId,
          category: 'production',
          tone: 'warning',
          badgeIcon: 'storefront',
          badgeBg: '#FEF3C7',
          badgeColor: '#D97706',
          title,
          subtitle: `${sampleText}${extra} ${info.lowCount === 1 ? 'has' : 'have'} 2 or fewer units left. Start a batch run or update stock.`,
          actionLabel: 'Manage Stock',
          actionHref: '/stock',
        },
      });
    }

    // Priority 2B: WIP Bottlenecks (>72h in Cutting or Sewing without update, separated by track)
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const stagnantOrders = (allActiveOrders || []).filter(
      (o) => (o.status === 'Cutting' || o.status === 'Sewing') && o.updated_at && o.updated_at < threeDaysAgo
    );

    for (const order of stagnantOrders) {
      const alertKey = `production:${order.id}`;
      const isRtw = Boolean(order.is_internal_batch);
      const slugHref = `/production/${toOrderSlug({
        id: order.id,
        customerName: order.customer_name,
        styleName: order.style_name,
        orderDetails: order.order_details,
      })}`;

      enqueueForShop(order.shop_id, {
        alertKey,
        track: isRtw ? 'rtw' : 'bespoke',
        basePriority: 20,
        metricKey: 'stagnantOrdersNotified',
        params: {
          shopId: order.shop_id,
          category: 'production',
          tone: 'warning',
          badgeIcon: 'schedule',
          badgeBg: '#FEE2E2',
          badgeColor: '#DC2626',
          title: isRtw
            ? `RTW Batch "${order.style_name || order.order_details}" delayed in ${order.status}`
            : `${order.customer_name}'s order delayed in ${order.status}`,
          subtitle: `In ${order.status} for over 3 days without updates. Inspect workshop progress.`,
          actionLabel: 'View Order',
          actionHref: slugHref,
          orderId: order.id,
        },
      });
    }

    // Priority 3 (Bespoke Track): Capital on the Rack (Ready custom orders with unpaid balance >48h)
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const readyOrders = (allActiveOrders || []).filter(
      (o) => !o.is_internal_batch && o.status === 'Ready' && o.updated_at && o.updated_at < twoDaysAgo
    );

    for (const order of readyOrders) {
      const balance = (order.total_bill || 0) - (order.deposit_paid || 0);
      if (balance <= 0) continue;

      const alertKey = `payments:${order.id}`;
      const slugHref = `/production/${toOrderSlug({
        id: order.id,
        customerName: order.customer_name,
        styleName: order.style_name,
        orderDetails: order.order_details,
      })}`;

      enqueueForShop(order.shop_id, {
        alertKey,
        track: 'bespoke',
        basePriority: 30,
        metricKey: 'readyBalanceNotified',
        params: {
          shopId: order.shop_id,
          category: 'payments',
          tone: 'warning',
          badgeIcon: 'account_balance_wallet',
          badgeBg: '#FEF3C7',
          badgeColor: '#D97706',
          title: `${order.customer_name}'s order is ready for pickup`,
          subtitle: `Balance of ₦${balance.toLocaleString()} pending collection. Send their digital receipt to collect payment.`,
          actionLabel: 'View Order',
          actionHref: slugHref,
          orderId: order.id,
        },
      });
    }

    // Priority 4: Weekly Backlog Digest (Mondays — separated by Bespoke vs RTW)
    const isMonday = now.getDay() === 1;
    if (isMonday) {
      const overdueOrders = (allActiveOrders || []).filter((o) => o.due_date && o.due_date < todayStartStr);
      const bespokeOverdue: Record<string, number> = {};
      const rtwOverdue: Record<string, number> = {};

      for (const order of overdueOrders) {
        if (order.is_internal_batch) {
          rtwOverdue[order.shop_id] = (rtwOverdue[order.shop_id] || 0) + 1;
        } else {
          bespokeOverdue[order.shop_id] = (bespokeOverdue[order.shop_id] || 0) + 1;
        }
      }

      for (const [shopId, count] of Object.entries(bespokeOverdue)) {
        const title = 'Weekly Client Backlog Digest';
        const alertKey = `system:${shopId}:${title}`;
        enqueueForShop(shopId, {
          alertKey,
          track: 'bespoke',
          basePriority: 40,
          metricKey: 'overdueDigestsSent',
          params: {
            shopId,
            category: 'system',
            tone: 'warning',
            badgeIcon: 'warning',
            badgeBg: '#FEF3C7',
            badgeColor: '#D97706',
            title,
            subtitle: `You have ${count} overdue client order${count === 1 ? '' : 's'} to clear this week. Tap to review.`,
            actionLabel: 'View Backlog',
            actionHref: '/production',
          },
        });
      }

      for (const [shopId, count] of Object.entries(rtwOverdue)) {
        const title = 'Weekly RTW Batch Backlog';
        const alertKey = `system:${shopId}:${title}`;
        enqueueForShop(shopId, {
          alertKey,
          track: 'rtw',
          basePriority: 40,
          metricKey: 'overdueDigestsSent',
          params: {
            shopId,
            category: 'system',
            tone: 'warning',
            badgeIcon: 'warning',
            badgeBg: '#FEF3C7',
            badgeColor: '#D97706',
            title,
            subtitle: `You have ${count} overdue RTW batch run${count === 1 ? '' : 's'} to complete for stock this week.`,
            actionLabel: 'View Batches',
            actionHref: '/production',
          },
        });
      }
    }

    // Priority 5 (Bespoke Track): Customer Birthdays Tomorrow
    const { data: birthdayCustomers, error: customerError } = await admin
      .from('customers')
      .select('id, shop_id, full_name, birthdate')
      .eq('birthdate', tomorrowMMDD);

    if (!customerError && birthdayCustomers) {
      for (const customer of birthdayCustomers) {
        const title = `${customer.full_name}'s birthday is tomorrow!`;
        const alertKey = `clients:${customer.shop_id}:${title}`;
        const customerSlugHref = `/customers/${toCustomerSlug({
          id: customer.id,
          fullName: customer.full_name,
        })}`;

        enqueueForShop(customer.shop_id, {
          alertKey,
          track: 'bespoke',
          basePriority: 50,
          metricKey: 'birthdaysNotified',
          params: {
            shopId: customer.shop_id,
            category: 'clients',
            tone: 'info',
            actorName: customer.full_name,
            badgeIcon: 'cake',
            badgeBg: '#FCE7F3',
            badgeColor: '#DB2777',
            title,
            subtitle: 'Reach out to wish them well and build lasting client loyalty.',
            actionLabel: 'View Client',
            actionHref: customerSlugHref,
          },
        });
      }
    }
  }

  // =========================================================================
  // Priority 6: FEATURE DISCOVERY NUDGES (Unused Feature Adoption)
  // Automatically steps into empty afternoon OR evening slots when urgent alerts aren't triggered!
  // Strictly separated by Bespoke vs RTW vs Universal, and max 1 feature nudge per shop per day.
  // =========================================================================
  if (runMidday || runEvening) {
    const [
      { data: customerRows },
      { data: catalogueRows },
      { data: inventoryRows },
      { data: sizeChartRows },
      { data: outfitRows },
      { data: expenseRows },
      { data: calendarAllRows },
    ] = await Promise.all([
      admin.from('customers').select('shop_id, measurements, fabrics').neq('full_name', 'Retail Walk-In'),
      admin.from('style_catalogues').select('shop_id'),
      admin.from('inventory').select('shop_id'),
      admin.from('size_charts').select('shop_id'),
      admin.from('portfolio_outfits').select('shop_id'),
      admin.from('expenses').select('shop_id').limit(1000),
      admin.from('calendar_events').select('shop_id, type').limit(1000),
    ]);

    const shopsWithMeasurements = new Set<string>();
    const shopsWithFabrics = new Set<string>();
    const shopsWithCustomers = new Set<string>();

    for (const c of customerRows || []) {
      shopsWithCustomers.add(c.shop_id);
      if (c.measurements && Object.keys(c.measurements).length > 0) {
        shopsWithMeasurements.add(c.shop_id);
      }
      if (Array.isArray(c.fabrics) && c.fabrics.length > 0) {
        shopsWithFabrics.add(c.shop_id);
      }
    }
    for (const inv of inventoryRows || []) {
      shopsWithFabrics.add(inv.shop_id);
    }

    const shopsWithCatalogues = new Set((catalogueRows || []).map((r) => r.shop_id));
    const shopsWithSizeCharts = new Set((sizeChartRows || []).map((r) => r.shop_id));
    const shopsWithPortfolio = new Set((outfitRows || []).map((r) => r.shop_id));
    const shopsWithExpenses = new Set((expenseRows || []).map((r) => r.shop_id));
    const shopsWithCalendarFittings = new Set(
      (calendarAllRows || [])
        .filter((r) => r.type === 'fitting' || r.type === 'meeting' || r.type === 'task')
        .map((r) => r.shop_id)
    );
    const shopsWithFinishedGoods = new Set((allFinishedGoods || []).map((r) => r.shop_id));
    const shopsWithRtwBatches = new Set(
      (allActiveOrders || []).filter((o) => o.is_internal_batch).map((o) => o.shop_id)
    );

    for (const shop of allShops || []) {
      if (shopsWithFeatureNudgeToday.has(shop.id)) continue;

      const candidateFeatures: {
        track: AlertTrack;
        title: string;
        subtitle: string;
        badgeIcon: string;
        actionLabel: string;
        actionHref: string;
      }[] = [];

      // --- BESPOKE FEATURE NUDGES ---
      if (!shopsWithMeasurements.has(shop.id)) {
        candidateFeatures.push({
          track: 'bespoke',
          title: 'Feature Tip: 3D Client Body Model',
          subtitle:
            'Log a client’s measurements to unlock their live 3D body shape so you can visualize posture and prevent costly fit alterations.',
          badgeIcon: 'straighten',
          actionLabel: 'Try 3D Measurements',
          actionHref: '/customers',
        });
      }

      if (!shopsWithFabrics.has(shop.id)) {
        candidateFeatures.push({
          track: 'bespoke',
          title: 'Feature Tip: Client Fabric Vault',
          subtitle:
            'Snap and log client fabric drop-offs with yardage and notes so no material ever gets mixed up on your cutting table.',
          badgeIcon: 'palette',
          actionLabel: 'Open Fabric Vault',
          actionHref: '/fabrics',
        });
      }

      if (!shopsWithCalendarFittings.has(shop.id)) {
        candidateFeatures.push({
          track: 'bespoke',
          title: 'Feature Tip: Fitting & Delivery Calendar',
          subtitle:
            'Schedule client fittings, fabric pick-ups, and delivery dates on your Workshop Calendar so you never double-book a busy week.',
          badgeIcon: 'calendar_month',
          actionLabel: 'Open Calendar',
          actionHref: '/calendar',
        });
      }

      candidateFeatures.push({
        track: 'bespoke',
        title: 'Feature Tip: Instant WhatsApp Price Quotes',
        subtitle:
          'Build a clean, itemized price breakdown for fabric, lining, and embroidery—and send it on WhatsApp so clients pay deposits faster.',
        badgeIcon: 'receipt_long',
        actionLabel: 'Create a Quote',
        actionHref: '/quotes',
      });

      // --- RTW FEATURE NUDGES ---
      if (!shopsWithFinishedGoods.has(shop.id)) {
        candidateFeatures.push({
          track: 'rtw',
          title: 'Feature Tip: Ready-to-Wear Stock & POS',
          subtitle:
            'List your ready-made pieces by size and price to record instant walk-in POS sales and track exactly which sizes sell fastest.',
          badgeIcon: 'storefront',
          actionLabel: 'Set Up Stock & POS',
          actionHref: '/stock',
        });
      }

      if (!shopsWithSizeCharts.has(shop.id)) {
        candidateFeatures.push({
          track: 'rtw',
          title: 'Feature Tip: Custom Brand Size Charts',
          subtitle:
            'Standardize your S, M, L, XL, and XXL body specs once so your production team cuts every ready-to-wear batch to exact brand sizing.',
          badgeIcon: 'straighten',
          actionLabel: 'Create Size Chart',
          actionHref: '/settings/size-charts',
        });
      }

      if (!shopsWithRtwBatches.has(shop.id)) {
        candidateFeatures.push({
          track: 'rtw',
          title: 'Feature Tip: Multi-Size Batch Production',
          subtitle:
            'Produce multiple sizes of a single style in one batch run—when completed, every piece flows straight into your Stock & POS automatically.',
          badgeIcon: 'layers',
          actionLabel: 'Start Batch Run',
          actionHref: '/orders/new',
        });
      }

      // --- UNIVERSAL FEATURE NUDGES (Helpful to Bespoke, RTW, and Hybrid) ---
      if (!shopsWithCatalogues.has(shop.id)) {
        candidateFeatures.push({
          track: 'universal',
          title: 'Feature Tip: Shareable Digital Lookbooks',
          subtitle:
            'Stop scrolling through messy phone galleries when buyers ask what styles you have. Create a clean lookbook link to share on WhatsApp in 60 seconds.',
          badgeIcon: 'collections_bookmark',
          actionLabel: 'Create Lookbook',
          actionHref: '/catalogues',
        });
      }

      if (!shopsWithPortfolio.has(shop.id)) {
        candidateFeatures.push({
          track: 'universal',
          title: 'Feature Tip: Public Studio Storefront',
          subtitle:
            'Publish your finest finished pieces to your Studio link and put it on your Instagram and WhatsApp bio to win high-paying clients 24/7.',
          badgeIcon: 'auto_awesome',
          actionLabel: 'Set Up Studio',
          actionHref: '/settings/portfolio',
        });
      }

      if (!shopsWithExpenses.has(shop.id)) {
        candidateFeatures.push({
          track: 'universal',
          title: 'Feature Tip: Shop Expenses & Profit Tracker',
          subtitle:
            'Log daily shop expenses like thread, lining, fuel, and artisan payouts alongside order revenue so you see your true take-home profit.',
          badgeIcon: 'account_balance',
          actionLabel: 'Log Shop Expense',
          actionHref: '/reconciliation',
        });
      }

      candidateFeatures.push({
        track: 'universal',
        title: 'Feature Tip: Workshop Notes & Market List',
        subtitle:
          'Keep your haberdashery market list, machinist instructions, and client callbacks organized in one checklist before heading to the market.',
        badgeIcon: 'notes',
        actionLabel: 'Open Workshop Notes',
        actionHref: '/notes',
      });

      // Filter candidates to those matching the shop's business mode & not sent in the last 7 days
      const eligibleFeatures = candidateFeatures.filter(
        (f) =>
          canShopReceiveTrack(shop.id, f.track) &&
          !sentWeekFeatureKeys.has(`${shop.id}:${f.title}`)
      );

      // Sort for Hybrid shops based on their usage before picking the top 1 feature nudge for today
      const mode = shopModeMap.get(shop.id) || 'bespoke';
      if (mode === 'hybrid') {
        const bScore = shopBespokeScore.get(shop.id) || 0;
        const rScore = shopRtwScore.get(shop.id) || 0;
        eligibleFeatures.sort((a, b) => {
          const weight = (t: AlertTrack) => {
            if (rScore > bScore) return t === 'rtw' ? 0 : t === 'bespoke' ? 1 : 2;
            return t === 'bespoke' ? 0 : t === 'rtw' ? 1 : 2;
          };
          return weight(a.track) - weight(b.track);
        });
      }

      // Enqueue at most 1 feature discovery nudge per shop per day so we never spam feature tips
      const chosenFeature = eligibleFeatures[0];
      if (chosenFeature) {
        const alertKey = `system:${shop.id}:${chosenFeature.title}`;
        enqueueForShop(shop.id, {
          alertKey,
          track: chosenFeature.track,
          basePriority: 60,
          metricKey: 'featureDiscoveryNotified',
          params: {
            shopId: shop.id,
            category: 'system',
            tone: 'info',
            badgeIcon: chosenFeature.badgeIcon,
            badgeBg: '#EEF2FF',
            badgeColor: '#4F46E5',
            title: chosenFeature.title,
            subtitle: chosenFeature.subtitle,
            actionLabel: chosenFeature.actionLabel,
            actionHref: chosenFeature.actionHref,
          },
        });
      }
    }
  }

  // =========================================================================
  // 3. EVENING PRIORITY QUEUE (8:00 PM, 8:30 PM WAT)
  // Priority 1: Streak Protection Nudge (only when standalone XP module is plugged in)
  // Priority 2: Closing-Day "Well Done" Message from MyTailorBook Team (reads from audit_log)
  // =========================================================================
  if (runEvening) {
    // Priority 1: Streak Protection Nudge (only active when XP/Streak module is enabled)
    if (isXpSystemEnabled()) {
      for (const shop of allShops || []) {
        if ((shop.streak_current || 0) <= 0) continue;

        const lastCountedStr = shop.streak_last_counted_at
          ? new Date(shop.streak_last_counted_at).toISOString().split('T')[0]
          : null;

        if (lastCountedStr === todayStr) continue;

        const mode = shopModeMap.get(shop.id) || 'bespoke';
        const title = 'Protect your workshop streak!';
        const subtitle =
          mode === 'rtw'
            ? `You have an active ${shop.streak_current}-day streak at risk. Log a POS sale, stock update, or batch progress before midnight.`
            : mode === 'hybrid'
            ? `You have an active ${shop.streak_current}-day streak at risk. Log a cut, POS sale, payment, or measurement before midnight.`
            : `You have an active ${shop.streak_current}-day streak at risk. Log a cut, payment, or measurement before midnight.`;

        const alertKey = `system:${shop.id}:${title}`;

        enqueueForShop(shop.id, {
          alertKey,
          track: 'universal',
          basePriority: 10,
          metricKey: 'streakRemindersSent',
          params: {
            shopId: shop.id,
            category: 'system',
            tone: 'info',
            badgeIcon: 'local_fire_department',
            badgeBg: '#FFEDD5',
            badgeColor: '#EA580C',
            title,
            subtitle,
            actionLabel: 'Open Dashboard',
            actionHref: '/dashboard',
          },
        });
      }
    }

    // Priority 2: Closing-Day "Well Done" Message for active shops today (decoupled via audit_log)
    const { data: todayAudits } = await admin
      .from('audit_log')
      .select('shop_id, action')
      .gte('created_at', todayStartStr);

    const shopActivityMap: Record<string, { count: number; actionTypes: Set<string> }> = {};

    for (const entry of todayAudits || []) {
      if (!entry.shop_id) continue;
      if (!shopActivityMap[entry.shop_id]) {
        shopActivityMap[entry.shop_id] = { count: 0, actionTypes: new Set() };
      }
      shopActivityMap[entry.shop_id].count++;
      shopActivityMap[entry.shop_id].actionTypes.add(entry.action);
    }

    if (isXpSystemEnabled()) {
      const { data: todayLedger } = await admin
        .from('xp_ledger')
        .select('shop_id, action_type')
        .gte('created_at', todayStartStr);

      for (const entry of todayLedger || []) {
        if (entry.action_type === 'daily_login') continue;
        if (!shopActivityMap[entry.shop_id]) {
          shopActivityMap[entry.shop_id] = { count: 0, actionTypes: new Set() };
        }
        shopActivityMap[entry.shop_id].count++;
        shopActivityMap[entry.shop_id].actionTypes.add(entry.action_type);
      }
    }

    for (const [shopId, activity] of Object.entries(shopActivityMap)) {
      if (activity.count < 2) continue;

      let title: string;
      let subtitle: string;

      if (activity.count >= 6) {
        title = 'What a day — incredible output!';
        subtitle = `You logged ${activity.count} craft sessions today. The kind of hard work that builds great reputation. Rest well — from the MyTailorBook Team.`;
      } else if (activity.count >= 4) {
        title = "Solid day's work. Well done!";
        subtitle = `${activity.count} workshop actions completed today. You're building something real. Keep showing up — from the MyTailorBook Team.`;
      } else {
        title = 'Good effort today!';
        subtitle = `You put in the work today and that's what it takes. Every stitch is progress. See you tomorrow — from the MyTailorBook Team.`;
      }

      const alertKey = `system:${shopId}:${title}`;

      enqueueForShop(shopId, {
        alertKey,
        track: 'universal',
        basePriority: 20,
        metricKey: 'closingDayMessagesSent',
        params: {
          shopId,
          category: 'system',
          tone: 'info',
          badgeIcon: 'check_circle',
          badgeBg: '#DCFCE7',
          badgeColor: '#16A34A',
          title,
          subtitle,
          actionLabel: 'View Dashboard',
          actionHref: '/dashboard',
        },
      });
    }

    // Priority 3: Evening Workshop Wrap-Up / Check-In for shops with < 2 logged actions today
    for (const shop of allShops || []) {
      const activityCount = shopActivityMap[shop.id]?.count || 0;
      if (activityCount >= 2) continue;

      const mode = shopModeMap.get(shop.id) || 'bespoke';
      const shopActiveOrders = (allActiveOrders || []).filter((o) => o.shop_id === shop.id);
      const bespokeWipCount = shopActiveOrders.filter((o) => !o.is_internal_batch).length;
      const rtwBatchWipCount = shopActiveOrders.filter((o) => o.is_internal_batch).length;

      const title = 'Evening Workshop Wrap-Up';
      const subtitle =
        mode === 'rtw'
          ? rtwBatchWipCount > 0
            ? `You have ${rtwBatchWipCount} RTW batch run${rtwBatchWipCount === 1 ? '' : 's'} in progress for tomorrow. Log any evening sales or stock updates before closing.`
            : 'Sold any ready-made pieces or restocked sizes today? Log them tonight so your inventory stays accurate for tomorrow.'
          : bespokeWipCount > 0
          ? `You have ${bespokeWipCount} active client job${bespokeWipCount === 1 ? '' : 's'} on the rack for tomorrow. Log any new measurements or payments before closing up.`
          : 'Took any client measurements, fabric drop-offs, or deposits today? Log them tonight so your workshop starts fresh tomorrow.';

      const alertKey = `system:${shop.id}:${title}`;
      enqueueForShop(shop.id, {
        alertKey,
        track: 'universal',
        basePriority: 35,
        metricKey: 'closingDayMessagesSent',
        params: {
          shopId: shop.id,
          category: 'system',
          tone: 'info',
          badgeIcon: 'schedule',
          badgeBg: '#EEF2FF',
          badgeColor: '#4F46E5',
          title,
          subtitle,
          actionLabel: 'Open Dashboard',
          actionHref: '/dashboard',
        },
      });
    }
  }

  // =========================================================================
  // 4. DISPATCHER: Sort each shop's queue by priority (with Hybrid usage-based tie-breaking)
  // and pop ONLY the #1 highest-priority unsent alert per shop per time slot!
  // =========================================================================
  const metrics: Record<QueuedAlert['metricKey'], number> = {
    morningDeliveriesNotified: 0,
    calendarEventsNotified: 0,
    morningKickstartsNotified: 0,
    stuckOrdersNotified: 0,
    stagnantOrdersNotified: 0,
    readyBalanceNotified: 0,
    lowStockNotified: 0,
    overdueDigestsSent: 0,
    birthdaysNotified: 0,
    featureDiscoveryNotified: 0,
    streakRemindersSent: 0,
    closingDayMessagesSent: 0,
  };

  let pushDevicesSent = 0;
  const dispatchedAlerts: Array<{
    shopId: string;
    title: string;
    subtitle?: string;
    pushSentCount: number;
    pushError?: string;
  }> = [];

  for (const [shopId, queue] of shopQueues.entries()) {
    if (queue.length === 0) continue;

    const mode = shopModeMap.get(shopId) || 'bespoke';
    const bScore = shopBespokeScore.get(shopId) || 0;
    const rScore = shopRtwScore.get(shopId) || 0;
    const prefersRtw = mode === 'hybrid' && rScore > bScore;

    queue.sort((a, b) => {
      if (a.basePriority !== b.basePriority) {
        return a.basePriority - b.basePriority;
      }
      // For Hybrid shops: break priority ties using their dominant usage track!
      if (mode === 'hybrid' && a.track !== b.track) {
        if (prefersRtw) {
          if (a.track === 'rtw') return -1;
          if (b.track === 'rtw') return 1;
        } else {
          if (a.track === 'bespoke') return -1;
          if (b.track === 'bespoke') return 1;
        }
      }
      return 0;
    });

    const itemsToSend = isBatchAll ? queue : [queue[0]];

    for (const item of itemsToSend) {
      const pushRes = await createAtelierNotification(item.params);
      pushDevicesSent += pushRes.pushSentCount || 0;
      dispatchedAlerts.push({
        shopId,
        title: item.params.title,
        subtitle: item.params.subtitle,
        pushSentCount: pushRes.pushSentCount || 0,
        pushError: pushRes.pushError,
      });
      sentTodayAlertKeys.add(item.alertKey);
      metrics[item.metricKey]++;
    }
  }

  return NextResponse.json({
    ok: true,
    mode: isBatchAll ? 'batch_all' : 'priority_slot',
    slot: urlSlot ?? 'auto',
    shopsLoaded: (allShops || []).length,
    pushDevicesSent,
    dispatchedAlerts,
    segmentExecuted: {
      morning: runMorning,
      midday: runMidday,
      evening: runEvening,
    },
    ...metrics,
  });
}
