import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordSubscriptionEvent } from '@/lib/subscriptionEvents';
import { refundTrialChargeOnce } from '@/lib/paystackRefund';
import { TRIAL_LENGTH_DAYS } from '@/lib/subscription';

type AdminClient = ReturnType<typeof createAdminClient>;

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
        const { customer, metadata, amount, authorization, reference } = event.data;
        const shopId = metadata?.shop_id;
        if (!shopId) break;

        if (metadata?.trial) {
          // This is the nominal trial-verification charge (see
          // startFreeTrial in app/actions/payments.ts), not a real
          // payment — activate the trial and refund it, don't mark the
          // shop 'active'. confirmFreeTrial does the same writes from the
          // client side for immediacy; both are idempotent updates, and
          // the refund itself is deduped separately so it only fires once.
          //
          // The card was genuinely charged at this point regardless of
          // what happens next — refund unconditionally, even if the trial
          // itself gets rejected below (non-reusable authorization).
          await refundTrialChargeOnce(supabaseAdmin, reference);

          // Paystack: "You should only attempt to use the
          // authorization_code if [reusable] returns true" — a
          // non-reusable authorization would otherwise silently pass here
          // and only fail 30 days later when the cron tries to actually
          // bill it (app/api/cron/subscription-grace).
          if (!authorization?.authorization_code || !authorization?.reusable) {
            console.error(`Trial charge ${reference} has no reusable authorization — trial not started`);
            break;
          }

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
            })
            .eq('id', shopId);

          await recordSubscriptionEvent(supabaseAdmin, {
            shopId,
            eventType: 'trial_started',
            status: 'trialing',
          });

          break;
        }

        await supabaseAdmin
          .from('shops')
          .update({
            paystack_customer_code: customer.customer_code,
            subscription_status: 'active',
            grace_expires_at: null,
          })
          .eq('id', shopId);

        await recordSubscriptionEvent(supabaseAdmin, {
          shopId,
          eventType: event.event,
          status: 'active',
          amountKobo: typeof amount === 'number' ? amount : undefined,
        });

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

        await recordSubscriptionEvent(supabaseAdmin, {
          customerCode: customer.customer_code,
          eventType: event.event,
          status: 'active',
        });

        break;
      }

      case 'subscription.disable':
      case 'subscription.not_renew': {
        const { customer } = event.data;

        await supabaseAdmin
          .from('shops')
          .update({ subscription_status: 'canceled', grace_expires_at: null })
          .eq('paystack_customer_code', customer.customer_code);

        await recordSubscriptionEvent(supabaseAdmin, {
          customerCode: customer.customer_code,
          eventType: event.event,
          status: 'canceled',
        });

        break;
      }

      case 'invoice.payment_failed': {
        // Renewal charge failed — start the 3-day grace window (see
        // migration 0026). The shop keeps full Premium access through the
        // whole grace window (lib/subscription.ts and the DB-level quota
        // triggers in migration 0033 both treat 'past_due' the same as
        // 'active') while Paystack retries the charge, or the owner fixes
        // their card manually — a fresh charge.success/subscription.create
        // webhook flips it straight back to 'active' if that succeeds. The
        // daily cron in app/api/cron/subscription-grace fully demotes to
        // 'free' only once grace_expires_at passes without recovery.
        const { customer } = event.data;
        const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

        await supabaseAdmin
          .from('shops')
          .update({
            subscription_status: 'past_due',
            grace_expires_at: new Date(Date.now() + GRACE_PERIOD_MS).toISOString(),
          })
          .eq('paystack_customer_code', customer.customer_code);

        await recordSubscriptionEvent(supabaseAdmin, {
          customerCode: customer.customer_code,
          eventType: event.event,
          status: 'past_due',
        });

        break;
      }

      // The initial refund API call (refundTrialChargeOnce, in the
      // charge.success/trial branch above) only confirms Paystack
      // *accepted the request* — refunds are asynchronous (card refunds
      // take 5-10 business days) and these events carry the actual
      // outcome. Nothing in our billing state depends on a trial refund
      // completing (the trial is already active either way), so this is
      // pure observability: a failed/stuck trial refund otherwise has no
      // visibility beyond Paystack's own email to us.
      case 'refund.failed':
      case 'refund.processing':
      case 'refund.processed': {
        const reference = event.data.transaction_reference || event.data.transaction?.reference;
        const customerCode = event.data.customer?.customer_code;
        if (event.event === 'refund.failed') {
          console.error(`Refund FAILED for transaction ${reference} — needs manual refund:`, event.data);
        }
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
    console.error('Webhook error:', err);
    // Let a genuine retry (same body, same hash) go through — otherwise
    // this failed attempt would permanently block reprocessing.
    await supabaseAdmin.from('payment_webhook_events').delete().eq('body_hash', bodyHash);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
