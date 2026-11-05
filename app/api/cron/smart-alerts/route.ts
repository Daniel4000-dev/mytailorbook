import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAtelierNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  const authBuf = Buffer.from(authHeader ?? '');
  const expectedBuf = Buffer.from(expected ?? '');

  let isAuthorized = false;
  if (authBuf.length === expectedBuf.length && authBuf.length > 0) {
    isAuthorized = crypto.timingSafeEqual(authBuf, expectedBuf);
  }

  // Also allow bypassing for testing in development or when CRON_SECRET is not configured locally
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

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const tomorrowMMDD = tomorrowStr.substring(5);

  // Determine requested segment from URL param or current UTC hour
  const urlSegment = request.nextUrl.searchParams.get('segment');
  const utcHour = now.getUTCHours();

  let runMorning = false;
  let runMidday = false;
  let runEvening = false;

  if (urlSegment === 'morning') {
    runMorning = true;
  } else if (urlSegment === 'midday') {
    runMidday = true;
  } else if (urlSegment === 'evening') {
    runEvening = true;
  } else if (urlSegment === 'all') {
    runMorning = true;
    runMidday = true;
    runEvening = true;
  } else {
    // Automatic schedule based on UTC hours
    // 05:00 - 10:00 UTC (06:00 - 11:00 WAT) -> Morning
    // 10:00 - 15:00 UTC (11:00 - 16:00 WAT) -> Midday
    // 15:00 - 23:00 UTC (16:00 - 24:00 WAT) -> Evening
    if (utcHour >= 5 && utcHour < 10) {
      runMorning = true;
    } else if (utcHour >= 10 && utcHour < 15) {
      runMidday = true;
    } else {
      runEvening = true;
    }
  }

  // Fetch today's notification records to prevent repeated alerts on multi-runs
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

  let morningDeliveriesNotified = 0;
  let morningKickstartsNotified = 0;
  let stuckOrdersNotified = 0;
  let birthdaysNotified = 0;
  let overdueDigestsSent = 0;
  let calendarEventsNotified = 0;
  let readyBalanceNotified = 0;
  let stagnantOrdersNotified = 0;
  let streakRemindersSent = 0;

  // =========================================================================
  // 1. MORNING SEGMENT: Today's Deadlines, Calendar Schedule & Daily Kickstart
  // =========================================================================
  if (runMorning) {
    // A. Orders Due Today
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
        const alertKey = `production:${shopId}:Today's Deliveries`;
        if (sentAlertKeys.has(alertKey)) continue;

        const nameSnippet = data.names.join(' and ');
        const extra = data.count > data.names.length ? ` plus ${data.count - data.names.length} more` : '';

        await createAtelierNotification({
          shopId,
          category: 'production',
          tone: 'alert',
          badgeIcon: 'schedule',
          badgeBg: '#FEE2E2',
          badgeColor: '#DC2626',
          title: `Today's Deliveries: ${data.count} order${data.count === 1 ? '' : 's'} due`,
          subtitle: `${nameSnippet}${extra}. Tap to review today's workshop schedule.`,
          actionLabel: 'View Schedule',
          actionHref: '/production',
        });
        sentAlertKeys.add(alertKey);
        morningDeliveriesNotified++;
      }
    }

    // B. Calendar Appointments & Client Fittings for Today
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
        const alertKey = `system:${shopId}:Today's Schedule`;
        if (sentAlertKeys.has(alertKey)) continue;

        await createAtelierNotification({
          shopId,
          category: 'system',
          tone: 'info',
          badgeIcon: 'calendar_today',
          badgeBg: '#EDE9FE',
          badgeColor: '#7C3AED',
          title: "Today's Schedule",
          subtitle: `You have ${count} client appointment${count === 1 ? '' : 's'} scheduled today.`,
          actionLabel: 'View Calendar',
          actionHref: '/calendar',
        });
        sentAlertKeys.add(alertKey);
        calendarEventsNotified++;
      }
    }

    // C. Morning Workshop Kickstart & Streak Motivation
    const { data: activeShops } = await admin
      .from('shops')
      .select('id, name, streak_current, streak_last_counted_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    for (const shop of activeShops || []) {
      const alertKey = `system:${shop.id}:Morning Workshop Kickstart`;
      if (sentAlertKeys.has(alertKey)) continue;

      // Count active work-in-progress orders
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

        await createAtelierNotification({
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
        });
        sentAlertKeys.add(alertKey);
        morningKickstartsNotified++;
      }
    }
  }

  // =========================================================================
  // 2. MIDDAY SEGMENT: Bottlenecks, Tomorrow's Deadlines & Client Birthdays
  // =========================================================================
  if (runMidday) {
    // A. Stuck orders due tomorrow (still in Documented or Cutting)
    const { data: stuckOrders, error: orderError } = await admin
      .from('orders')
      .select('id, shop_id, customer_name, status')
      .in('status', ['Documented', 'Cutting'])
      .gte('due_date', `${tomorrowStr}T00:00:00Z`)
      .lt('due_date', `${tomorrowStr}T23:59:59Z`);

    if (!orderError && stuckOrders) {
      for (const order of stuckOrders) {
        const alertKey = `production:${order.id}`;
        if (sentAlertKeys.has(alertKey)) continue;

        await createAtelierNotification({
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
        });
        sentAlertKeys.add(alertKey);
        stuckOrdersNotified++;
      }
    }

    // B. Customer birthdays tomorrow
    const { data: birthdayCustomers, error: customerError } = await admin
      .from('customers')
      .select('id, shop_id, full_name, birthdate')
      .eq('birthdate', tomorrowMMDD);

    if (!customerError && birthdayCustomers) {
      for (const customer of birthdayCustomers) {
        const alertKey = `clients:${customer.id}:birthday`;
        if (sentAlertKeys.has(alertKey)) continue;

        await createAtelierNotification({
          shopId: customer.shop_id,
          category: 'clients',
          tone: 'info',
          actorName: customer.full_name,
          badgeIcon: 'cake',
          badgeBg: '#FCE7F3',
          badgeColor: '#DB2777',
          title: `${customer.full_name}'s birthday is tomorrow!`,
          subtitle: 'Reach out to wish them well and build lasting client loyalty.',
          actionLabel: 'View Client',
          actionHref: `/customers/${customer.id}`,
        });
        sentAlertKeys.add(alertKey);
        birthdaysNotified++;
      }
    }

    // C. Weekly Backlog Digest (Mondays)
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
          const alertKey = `system:${shopId}:Weekly Backlog Digest`;
          if (sentAlertKeys.has(alertKey)) continue;

          await createAtelierNotification({
            shopId,
            category: 'system',
            tone: 'warning',
            badgeIcon: 'warning',
            badgeBg: '#FEF3C7',
            badgeColor: '#D97706',
            title: 'Weekly Backlog Digest',
            subtitle: `You have ${count} overdue order${count === 1 ? '' : 's'} to clear this week. Tap to review.`,
            actionLabel: 'View Backlog',
            actionHref: '/production',
          });
          sentAlertKeys.add(alertKey);
          overdueDigestsSent++;
        }
      }
    }

    // D. Capital on the Rack: Ready orders with unpaid balance (>48h in Ready)
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
        if (sentAlertKeys.has(alertKey)) continue;

        await createAtelierNotification({
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
        });
        sentAlertKeys.add(alertKey);
        readyBalanceNotified++;
      }
    }

    // E. WIP Bottlenecks: Orders stagnant in Cutting or Sewing (>72h without update)
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const { data: stagnantOrders } = await admin
      .from('orders')
      .select('id, shop_id, customer_name, status, updated_at')
      .in('status', ['Cutting', 'Sewing'])
      .lt('updated_at', threeDaysAgo);

    if (stagnantOrders) {
      for (const order of stagnantOrders) {
        const alertKey = `production:${order.id}`;
        if (sentAlertKeys.has(alertKey)) continue;

        await createAtelierNotification({
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
        });
        sentAlertKeys.add(alertKey);
        stagnantOrdersNotified++;
      }
    }
  }

  // =========================================================================
  // 3. EVENING SEGMENT: Streak Protection Nudge & Daily Wrap-Up
  // =========================================================================
  if (runEvening) {
    // FIX: Query shops table directly where streak_current is stored!
    const { data: atRiskShops, error: streakError } = await admin
      .from('shops')
      .select('id, name, streak_current, streak_last_counted_at')
      .gt('streak_current', 0);

    if (streakError) {
      console.error('Error fetching streak shops:', streakError);
    } else if (atRiskShops) {
      for (const shop of atRiskShops) {
        // If streak has already been counted today, skip
        const lastCountedStr = shop.streak_last_counted_at
          ? new Date(shop.streak_last_counted_at).toISOString().split('T')[0]
          : null;

        if (lastCountedStr === todayStr) continue;

        const alertKey = `system:${shop.id}:Protect your workshop streak`;
        if (sentAlertKeys.has(alertKey)) continue;

        await createAtelierNotification({
          shopId: shop.id,
          category: 'system',
          tone: 'info',
          badgeIcon: 'local_fire_department',
          badgeBg: '#FFEDD5',
          badgeColor: '#EA580C',
          title: 'Protect your workshop streak!',
          subtitle: `You have an active ${shop.streak_current}-day streak at risk. Log a cut, payment, or measurement before midnight.`,
          actionLabel: 'Open Dashboard',
          actionHref: '/dashboard',
        });
        sentAlertKeys.add(alertKey);
        streakRemindersSent++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    segmentExecuted: {
      morning: runMorning,
      midday: runMidday,
      evening: runEvening,
    },
    morningDeliveriesNotified,
    morningKickstartsNotified,
    stuckOrdersNotified,
    birthdaysNotified,
    overdueDigestsSent,
    calendarEventsNotified,
    readyBalanceNotified,
    stagnantOrdersNotified,
    streakRemindersSent,
  });
}
