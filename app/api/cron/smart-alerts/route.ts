import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAtelierNotification } from '@/lib/notifications';

type QueuedAlert = {
  alertKey: string;
  params: Parameters<typeof createAtelierNotification>[0];
  metricKey:
    | 'morningDeliveriesNotified'
    | 'calendarEventsNotified'
    | 'morningKickstartsNotified'
    | 'stuckOrdersNotified'
    | 'stagnantOrdersNotified'
    | 'readyBalanceNotified'
    | 'overdueDigestsSent'
    | 'birthdaysNotified'
    | 'streakRemindersSent'
    | 'closingDayMessagesSent';
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  const authBuf = Buffer.from(authHeader ?? '');
  const expectedBuf = Buffer.from(expected ?? '');

  let isAuthorized = false;
  if (authBuf.length === expectedBuf.length && authBuf.length > 0) {
    isAuthorized = crypto.timingSafeEqual(authBuf, expectedBuf);
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

  const urlSegment = request.nextUrl.searchParams.get('segment');
  const urlType = request.nextUrl.searchParams.get('type');
  const urlSlot = request.nextUrl.searchParams.get('slot');
  const utcHour = now.getUTCHours();

  // Determine whether we are running in single-item priority queue mode (default for crons)
  // or full batch mode (?segment=all or ?type=all for manual testing)
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
    // Automatic schedule based on UTC hours:
    // 05:00 - 10:00 UTC (06:00 - 11:00 WAT) -> Morning
    // 10:00 - 16:00 UTC (11:00 - 17:00 WAT) -> Midday
    // 16:00 - 23:59 UTC (17:00 - 00:59 WAT) -> Evening
    if (utcHour >= 5 && utcHour < 10) {
      runMorning = true;
    } else if (utcHour >= 10 && utcHour < 16) {
      runMidday = true;
    } else {
      runEvening = true;
    }
  }

  // Fetch today's notification records to know what has ALREADY been delivered today
  // so the next highest-priority alert automatically steps up into the current time slot!
  const { data: todayNotifications } = await admin
    .from('atelier_notifications')
    .select('order_id, recipient_id, shop_id, category, title')
    .gte('created_at', todayStartStr);

  const sentAlertKeys = new Set<string>();
  for (const n of todayNotifications || []) {
    if (n.order_id) sentAlertKeys.add(`${n.category}:${n.order_id}`);
    if (n.recipient_id) sentAlertKeys.add(`${n.category}:${n.recipient_id}:${n.title}`);
    if (n.shop_id) sentAlertKeys.add(`${n.category}:${n.shop_id}:${n.title}`);
  }

  // Per-shop priority queues so each shop gets AT MOST 1 notification per cron slot,
  // and if Priority #1 isn't applicable or was already sent, Priority #2 automatically takes the slot!
  const shopQueues = new Map<string, QueuedAlert[]>();

  const enqueueForShop = (shopId: string, alert: QueuedAlert) => {
    if (!shopId) return;
    if (sentAlertKeys.has(alert.alertKey)) return;
    // Also support optional single-type filter if manually queried with ?type=...
    if (urlType && !isBatchAll) {
      const typeToMetric: Record<string, QueuedAlert['metricKey']> = {
        deliveries_today: 'morningDeliveriesNotified',
        calendar_today: 'calendarEventsNotified',
        morning_kickstart: 'morningKickstartsNotified',
        stuck_tomorrow: 'stuckOrdersNotified',
        stagnant_wip: 'stagnantOrdersNotified',
        ready_balance: 'readyBalanceNotified',
        backlog_digest: 'overdueDigestsSent',
        birthdays: 'birthdaysNotified',
        streak_protection: 'streakRemindersSent',
        closing_day: 'closingDayMessagesSent',
      };
      if (typeToMetric[urlType] && typeToMetric[urlType] !== alert.metricKey) {
        return;
      }
    }
    const list = shopQueues.get(shopId) ?? [];
    // Prevent duplicate alertKey within the same run
    if (list.some((item) => item.alertKey === alert.alertKey)) return;
    list.push(alert);
    shopQueues.set(shopId, list);
  };

  // =========================================================================
  // 1. MORNING PRIORITY QUEUE (9:00 AM, 9:25 AM, 9:50 AM WAT)
  // Priority 1: Today's Deliveries
  // Priority 2: Today's Client Appointments / Fittings
  // Priority 3: Morning Workshop Kickstart & Streak Motivation
  // =========================================================================
  if (runMorning) {
    // Priority 1: Orders Due Today
    const { data: todayDueOrders } = await admin
      .from('orders')
      .select('id, shop_id, customer_name, status')
      .neq('status', 'Delivered')
      .gte('due_date', todayStartStr)
      .lte('due_date', todayEndStr);

    if (todayDueOrders && todayDueOrders.length > 0) {
      const shopOrdersMap: Record<string, { count: number; names: string[] }> = {};
      for (const o of todayDueOrders) {
        if (!shopOrdersMap[o.shop_id]) {
          shopOrdersMap[o.shop_id] = { count: 0, names: [] };
        }
        shopOrdersMap[o.shop_id].count++;
        if (shopOrdersMap[o.shop_id].names.length < 2 && o.customer_name) {
          shopOrdersMap[o.shop_id].names.push(o.customer_name);
        }
      }

      for (const [shopId, data] of Object.entries(shopOrdersMap)) {
        const title = `Today's Deliveries: ${data.count} order${data.count === 1 ? '' : 's'} due`;
        const alertKey = `production:${shopId}:${title}`;
        const nameSnippet = data.names.join(' and ');
        const extra = data.count > data.names.length ? ` plus ${data.count - data.names.length} more` : '';

        enqueueForShop(shopId, {
          alertKey,
          metricKey: 'morningDeliveriesNotified',
          params: {
            shopId,
            category: 'production',
            tone: 'alert',
            badgeIcon: 'schedule',
            badgeBg: '#FEE2E2',
            badgeColor: '#DC2626',
            title,
            subtitle: `${nameSnippet}${extra}. Tap to review today's workshop schedule.`,
            actionLabel: 'View Schedule',
            actionHref: '/production',
          },
        });
      }
    }

    // Priority 2: Calendar Appointments & Client Fittings for Today
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
        const title = "Today's Schedule";
        const alertKey = `system:${shopId}:${title}`;

        enqueueForShop(shopId, {
          alertKey,
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

    // Priority 3: Morning Workshop Kickstart & Streak Motivation
    const { data: activeShops } = await admin
      .from('shops')
      .select('id, name, streak_current, streak_last_counted_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    for (const shop of activeShops || []) {
      const { count: wipCount } = await admin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .in('status', ['Documented', 'Cutting', 'Sewing', 'Fitting']);

      if ((wipCount || 0) > 0) {
        const currentStreak = shop.streak_current || 0;
        let title = 'Good morning! Workshop Kickstart';
        let subtitle = `You have ${wipCount} active job${wipCount === 1 ? '' : 's'} on the rack. Ready to make today count?`;

        if (currentStreak >= 2) {
          title = `Good morning! Keep your ${currentStreak}-day streak alive`;
          subtitle = `You have ${wipCount} active garments in progress. Log your first cut or update today to maintain your streak.`;
        }

        const alertKey = `system:${shop.id}:${title}`;

        enqueueForShop(shop.id, {
          alertKey,
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
            actionLabel: 'Open Workshop',
            actionHref: '/production',
          },
        });
      }
    }
  }

  // =========================================================================
  // 2. MIDDAY / AFTERNOON PRIORITY QUEUE (1:00 PM, 1:30 PM, 2:00 PM, 2:30 PM, 3:00 PM WAT)
  // Priority 1: Stuck orders due tomorrow (still in Documented or Cutting)
  // Priority 2: WIP Bottlenecks (stagnant >72h in Cutting or Sewing)
  // Priority 3: Capital on the Rack (Ready orders with unpaid balance >48h)
  // Priority 4: Weekly Backlog Digest (Mondays)
  // Priority 5: Customer Birthdays Tomorrow
  // =========================================================================
  if (runMidday) {
    // Priority 1: Stuck orders due tomorrow
    const { data: stuckOrders, error: orderError } = await admin
      .from('orders')
      .select('id, shop_id, customer_name, status')
      .in('status', ['Documented', 'Cutting'])
      .gte('due_date', `${tomorrowStr}T00:00:00Z`)
      .lt('due_date', `${tomorrowStr}T23:59:59Z`);

    if (!orderError && stuckOrders) {
      for (const order of stuckOrders) {
        const alertKey = `production:${order.id}`;
        enqueueForShop(order.shop_id, {
          alertKey,
          metricKey: 'stuckOrdersNotified',
          params: {
            shopId: order.shop_id,
            category: 'production',
            tone: 'alert',
            badgeIcon: 'warning',
            badgeBg: '#FEE2E2',
            badgeColor: '#DC2626',
            title: `${order.customer_name}'s order is due tomorrow`,
            subtitle: `Still in ${order.status}. Tap to advance order on your board.`,
            actionLabel: 'View Order',
            actionHref: `/production/${order.id}`,
            orderId: order.id,
          },
        });
      }
    }

    // Priority 2: WIP Bottlenecks (>72h in Cutting or Sewing without update)
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const { data: stagnantOrders } = await admin
      .from('orders')
      .select('id, shop_id, customer_name, status, updated_at')
      .in('status', ['Cutting', 'Sewing'])
      .lt('updated_at', threeDaysAgo);

    if (stagnantOrders) {
      for (const order of stagnantOrders) {
        const alertKey = `production:${order.id}`;
        enqueueForShop(order.shop_id, {
          alertKey,
          metricKey: 'stagnantOrdersNotified',
          params: {
            shopId: order.shop_id,
            category: 'production',
            tone: 'warning',
            badgeIcon: 'schedule',
            badgeBg: '#FEE2E2',
            badgeColor: '#DC2626',
            title: `${order.customer_name}'s order delayed in ${order.status}`,
            subtitle: `In ${order.status} for over 3 days without updates. Inspect workshop progress.`,
            actionLabel: 'View Order',
            actionHref: `/production/${order.id}`,
            orderId: order.id,
          },
        });
      }
    }

    // Priority 3: Capital on the Rack (Ready orders with unpaid balance >48h)
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const { data: readyOrders } = await admin
      .from('orders')
      .select('id, shop_id, customer_name, total_bill, deposit_paid, updated_at')
      .eq('status', 'Ready')
      .lt('updated_at', twoDaysAgo);

    if (readyOrders) {
      for (const order of readyOrders) {
        const balance = (order.total_bill || 0) - (order.deposit_paid || 0);
        if (balance <= 0) continue;

        const alertKey = `payments:${order.id}`;
        enqueueForShop(order.shop_id, {
          alertKey,
          metricKey: 'readyBalanceNotified',
          params: {
            shopId: order.shop_id,
            category: 'payments',
            tone: 'warning',
            badgeIcon: 'account_balance_wallet',
            badgeBg: '#FEF3C7',
            badgeColor: '#D97706',
            title: `${order.customer_name}'s order is ready for pickup`,
            subtitle: `Balance of ₦${balance.toLocaleString()} pending collection. Notify customer.`,
            actionLabel: 'View Order',
            actionHref: `/production/${order.id}`,
            orderId: order.id,
          },
        });
      }
    }

    // Priority 4: Weekly Backlog Digest (Mondays)
    const isMonday = now.getDay() === 1;
    if (isMonday) {
      const { data: overdueOrders } = await admin
        .from('orders')
        .select('shop_id')
        .lt('due_date', todayStartStr)
        .neq('status', 'Delivered');

      if (overdueOrders) {
        const shopOverdueCounts: Record<string, number> = {};
        for (const order of overdueOrders) {
          shopOverdueCounts[order.shop_id] = (shopOverdueCounts[order.shop_id] || 0) + 1;
        }

        for (const [shopId, count] of Object.entries(shopOverdueCounts)) {
          const title = 'Weekly Backlog Digest';
          const alertKey = `system:${shopId}:${title}`;

          enqueueForShop(shopId, {
            alertKey,
            metricKey: 'overdueDigestsSent',
            params: {
              shopId,
              category: 'system',
              tone: 'warning',
              badgeIcon: 'warning',
              badgeBg: '#FEF3C7',
              badgeColor: '#D97706',
              title,
              subtitle: `You have ${count} overdue order${count === 1 ? '' : 's'} to clear this week. Tap to review.`,
              actionLabel: 'View Backlog',
              actionHref: '/production',
            },
          });
        }
      }
    }

    // Priority 5: Customer Birthdays Tomorrow
    const { data: birthdayCustomers, error: customerError } = await admin
      .from('customers')
      .select('id, shop_id, full_name, birthdate')
      .eq('birthdate', tomorrowMMDD);

    if (!customerError && birthdayCustomers) {
      for (const customer of birthdayCustomers) {
        const title = `${customer.full_name}'s birthday is tomorrow!`;
        const alertKey = `clients:${customer.shop_id}:${title}`;

        enqueueForShop(customer.shop_id, {
          alertKey,
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
            actionHref: `/customers/${customer.id}`,
          },
        });
      }
    }
  }

  // =========================================================================
  // 3. EVENING PRIORITY QUEUE (8:00 PM, 8:30 PM WAT)
  // Priority 1: Streak Protection Nudge (if streak > 0 and no activity logged today)
  // Priority 2: Closing-Day "Well Done" Message from MyTailorBook Team (if ≥2 craft actions today)
  // =========================================================================
  if (runEvening) {
    // Priority 1: Streak Protection Nudge
    const { data: atRiskShops, error: streakError } = await admin
      .from('shops')
      .select('id, name, streak_current, streak_last_counted_at')
      .gt('streak_current', 0);

    if (streakError) {
      console.error('Error fetching streak shops:', streakError);
    } else if (atRiskShops) {
      for (const shop of atRiskShops) {
        const lastCountedStr = shop.streak_last_counted_at
          ? new Date(shop.streak_last_counted_at).toISOString().split('T')[0]
          : null;

        if (lastCountedStr === todayStr) continue;

        const title = 'Protect your workshop streak!';
        const alertKey = `system:${shop.id}:${title}`;

        enqueueForShop(shop.id, {
          alertKey,
          metricKey: 'streakRemindersSent',
          params: {
            shopId: shop.id,
            category: 'system',
            tone: 'info',
            badgeIcon: 'local_fire_department',
            badgeBg: '#FFEDD5',
            badgeColor: '#EA580C',
            title,
            subtitle: `You have an active ${shop.streak_current}-day streak at risk. Log a cut, payment, or measurement before midnight.`,
            actionLabel: 'Open Dashboard',
            actionHref: '/dashboard',
          },
        });
      }
    }

    // Priority 2: Closing-Day "Well Done" Message for active shops today
    const { data: todayLedger } = await admin
      .from('xp_ledger')
      .select('shop_id, action_type')
      .gte('created_at', todayStartStr);

    if (todayLedger && todayLedger.length > 0) {
      const shopActivityMap: Record<string, { count: number; actionTypes: Set<string> }> = {};
      for (const entry of todayLedger) {
        if (entry.action_type === 'daily_login') continue;
        if (!shopActivityMap[entry.shop_id]) {
          shopActivityMap[entry.shop_id] = { count: 0, actionTypes: new Set() };
        }
        shopActivityMap[entry.shop_id].count++;
        shopActivityMap[entry.shop_id].actionTypes.add(entry.action_type);
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
    }
  }

  // =========================================================================
  // 4. DISPATCHER: Pop ONLY the #1 highest-priority unsent alert per shop
  // (Unless ?segment=all or ?type=all was passed for full batch testing)
  // =========================================================================
  const metrics: Record<QueuedAlert['metricKey'], number> = {
    morningDeliveriesNotified: 0,
    calendarEventsNotified: 0,
    morningKickstartsNotified: 0,
    stuckOrdersNotified: 0,
    stagnantOrdersNotified: 0,
    readyBalanceNotified: 0,
    overdueDigestsSent: 0,
    birthdaysNotified: 0,
    streakRemindersSent: 0,
    closingDayMessagesSent: 0,
  };

  for (const [, queue] of shopQueues.entries()) {
    if (queue.length === 0) continue;

    // In standard staggered cron mode, deliver ONLY the top-priority item for this shop in this slot.
    // The next slot 25-30 mins later will automatically promote the next item in line!
    const itemsToSend = isBatchAll ? queue : [queue[0]];

    for (const item of itemsToSend) {
      await createAtelierNotification(item.params);
      sentAlertKeys.add(item.alertKey);
      metrics[item.metricKey]++;
    }
  }

  return NextResponse.json({
    ok: true,
    mode: isBatchAll ? 'batch_all' : 'priority_slot',
    slot: urlSlot ?? 'auto',
    segmentExecuted: {
      morning: runMorning,
      midday: runMidday,
      evening: runEvening,
    },
    ...metrics,
  });
}
