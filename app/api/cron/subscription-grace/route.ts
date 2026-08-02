import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToShop } from '@/lib/push';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_RENEWAL_WINDOW_MS = 3 * DAY_MS;

/**
 * Daily billing-lifecycle sweep: reminds shops of an upcoming renewal,
 * reminds past_due shops how many grace days are left, demotes any shop
 * whose grace_expires_at has passed back to the free tier (see migration
 * 0026 and the invoice.payment_failed handler in app/api/webhooks/
 * paystack), and — separately — demotes a canceled subscription
 * (paystack_subscription_code cleared by cancelSubscriptionAction, see
 * app/actions/payments.ts) once its already-paid-for current_period_end
 * actually passes, not the moment it was canceled. A canceled
 * subscription is never touched by a Paystack renewal webhook again (there
 * is no more renewal attempt to fail or succeed), so this sweep is the
 * only thing that ever moves it off 'active' once its paid time is up.
 * Every shop keeps full access to its own data throughout — this job only
 * ever changes subscription_status/limits, never touches orders/customers.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  // Timing-safe comparison — this endpoint can flip real shops off Premium,
  // so it deserves the same care as the webhook signature check.
  const authBuf = Buffer.from(authHeader ?? '');
  const expectedBuf = Buffer.from(expected);
  const isAuthorized =
    authBuf.length === expectedBuf.length && crypto.timingSafeEqual(authBuf, expectedBuf);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  let remindedUpcoming = 0;
  let remindedPastDue = 0;
  let remindedCanceled = 0;
  let demoted = 0;
  let demotedCanceled = 0;

  // 1. Upcoming renewal reminder — active, still-auto-renewing
  // subscriptions renewing within 3 days that haven't been reminded today
  // yet. Excludes canceled-but-not-yet-expired shops (no
  // paystack_subscription_code) — those get their own reminder below,
  // since "renews soon, check your card" would be wrong for a
  // subscription that's specifically not renewing.
  const { data: renewingSoon, error: renewingError } = await admin
    .from('shops')
    .select('id, current_period_end, last_billing_reminder_sent_at')
    .eq('subscription_status', 'active')
    .not('paystack_subscription_code', 'is', null)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', new Date(now.getTime() + UPCOMING_RENEWAL_WINDOW_MS).toISOString())
    .gt('current_period_end', now.toISOString());

  if (renewingError) {
    return NextResponse.json({ ok: false, error: renewingError.message }, { status: 500 });
  }

  for (const shop of renewingSoon || []) {
    if (shop.last_billing_reminder_sent_at && shop.last_billing_reminder_sent_at >= todayStart) continue;

    await sendPushToShop(shop.id, null, {
      title: 'Subscription renewing soon',
      body: 'Your MyStitchBook subscription renews in the next few days. Make sure your card on file is up to date.',
      url: '/settings',
    });
    await admin.from('shops').update({ last_billing_reminder_sent_at: now.toISOString() }).eq('id', shop.id);
    remindedUpcoming++;
  }

  // 2. Past-due reminder — grace window still open, not reminded today yet.
  const { data: pastDue, error: pastDueError } = await admin
    .from('shops')
    .select('id, grace_expires_at, last_billing_reminder_sent_at')
    .eq('subscription_status', 'past_due')
    .not('grace_expires_at', 'is', null)
    .gt('grace_expires_at', now.toISOString());

  if (pastDueError) {
    return NextResponse.json({ ok: false, error: pastDueError.message }, { status: 500 });
  }

  for (const shop of pastDue || []) {
    if (shop.last_billing_reminder_sent_at && shop.last_billing_reminder_sent_at >= todayStart) continue;

    const daysLeft = Math.max(1, Math.ceil((new Date(shop.grace_expires_at).getTime() - now.getTime()) / DAY_MS));
    await sendPushToShop(shop.id, null, {
      title: 'Payment failed',
      body: `We couldn't renew your subscription. You have ${daysLeft} day${daysLeft === 1 ? '' : 's'} left before your plan reverts to Free — update your payment method to keep premium features.`,
      url: '/settings',
    });
    await admin.from('shops').update({ last_billing_reminder_sent_at: now.toISOString() }).eq('id', shop.id);
    remindedPastDue++;
  }

  // 3. Grace expired — demote to free. Nothing is deleted or locked; only
  // subscription_status changes, so order/staff/analytics gates (which key
  // off this column) start applying again on the next request.
  const { data: expired, error: expiredError } = await admin
    .from('shops')
    .select('id')
    .eq('subscription_status', 'past_due')
    .not('grace_expires_at', 'is', null)
    .lte('grace_expires_at', now.toISOString());

  if (expiredError) {
    return NextResponse.json({ ok: false, error: expiredError.message }, { status: 500 });
  }

  if (expired && expired.length > 0) {
    const { error: demoteError } = await admin
      .from('shops')
      .update({ subscription_status: 'free', grace_expires_at: null })
      .in('id', expired.map((s) => s.id));

    if (demoteError) {
      return NextResponse.json({ ok: false, error: demoteError.message }, { status: 500 });
    }
    demoted = expired.length;

    await Promise.all(
      expired.map((shop) =>
        sendPushToShop(shop.id, null, {
          title: 'Reverted to Free plan',
          body: 'Your grace period ended without a successful payment, so your account is now on the Free plan. Resubscribe anytime from Settings.',
          url: '/settings',
        })
      )
    );
  }

  // 4. Canceled, period ending soon reminder — mirrors block 1, but for a
  // subscription that's specifically not auto-renewing.
  const { data: canceledSoon, error: canceledSoonError } = await admin
    .from('shops')
    .select('id, current_period_end, last_billing_reminder_sent_at')
    .eq('subscription_status', 'active')
    .is('paystack_subscription_code', null)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', new Date(now.getTime() + UPCOMING_RENEWAL_WINDOW_MS).toISOString())
    .gt('current_period_end', now.toISOString());

  if (canceledSoonError) {
    return NextResponse.json({ ok: false, error: canceledSoonError.message }, { status: 500 });
  }

  for (const shop of canceledSoon || []) {
    if (shop.last_billing_reminder_sent_at && shop.last_billing_reminder_sent_at >= todayStart) continue;

    await sendPushToShop(shop.id, null, {
      title: 'Premium ending soon',
      body: 'Your canceled subscription keeps Premium until your current billing period ends in the next few days, then your account moves to the Free plan. Resubscribe anytime.',
      url: '/settings',
    });
    await admin.from('shops').update({ last_billing_reminder_sent_at: now.toISOString() }).eq('id', shop.id);
    remindedCanceled++;
  }

  // 5. Canceled subscription's already-paid-for period has actually
  // ended — demote to free now, not a day sooner. This is the only path
  // that ever moves a canceled shop off 'active': there's no more renewal
  // attempt left to fail or succeed once paystack_subscription_code is
  // cleared, so nothing else would ever flip this on its own.
  const { data: canceledExpired, error: canceledExpiredError } = await admin
    .from('shops')
    .select('id')
    .eq('subscription_status', 'active')
    .is('paystack_subscription_code', null)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', now.toISOString());

  if (canceledExpiredError) {
    return NextResponse.json({ ok: false, error: canceledExpiredError.message }, { status: 500 });
  }

  if (canceledExpired && canceledExpired.length > 0) {
    const { error: demoteCanceledError } = await admin
      .from('shops')
      .update({ subscription_status: 'free' })
      .in('id', canceledExpired.map((s) => s.id));

    if (demoteCanceledError) {
      return NextResponse.json({ ok: false, error: demoteCanceledError.message }, { status: 500 });
    }
    demotedCanceled = canceledExpired.length;

    await Promise.all(
      canceledExpired.map((shop) =>
        sendPushToShop(shop.id, null, {
          title: 'Reverted to Free plan',
          body: 'Your canceled subscription\'s billing period has ended, so your account is now on the Free plan. Resubscribe anytime from Settings.',
          url: '/settings',
        })
      )
    );
  }

  return NextResponse.json({ ok: true, remindedUpcoming, remindedPastDue, remindedCanceled, demoted, demotedCanceled });
}
