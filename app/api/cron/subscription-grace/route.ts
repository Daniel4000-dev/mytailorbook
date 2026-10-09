import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToShop } from '@/lib/push';
import { recordSubscriptionEvent } from '@/lib/subscriptionEvents';
import { validateCronEnvironment, getBillingEnv } from '@/lib/billing/environment';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_RENEWAL_WINDOW_MS = 3 * DAY_MS;

export async function GET(request: NextRequest) {
  try {
    validateCronEnvironment();
  } catch (err: any) {
    console.error('Cron environment validation failed:', err.message);
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const authBuf = Buffer.from(authHeader ?? '');
  const expectedBuf = Buffer.from(expected);
  const isAuthorized = authBuf.length === expectedBuf.length && crypto.timingSafeEqual(authBuf, expectedBuf);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  let remindedUpcoming = 0, remindedPastDue = 0, remindedCanceled = 0;
  let demoted = 0, demotedCanceled = 0, trialsConverted = 0, trialsFailed = 0;

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  const billingEnv = getBillingEnv();
  const CONVERSION_ENABLED = process.env.SUBSCRIPTION_CONVERSION_ENABLED === 'true';

  const { data: endingTrials, error: endingTrialsError } = await admin
    .from('shops')
    .select('id, paystack_customer_code, paystack_authorization_code, trial_plan_code')
    .eq('subscription_status', 'trialing')
    .eq('paystack_environment', billingEnv)
    .lte('trial_ends_at', now.toISOString());

  if (endingTrialsError) {
    return NextResponse.json({ ok: false, error: endingTrialsError.message }, { status: 500 });
  }

  if (endingTrials && endingTrials.length > 0) {
    if (!CONVERSION_ENABLED) {
      console.log('SUBSCRIPTION_CONVERSION_ENABLED is false. Skipping POST /subscription for trials.');
    } else {
      for (const shop of endingTrials) {
        // Atomic claim: try to move status from 'trialing' to 'converting'
        const { data: claimed, error: claimError } = await admin
          .from('shops')
          .update({ subscription_status: 'converting' })
          .eq('id', shop.id)
          .eq('subscription_status', 'trialing')
          .eq('paystack_environment', billingEnv)
          .select('id')
          .single();

        if (claimError || !claimed) {
          console.log(`Failed to claim trial conversion for shop ${shop.id} — skipping.`);
          continue;
        }

        if (!shop.paystack_customer_code || !shop.paystack_authorization_code || !shop.trial_plan_code) {
          console.error(`Trial ${shop.id} missing billing details at conversion — dropping to conversion_failed`);
          await admin.from('shops').update({ subscription_status: 'conversion_failed', trial_ends_at: null }).eq('id', shop.id);
          trialsFailed++;
          continue;
        }

        try {
          const subResponse = await fetch('https://api.paystack.co/subscription', {
            method: 'POST',
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer: shop.paystack_customer_code,
              plan: shop.trial_plan_code,
              authorization: shop.paystack_authorization_code,
            }),
          });
          const subData = await subResponse.json();

          if (!subResponse.ok || !subData.status) {
            console.error(`Trial conversion charge failed for shop ${shop.id}:`, subData);
            await admin
              .from('shops')
              .update({ subscription_status: 'conversion_failed' })
              .eq('id', shop.id);
            await recordSubscriptionEvent(admin, { shopId: shop.id, eventType: 'trial_conversion_failed', status: 'conversion_failed' });
            await sendPushToShop(shop.id, null, {
              title: 'Free trial ended',
              body: "Your trial ended and we couldn't charge your card. Please update your payment method to resubscribe.",
              url: '/settings',
            });
            trialsFailed++;
            console.log(JSON.stringify({ event: 'trial_conversion_failure', shopId: shop.id, environment: billingEnv, status: 'conversion_failed', timestamp: new Date().toISOString() }));
            continue;
          }

          await admin
            .from('shops')
            .update({
              paystack_subscription_code: subData.data.subscription_code,
              subscription_plan: shop.trial_plan_code,
              subscription_status: 'active',
              current_period_end: subData.data.next_payment_date || null,
              trial_ends_at: null,
            })
            .eq('id', shop.id);
          await recordSubscriptionEvent(admin, { shopId: shop.id, eventType: 'trial_converted', status: 'active' });
          await sendPushToShop(shop.id, null, {
            title: 'Trial ended — you\'re on Premium',
            body: 'Your free trial just ended and your card was charged for Premium. Thanks for continuing with MyStitchBook!',
            url: '/settings',
          });
          trialsConverted++;
          console.log(JSON.stringify({ event: 'trial_conversion_success', shopId: shop.id, environment: billingEnv, status: 'active', timestamp: new Date().toISOString(), reference: subData.data.subscription_code }));
        } catch (err) {
          console.error(`Trial conversion request threw for shop ${shop.id}:`, err);
          await admin.from('shops').update({ subscription_status: 'conversion_failed' }).eq('id', shop.id);
          trialsFailed++;
          console.log(JSON.stringify({ event: 'trial_conversion_error', shopId: shop.id, environment: billingEnv, status: 'conversion_failed', timestamp: new Date().toISOString() }));
        }
      }
    }
  }

  // 1. Upcoming renewal reminder
  const { data: renewingSoon } = await admin
    .from('shops')
    .select('id, current_period_end, last_billing_reminder_sent_at')
    .eq('subscription_status', 'active')
    .eq('paystack_environment', billingEnv)
    .not('paystack_subscription_code', 'is', null)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', new Date(now.getTime() + UPCOMING_RENEWAL_WINDOW_MS).toISOString())
    .gt('current_period_end', now.toISOString());

  for (const shop of renewingSoon || []) {
    if (shop.last_billing_reminder_sent_at && shop.last_billing_reminder_sent_at >= todayStart) continue;
    await sendPushToShop(shop.id, null, { title: 'Subscription renewing soon', body: 'Your MyStitchBook subscription renews in the next few days. Make sure your card on file is up to date.', url: '/settings' });
    await admin.from('shops').update({ last_billing_reminder_sent_at: now.toISOString() }).eq('id', shop.id);
    remindedUpcoming++;
  }

  // 2. Past-due reminder
  const { data: pastDue } = await admin
    .from('shops')
    .select('id, grace_expires_at, last_billing_reminder_sent_at')
    .eq('subscription_status', 'past_due')
    .eq('paystack_environment', billingEnv)
    .not('grace_expires_at', 'is', null)
    .gt('grace_expires_at', now.toISOString());

  for (const shop of pastDue || []) {
    if (shop.last_billing_reminder_sent_at && shop.last_billing_reminder_sent_at >= todayStart) continue;
    const daysLeft = Math.max(1, Math.ceil((new Date(shop.grace_expires_at).getTime() - now.getTime()) / DAY_MS));
    await sendPushToShop(shop.id, null, { title: 'Payment failed', body: `We couldn't renew your subscription. You have ${daysLeft} day${daysLeft === 1 ? '' : 's'} left before your plan reverts to Free.`, url: '/settings' });
    await admin.from('shops').update({ last_billing_reminder_sent_at: now.toISOString() }).eq('id', shop.id);
    remindedPastDue++;
  }

  // 3. Grace expired -> free
  const { data: expired } = await admin
    .from('shops')
    .select('id')
    .eq('subscription_status', 'past_due')
    .eq('paystack_environment', billingEnv)
    .not('grace_expires_at', 'is', null)
    .lte('grace_expires_at', now.toISOString());

  if (expired && expired.length > 0) {
    await admin.from('shops').update({ subscription_status: 'free', grace_expires_at: null }).in('id', expired.map((s) => s.id));
    demoted = expired.length;
    await Promise.all(expired.map((shop) => sendPushToShop(shop.id, null, { title: 'Reverted to Free plan', body: 'Your grace period ended without a successful payment, so your account is now on the Free plan.', url: '/settings' })));
  }

  // 4. Canceled, period ending soon reminder
  const { data: canceledSoon } = await admin
    .from('shops')
    .select('id, current_period_end, last_billing_reminder_sent_at')
    .eq('subscription_status', 'active')
    .eq('paystack_environment', billingEnv)
    .is('paystack_subscription_code', null)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', new Date(now.getTime() + UPCOMING_RENEWAL_WINDOW_MS).toISOString())
    .gt('current_period_end', now.toISOString());

  for (const shop of canceledSoon || []) {
    if (shop.last_billing_reminder_sent_at && shop.last_billing_reminder_sent_at >= todayStart) continue;
    await sendPushToShop(shop.id, null, { title: 'Premium ending soon', body: 'Your canceled subscription keeps Premium until your current billing period ends in the next few days.', url: '/settings' });
    await admin.from('shops').update({ last_billing_reminder_sent_at: now.toISOString() }).eq('id', shop.id);
    remindedCanceled++;
  }

  // 5. Canceled expired -> free
  const { data: canceledExpired } = await admin
    .from('shops')
    .select('id')
    .eq('subscription_status', 'active')
    .eq('paystack_environment', billingEnv)
    .is('paystack_subscription_code', null)
    .not('current_period_end', 'is', null)
    .lte('current_period_end', now.toISOString());

  if (canceledExpired && canceledExpired.length > 0) {
    await admin.from('shops').update({ subscription_status: 'free' }).in('id', canceledExpired.map((s) => s.id));
    demotedCanceled = canceledExpired.length;
    await Promise.all(canceledExpired.map((shop) => sendPushToShop(shop.id, null, { title: 'Reverted to Free plan', body: 'Your canceled subscription\'s billing period has ended.', url: '/settings' })));
  }

  return NextResponse.json({ ok: true, trialsConverted, trialsFailed, remindedUpcoming, remindedPastDue, remindedCanceled, demoted, demotedCanceled });
}
