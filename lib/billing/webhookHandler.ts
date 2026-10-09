import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordSubscriptionEvent } from '@/lib/subscriptionEvents';
import { refundTrialChargeOnce } from '@/lib/paystackRefund';
import { TRIAL_LENGTH_DAYS } from '@/lib/subscription';
import { validateWebhookEnvironment } from '@/lib/billing/environment';

export async function handlePaystackWebhook(req: Request, mode: 'live' | 'test') {
  try {
    validateWebhookEnvironment(mode);
  } catch (err: any) {
    console.error(`Webhook environment validation failed:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 403 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Missing secret' }, { status: 500 });

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const expectedHash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const signatureBuf = signature ? Buffer.from(signature, 'hex') : null;
  const isValid = signatureBuf !== null && signatureBuf.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf);

  if (!isValid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  const event = JSON.parse(rawBody);
  const supabaseAdmin = createAdminClient();

  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const { error: dedupeError } = await supabaseAdmin
    .from('payment_webhook_events')
    .insert({ body_hash: bodyHash, event_type: event.event });

  if (dedupeError) {
    if (dedupeError.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  try {
    switch (event.event) {
      case 'charge.success': {
        const { customer, metadata, amount, authorization, reference } = event.data;
        const shopId = metadata?.shop_id;
        if (!shopId) break;

        const { data: currentShop } = await supabaseAdmin.from('shops').select('paystack_environment').eq('id', shopId).single();
        if (currentShop && currentShop.paystack_environment && currentShop.paystack_environment !== mode) {
          throw new Error('Environment mismatch on charge.success');
        }

        if (metadata?.trial) {
          await refundTrialChargeOnce(supabaseAdmin, reference);
          if (!authorization?.authorization_code || !authorization?.reusable) break;

          await supabaseAdmin
            .from('shops')
            .update({
              paystack_customer_code: customer.customer_code,
              paystack_authorization_code: authorization.authorization_code,
              trial_plan_code: metadata.trial_plan_code || null,
              subscription_status: 'trialing',
              trial_ends_at: new Date(Date.now() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000).toISOString(),
              trial_used_at: new Date().toISOString(),
              grace_expires_at: null,
              paystack_environment: mode,
            })
            .eq('id', shopId);
          
          await recordSubscriptionEvent(supabaseAdmin, { shopId, eventType: 'trial_started', status: 'trialing' });
          break;
        }

        await supabaseAdmin
          .from('shops')
          .update({
            paystack_customer_code: customer.customer_code,
            subscription_status: 'active',
            grace_expires_at: null,
            paystack_environment: mode,
          })
          .eq('id', shopId);
          
        await recordSubscriptionEvent(supabaseAdmin, { shopId, eventType: event.event, status: 'active', amountKobo: typeof amount === 'number' ? amount : undefined });
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
          .eq('paystack_customer_code', customer.customer_code)
          .eq('paystack_environment', mode);
          
        await recordSubscriptionEvent(supabaseAdmin, { customerCode: customer.customer_code, eventType: event.event, status: 'active' });
        break;
      }

      case 'subscription.disable':
      case 'subscription.not_renew': {
        const { customer } = event.data;
        await supabaseAdmin
          .from('shops')
          .update({ subscription_status: 'canceled', grace_expires_at: null })
          .eq('paystack_customer_code', customer.customer_code)
          .eq('paystack_environment', mode);
          
        await recordSubscriptionEvent(supabaseAdmin, { customerCode: customer.customer_code, eventType: event.event, status: 'canceled' });
        break;
      }

      case 'invoice.payment_failed': {
        const { customer } = event.data;
        const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
        await supabaseAdmin
          .from('shops')
          .update({
            subscription_status: 'past_due',
            grace_expires_at: new Date(Date.now() + GRACE_PERIOD_MS).toISOString(),
          })
          .eq('paystack_customer_code', customer.customer_code)
          .eq('paystack_environment', mode);
          
        await recordSubscriptionEvent(supabaseAdmin, { customerCode: customer.customer_code, eventType: event.event, status: 'past_due' });
        break;
      }

      case 'refund.failed':
      case 'refund.processing':
      case 'refund.processed': {
        const customerCode = event.data.customer?.customer_code;
        await recordSubscriptionEvent(supabaseAdmin, {
          customerCode,
          eventType: event.event,
          status: event.event === 'refund.failed' ? 'refund_failed' : 'refund_pending',
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    await supabaseAdmin.from('payment_webhook_events').delete().eq('body_hash', bodyHash);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
