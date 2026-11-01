import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAtelierNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  
  const authBuf = Buffer.from(authHeader ?? '');
  const expectedBuf = Buffer.from(expected ?? '');
  // Using try-catch because if lengths don't match, timingSafeEqual throws
  let isAuthorized = false;
  if (authBuf.length === expectedBuf.length && authBuf.length > 0) {
    isAuthorized = crypto.timingSafeEqual(authBuf, expectedBuf);
  }
  
  // Also allow bypassing for testing if CRON_SECRET isn't set
  if (process.env.NODE_ENV === 'development') {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const tomorrowMMDD = tomorrowStr.substring(5);

  let ordersNotified = 0;
  let birthdaysNotified = 0;

  // 1. Stuck orders due tomorrow
  const { data: stuckOrders, error: orderError } = await admin
    .from('orders')
    .select('id, shop_id, customer_name, status')
    .in('status', ['Documented', 'Cutting'])
    .gte('due_date', `${tomorrowStr}T00:00:00Z`)
    .lt('due_date', `${tomorrowStr}T23:59:59Z`);

  if (orderError) {
    console.error('Error fetching stuck orders:', orderError);
  } else if (stuckOrders) {
    for (const order of stuckOrders) {
      await createAtelierNotification({
        shopId: order.shop_id,
        category: 'production',
        tone: 'alert',
        badgeIcon: 'warning',
        badgeBg: '#FEE2E2',
        badgeColor: '#DC2626',
        title: `${order.customer_name}'s order is due tomorrow`,
        subtitle: `Still stuck in ${order.status}`,
        actionLabel: 'View Order',
        actionHref: `/production/${order.id}`,
        orderId: order.id,
      });
      ordersNotified++;
    }
  }

  // 2. Customer birthdays tomorrow
  const { data: birthdayCustomers, error: customerError } = await admin
    .from('customers')
    .select('id, shop_id, full_name, birthdate')
    .eq('birthdate', tomorrowMMDD);

  if (customerError) {
    console.error('Error fetching birthdays:', customerError);
  } else if (birthdayCustomers) {
    for (const customer of birthdayCustomers) {
      await createAtelierNotification({
        shopId: customer.shop_id,
        category: 'clients',
        tone: 'info',
        actorName: customer.full_name,
        badgeIcon: 'cake',
        badgeBg: '#FCE7F3',
        badgeColor: '#DB2777',
        title: `${customer.full_name}'s birthday is tomorrow!`,
        subtitle: 'Reach out and wish them well.',
        actionLabel: 'View Client',
        actionHref: `/customers/${customer.id}`,
      });
      birthdaysNotified++;
    }
  }

  // 3. Weekly Backlog Digest (Mondays)
  const isMonday = now.getDay() === 1; // 0 is Sunday, 1 is Monday
  let overdueDigestsSent = 0;

  if (isMonday) {
    const todayStr = now.toISOString().split('T')[0];
    
    const { data: overdueOrders, error: overdueError } = await admin
      .from('orders')
      .select('shop_id')
      .lt('due_date', `${todayStr}T00:00:00Z`)
      .neq('status', 'Delivered');

    if (overdueError) {
      console.error('Error fetching overdue orders:', overdueError);
    } else if (overdueOrders) {
      const shopOverdueCounts: Record<string, number> = {};
      for (const order of overdueOrders) {
        shopOverdueCounts[order.shop_id] = (shopOverdueCounts[order.shop_id] || 0) + 1;
      }
      
      for (const [shopId, count] of Object.entries(shopOverdueCounts)) {
        await createAtelierNotification({
          shopId,
          category: 'system',
          tone: 'warning',
          badgeIcon: 'warning',
          badgeBg: '#FEF3C7',
          badgeColor: '#D97706',
          title: 'Weekly Backlog Digest',
          subtitle: `You have ${count} overdue order${count === 1 ? '' : 's'} to clear this week. Tap to view your backlog.`,
          actionLabel: 'View Backlog',
          actionHref: '/production',
        });
        overdueDigestsSent++;
      }
    }
  }

  // 4. Calendar Appointments (Today)
  let calendarEventsNotified = 0;
  const todayStr = now.toISOString().split('T')[0];

  const { data: todayEvents, error: eventsError } = await admin
    .from('calendar_events')
    .select('shop_id')
    .eq('date', todayStr);

  if (eventsError) {
    console.error('Error fetching today events:', eventsError);
  } else if (todayEvents) {
    const shopEventCounts: Record<string, number> = {};
    for (const event of todayEvents) {
      shopEventCounts[event.shop_id] = (shopEventCounts[event.shop_id] || 0) + 1;
    }
    
    for (const [shopId, count] of Object.entries(shopEventCounts)) {
      await createAtelierNotification({
        shopId,
        category: 'system',
        tone: 'info',
        badgeIcon: 'calendar_today',
        badgeBg: '#EDE9FE',
        badgeColor: '#7C3AED',
        title: "Today's Schedule",
        subtitle: `You have ${count} appointment${count === 1 ? '' : 's'} scheduled for today.`,
        actionLabel: 'View Calendar',
        actionHref: '/calendar',
      });
      calendarEventsNotified++;
    }
  }

  return NextResponse.json({
    ok: true,
    ordersNotified,
    birthdaysNotified,
    overdueDigestsSent,
    calendarEventsNotified
  });
}
