import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    return NextResponse.json({ error: 'Missing secret' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const expectedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  // Timing-safe comparison — this is Paystack's own signature check, so a
  // plain !== comparison would let an attacker infer the correct hash one
  // byte at a time via response-time differences.
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const signatureBuf = signature ? Buffer.from(signature, 'hex') : null;
  const isValid =
    signatureBuf !== null &&
    signatureBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, signatureBuf);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const supabaseAdmin = createAdminClient();

  // Signature verification proves this came from Paystack, but not that
  // it's fresh — a captured request replayed later still signs correctly.
  // Dedupe on the exact body: insert the hash before processing, and if
  // that insert conflicts, this exact payload was already handled, so
  // return success without reprocessing (this also covers Paystack's own
  // automatic retries, which resend identical bodies). If processing
  // itself throws, the hash is removed again so a legitimate retry after
  // a transient failure on our end can still go through.
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const { error: dedupeError } = await supabaseAdmin
    .from('payment_webhook_events')
    .insert({ body_hash: bodyHash, event_type: event.event });

  if (dedupeError) {
    if (dedupeError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Webhook dedupe insert failed:', dedupeError);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  try {
    switch (event.event) {
      case 'charge.success': {
        // First successful charge (or recurring). If Paystack ever calls
        // this without our own metadata (e.g. a payment initiated outside
        // our checkout flow), there's no shop to attribute it to — skip
        // rather than guess.
        const { customer, metadata } = event.data;
        const shopId = metadata?.shop_id;
        if (!shopId) break;

        await supabaseAdmin
          .from('shops')
          .update({
            paystack_customer_code: customer.customer_code,
            subscription_status: 'active',
            grace_expires_at: null,
          })
          .eq('id', shopId);

        break;
      }

      case 'subscription.create': {
        const { customer, subscription_code, plan, next_payment_date } = event.data;

        await supabaseAdmin
          .from('shops')
          .update({
            paystack_subscription_code: subscription_code,
            subscription_plan: plan.plan_code,
            subscription_status: 'active',
            current_period_end: next_payment_date || null,
            grace_expires_at: null,
          })
          .eq('paystack_customer_code', customer.customer_code);

        break;
      }

      case 'subscription.disable':
      case 'subscription.not_renew': {
        const { customer } = event.data;

        await supabaseAdmin
          .from('shops')
          .update({ subscription_status: 'canceled', grace_expires_at: null })
          .eq('paystack_customer_code', customer.customer_code);

        break;
      }

      case 'invoice.payment_failed': {
        // Renewal charge failed — start the 3-day grace window (see
        // migration 0026). The shop drops to free-tier limits immediately
        // (checkOrderQuota treats anything but 'active' as free), but stays
        // reachable/undeleted through the grace period in case the retry
        // or a manual re-auth succeeds. The daily cron in
        // app/api/cron/subscription-grace fully demotes to 'free' once
        // grace_expires_at passes without recovery.
        const { customer } = event.data;
        const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

        await supabaseAdmin
          .from('shops')
          .update({
            subscription_status: 'past_due',
            grace_expires_at: new Date(Date.now() + GRACE_PERIOD_MS).toISOString(),
          })
          .eq('paystack_customer_code', customer.customer_code);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    // Let a genuine retry (same body, same hash) go through — otherwise
    // this failed attempt would permanently block reprocessing.
    await supabaseAdmin.from('payment_webhook_events').delete().eq('body_hash', bodyHash);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
