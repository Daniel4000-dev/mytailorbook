'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rateLimit';

/** Starts a Paystack checkout for the current user's shop, returning the
 *  authorization URL to redirect the browser to. Uses the request-scoped
 *  client (not the admin client) so this can only ever act on the actual
 *  logged-in user's own shop — the webhook (app/api/webhooks/paystack)
 *  is what actually flips the shop to 'active' once payment clears.
 *  `interval` picks which Paystack Plan to bill against — each interval
 *  is a separate Plan on Paystack's side (there's no single Plan that can
 *  be billed either monthly or yearly), so the plan code itself encodes
 *  the choice. */
export async function initializeSubscription(interval: 'monthly' | 'yearly' = 'monthly') {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single();

  if (!profile?.shop_id) {
    throw new Error('No shop profile found');
  }

  // Each call hits Paystack's API twice (plan lookup + transaction init) —
  // cap it well above any legitimate retry pattern, just to stop scripted
  // abuse from burning through Paystack's own rate limits on our behalf.
  const { allowed } = await checkRateLimit(`checkout-init:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) {
    throw new Error('Too many checkout attempts — please try again in a few minutes.');
  }

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  const PLAN_CODE = interval === 'yearly'
    ? process.env.NEXT_PUBLIC_PAYSTACK_YEARLY_PLAN_CODE
    : process.env.NEXT_PUBLIC_PAYSTACK_PLAN_CODE;

  if (!PAYSTACK_SECRET || !PLAN_CODE) {
    throw new Error('Server configuration error');
  }

  // Derived from the actual incoming request, not the hardcoded production
  // domain — a shop testing this from localhost (or a Vercel preview URL)
  // previously got redirected back to production after paying, where they
  // have no session, and landed on /login instead of back in the app. The
  // popup flow below doesn't navigate away at all (so this bug can't
  // happen there), but Paystack's API still requires *some* callback_url,
  // and older/unsupported clients fall back to the redirect flow, so this
  // needs to be correct regardless.
  const headersList = await headers();
  const host = headersList.get('host');
  const proto = headersList.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : undefined;

  // Paystack's transaction/initialize rejects the request with
  // "Invalid Amount Sent" if `amount` is omitted, even when a `plan` is
  // given — it doesn't infer the amount from the plan. Look it up so the
  // price only has to be maintained in one place (the Paystack plan itself).
  const planResponse = await fetch(`https://api.paystack.co/plan/${PLAN_CODE}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const planData = await planResponse.json();
  if (!planResponse.ok || !planData.status) {
    console.error('Paystack plan lookup failed:', planData);
    throw new Error('Server configuration error');
  }
  const amount = planData.data.amount as number;

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount,
      plan: PLAN_CODE,
      ...(origin ? { callback_url: `${origin}/settings?payment=success` } : {}),
      metadata: {
        shop_id: profile.shop_id,
        user_id: user.id,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.error('Paystack init failed:', data);
    throw new Error(data.message || 'Payment initialization failed');
  }

  return {
    authorizationUrl: data.data.authorization_url as string,
    // Lets the client resume this exact already-initialized transaction
    // inside Paystack's inline popup instead of a full-page redirect — no
    // navigation away from the app at all, so the redirect/session bug
    // above can't happen through this path regardless of environment.
    accessCode: data.data.access_code as string,
    reference: data.data.reference as string,
  };
}
