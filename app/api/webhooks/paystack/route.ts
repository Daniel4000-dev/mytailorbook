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
          })
          .eq('id', shopId);

        break;
      }

      case 'subscription.create': {
        const { customer, subscription_code, plan } = event.data;

        await supabaseAdmin
          .from('shops')
          .update({
            paystack_subscription_code: subscription_code,
            subscription_plan: plan.plan_code,
            subscription_status: 'active',
          })
          .eq('paystack_customer_code', customer.customer_code);

        break;
      }

      case 'subscription.disable':
      case 'subscription.not_renew': {
        const { customer } = event.data;

        await supabaseAdmin
          .from('shops')
          .update({ subscription_status: 'canceled' })
          .eq('paystack_customer_code', customer.customer_code);

        break;
      }

      case 'invoice.payment_failed': {
        const { customer } = event.data;

        await supabaseAdmin
          .from('shops')
          .update({ subscription_status: 'past_due' })
          .eq('paystack_customer_code', customer.customer_code);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
