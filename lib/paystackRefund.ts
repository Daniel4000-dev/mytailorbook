import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/** Refunds the nominal trial-verification charge (see startFreeTrial in
 *  app/actions/payments.ts) exactly once, no matter which of the two
 *  racing callers gets here first — the Paystack webhook's charge.success
 *  handler, or confirmFreeTrial's faster client-driven path. Both call
 *  this with the same reference; reusing the payment_webhook_events
 *  dedupe table (already used for webhook-body and confirm-payment replay
 *  protection) means whichever one wins the insert is the one that
 *  actually calls Paystack, so the card is never refunded twice.
 *
 *  Must be called unconditionally once the nominal charge is confirmed
 *  successful — including when the trial itself is then rejected (e.g. a
 *  non-reusable authorization) — since the charge already happened on the
 *  customer's real card either way. A refund is not instant: Paystack
 *  takes 5-10 business days for card refunds and reports final outcome
 *  asynchronously via refund.processed/refund.failed webhooks (see
 *  app/api/webhooks/paystack), not the response to this call. */
export async function refundTrialChargeOnce(admin: AdminClient, reference: string) {
  const { error: dedupeError } = await admin
    .from('payment_webhook_events')
    .insert({ body_hash: `trial_refund:${reference}`, event_type: 'trial_refund' });
  if (dedupeError) return; // already refunded (or being refunded) by the other path

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) {
    console.error(`Trial refund skipped for ${reference}: missing PAYSTACK_SECRET_KEY`);
    return;
  }

  try {
    const refundResponse = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: reference }),
    });
    const refundData = await refundResponse.json();
    if (!refundResponse.ok || !refundData.status) {
      // This is the synchronous accept/reject only — Paystack still
      // reports final success/failure later via webhook. Not fatal to
      // trial activation, but needs a human to notice and manually refund
      // a real card charge if it never completes.
      console.error(`Trial refund request REJECTED for ${reference} — needs manual refund:`, refundData);
    }
  } catch (err) {
    console.error(`Trial refund request FAILED for ${reference} — needs manual refund:`, err);
  }
}
