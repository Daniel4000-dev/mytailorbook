'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rateLimit';
import { isOwnerLikeRole } from '@/lib/types';
import { PREMIUM_MONTHLY_PRICE_NGN, PREMIUM_YEARLY_PRICE_NGN, TRIAL_LENGTH_DAYS, TRIAL_VERIFICATION_AMOUNT_NGN } from '@/lib/subscription';
import { refundTrialChargeOnce } from '@/lib/paystackRefund';

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

  // Deliberately doesn't block on this — initializing a transaction moves
  // no money (Paystack only actually charges a card once the user
  // completes payment on their own hosted page, which Paystack protects
  // itself), and this action already requires an authenticated shop owner,
  // so there's no anonymous-abuse angle to defend against, only a caller
  // spamming their own account for no gain. A hard per-user cap here
  // twice locked out a genuine, non-abusive user (retrying after a flaky
  // connection / an in-progress bug) rather than anything resembling
  // abuse — the same mistake real payment integrations avoid by not
  // gating a customer's own "buy" click. This just leaves a trace if a
  // runaway loop (not a human) ever does show up, without ever refusing a
  // real one.
  const { allowed } = await checkRateLimit(`checkout-init:${user.id}`, { limit: 60, windowSeconds: 3600 });
  if (!allowed) {
    console.error(`Unusually high checkout-init volume for user ${user.id} — not blocking, just flagging.`);
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

  // Sent for clarity/logging only — per Paystack's docs, when both `amount`
  // and `plan` are supplied on initialize, `amount` is ignored and the
  // actual charge is whatever the Plan is configured for on Paystack's
  // dashboard. Kept in sync with PREMIUM_MONTHLY/YEARLY_PRICE_NGN so this
  // never *looks* wrong even though Paystack doesn't actually read it here.
  const amount = (interval === 'yearly' ? PREMIUM_YEARLY_PRICE_NGN : PREMIUM_MONTHLY_PRICE_NGN) * 100;

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
      // Card only — Paystack's hosted page otherwise offers bank transfer,
      // USSD, etc. alongside card, but only a card payment creates a
      // reusable authorization Paystack can auto-charge on renewal. A
      // subscription paid for by transfer/USSD would have nothing to bill
      // automatically next period, silently breaking auto-renewal for
      // that shop. Restricting the channel here also skips the
      // method-picker screen entirely — straight to card entry.
      channels: ['card'],
      ...(origin ? { callback_url: `${origin}/settings/billing?payment=success` } : {}),
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

/** Called right after Paystack's popup reports success, so the UI reflects
 *  the upgrade immediately instead of waiting on the webhook — which is the
 *  real source of truth (app/api/webhooks/paystack) but can lag by several
 *  seconds, and never arrives at all against a localhost dev server since
 *  Paystack has no way to reach it. Re-verifies the transaction directly
 *  with Paystack's API (server-to-server, our secret key) rather than
 *  trusting the client's onSuccess callback at face value — a client could
 *  otherwise call this with a fabricated reference to self-upgrade for
 *  free. Also confirms the verified transaction's metadata.shop_id matches
 *  the caller's own shop, so one shop can't activate itself off another
 *  shop's (still-valid) reference.
 *
 *  Paystack's verify endpoint has no concept of expiry — a reference from
 *  a real payment made months ago still verifies as `status: 'success'`
 *  forever. Without deduping, a shop owner could stash the reference from
 *  their very first payment and replay it here any time — after
 *  canceling, after a failed renewal, after their grace period lapses —
 *  to flip straight back to 'active' without ever paying again. Reuses
 *  the same dedupe table the webhook already uses for its own replay
 *  protection (migration 0029): each reference can activate a shop
 *  exactly once. */
export async function confirmSubscriptionPayment(reference: string) {
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

  // A legitimate caller only ever needs this once per real payment — cap
  // well above that so a caller can't cheaply hammer Paystack's verify
  // endpoint (on our account, our rate limits) with a stream of bogus
  // references.
  const { allowed } = await checkRateLimit(`confirm-payment:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) {
    throw new Error('Too many attempts — please try again in a few minutes.');
  }

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) {
    throw new Error('Server configuration error');
  }

  const admin = createAdminClient();

  // Claim this reference before doing anything else — if it's already
  // been used (by an earlier real call, or a replay), this is the only
  // check that actually stops the replay; everything below it would
  // otherwise verify and succeed identically the second time too.
  const { error: dedupeError } = await admin
    .from('payment_webhook_events')
    .insert({ body_hash: `confirm_subscription_payment:${reference}`, event_type: 'confirm_subscription_payment' });

  if (dedupeError) {
    if (dedupeError.code === '23505') {
      // Already processed. Likely our own duplicate call (e.g. both the
      // popup's onSuccess and the redirect-fallback path firing for the
      // same payment) rather than an attack — the shop's already active
      // either way, so this is a harmless no-op, not an error.
      return { success: true };
    }
    console.error('confirmSubscriptionPayment dedupe insert failed:', dedupeError);
    throw new Error('Could not process payment confirmation');
  }

  try {
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.status || verifyData.data?.status !== 'success') {
      throw new Error('Payment could not be verified');
    }

    if (verifyData.data.metadata?.shop_id !== profile.shop_id) {
      throw new Error('Payment does not belong to this shop');
    }

    // Same fields the webhook's charge.success handler sets — this just
    // gets there sooner. If the webhook lands afterward it's a harmless
    // no-op update to the same values.
    await admin
      .from('shops')
      .update({
        paystack_customer_code: verifyData.data.customer.customer_code,
        subscription_status: 'active',
        grace_expires_at: null,
      })
      .eq('id', profile.shop_id);

    return { success: true };
  } catch (err) {
    // Let a genuine retry after a transient failure (verify API hiccup,
    // etc.) go through — otherwise this failed attempt would permanently
    // block ever confirming this reference.
    await admin.from('payment_webhook_events').delete().eq('body_hash', `confirm_subscription_payment:${reference}`);
    throw err;
  }
}

/** Starts a 30-day free trial by running a nominal, immediately-refunded
 *  Paystack charge on the card — Paystack has no deferred-billing option on
 *  a Plan (unlike Stripe's trial_period_days), so this is the only way to
 *  get a reusable authorization_code without actually billing the real
 *  plan price today. See migration 0042 for the schema and
 *  app/api/cron/subscription-grace for how the trial converts to a real
 *  subscription once it ends. Mirrors initializeSubscription's shape and
 *  origin-detection so the same client-side redirect/popup flow works for
 *  both. */
export async function startFreeTrial(interval: 'monthly' | 'yearly' = 'monthly') {
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

  const admin = createAdminClient();

  // Billing lives on the org's primary shop (same resolution as everywhere
  // else in this file) — a trial is an org-wide thing, not per-branch.
  const { data: shop } = await admin
    .from('shops')
    .select('id, org_id, is_primary')
    .eq('id', profile.shop_id)
    .single();
  if (!shop) throw new Error('Shop not found');

  const billingShop = shop.is_primary
    ? shop
    : (await admin.from('shops').select('id').eq('org_id', shop.org_id).eq('is_primary', true).single()).data;
  if (!billingShop) throw new Error('Shop not found');

  const { data: billingState } = await admin
    .from('shops')
    .select('subscription_status, trial_used_at')
    .eq('id', billingShop.id)
    .single();

  // One trial per org, ever — trial_used_at is never cleared (not even on
  // cancel), which is what actually closes the cancel/re-trial loophole.
  if (billingState?.trial_used_at) {
    throw new Error('This shop has already used its free trial');
  }
  if (billingState && billingState.subscription_status !== 'free') {
    throw new Error('This shop is not eligible for a free trial');
  }

  const { allowed } = await checkRateLimit(`trial-init:${user.id}`, { limit: 60, windowSeconds: 3600 });
  if (!allowed) {
    console.error(`Unusually high trial-init volume for user ${user.id} — not blocking, just flagging.`);
  }

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  const PLAN_CODE = interval === 'yearly'
    ? process.env.NEXT_PUBLIC_PAYSTACK_YEARLY_PLAN_CODE
    : process.env.NEXT_PUBLIC_PAYSTACK_PLAN_CODE;
  if (!PAYSTACK_SECRET || !PLAN_CODE) {
    throw new Error('Server configuration error');
  }

  const headersList = await headers();
  const host = headersList.get('host');
  const proto = headersList.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : undefined;

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      // Deliberately NOT the real plan price, and no `plan` field — this
      // transaction only exists to capture a reusable authorization. The
      // real billing plan is remembered in metadata.trial_plan_code and
      // attached later (app/api/cron/subscription-grace), once the trial
      // actually ends.
      amount: TRIAL_VERIFICATION_AMOUNT_NGN * 100,
      channels: ['card'],
      ...(origin ? { callback_url: `${origin}/settings/billing?trial=success` } : {}),
      metadata: {
        shop_id: billingShop.id,
        user_id: user.id,
        trial: true,
        trial_plan_code: PLAN_CODE,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    console.error('Paystack trial init failed:', data);
    throw new Error(data.message || 'Trial initialization failed');
  }

  return {
    authorizationUrl: data.data.authorization_url as string,
    accessCode: data.data.access_code as string,
    reference: data.data.reference as string,
  };
}

/** Called right after Paystack's popup/redirect reports success for a trial
 *  signup — mirrors confirmSubscriptionPayment: re-verifies server-to-
 *  server (never trusts the client's reference at face value) and activates
 *  immediately so the UI doesn't wait on the webhook, which is still the
 *  real source of truth (app/api/webhooks/paystack) and never arrives at
 *  all against a localhost dev server. */
export async function confirmFreeTrial(reference: string) {
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

  const { allowed } = await checkRateLimit(`confirm-trial:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) {
    throw new Error('Too many attempts — please try again in a few minutes.');
  }

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) {
    throw new Error('Server configuration error');
  }

  const admin = createAdminClient();

  // Same dedupe-before-verify pattern as confirmSubscriptionPayment — a
  // trial reference has no expiry on Paystack's side either, so without
  // this a shop could replay its own trial-start reference to re-arm
  // 'trialing' after it lapsed.
  const { error: dedupeError } = await admin
    .from('payment_webhook_events')
    .insert({ body_hash: `confirm_free_trial:${reference}`, event_type: 'confirm_free_trial' });

  if (dedupeError) {
    if (dedupeError.code === '23505') {
      return { success: true };
    }
    console.error('confirmFreeTrial dedupe insert failed:', dedupeError);
    throw new Error('Could not process trial confirmation');
  }

  try {
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.status || verifyData.data?.status !== 'success') {
      throw new Error('Payment could not be verified');
    }
    if (verifyData.data.metadata?.shop_id !== profile.shop_id || !verifyData.data.metadata?.trial) {
      throw new Error('Payment does not belong to this shop\'s trial signup');
    }

    // The card was genuinely charged the nominal verification amount at
    // this point (see startFreeTrial) — refund it unconditionally, even if
    // the trial itself gets rejected below (e.g. a non-reusable
    // authorization). Deduped against the webhook doing the same thing, so
    // the card is only ever refunded once.
    const authorization = verifyData.data.authorization;
    await refundTrialChargeOnce(admin, reference);

    // Paystack: "You should only attempt to use the authorization_code if
    // [reusable] returns true" — a non-reusable authorization would
    // otherwise pass silently here and only fail 30 days later when the
    // cron tries to actually bill it (app/api/cron/subscription-grace),
    // long after the user believed their trial was properly set up.
    if (!authorization?.authorization_code || !authorization?.reusable) {
      throw new Error(`This card does not support recurring billing — try a different card. Your ₦${TRIAL_VERIFICATION_AMOUNT_NGN} verification charge will be refunded within a few business days.`);
    }
    const authorizationCode = authorization.authorization_code;

    const trialEndsAt = new Date(Date.now() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Same fields the webhook's trial branch of charge.success sets — this
    // just gets there sooner. If the webhook lands afterward it's a
    // harmless no-op update to the same values.
    await admin
      .from('shops')
      .update({
        paystack_customer_code: verifyData.data.customer.customer_code,
        paystack_authorization_code: authorizationCode,
        trial_plan_code: verifyData.data.metadata.trial_plan_code || null,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt,
        trial_used_at: new Date().toISOString(),
        grace_expires_at: null,
      })
      .eq('id', profile.shop_id);

    return { success: true, trialEndsAt };
  } catch (err) {
    await admin.from('payment_webhook_events').delete().eq('body_hash', `confirm_free_trial:${reference}`);
    throw err;
  }
}

/** Cancels the caller's own org subscription. Deliberately does NOT flip
 *  subscription_status away from 'active' immediately — the shop already
 *  paid for its current billing period, so it keeps full Premium access
 *  through current_period_end, same as cancelling a subscription
 *  anywhere else reputable. Clearing paystack_subscription_code is what
 *  actually stops the next renewal charge (via Paystack's own disable
 *  call) and is also the signal app/api/cron/subscription-grace uses to
 *  know this shop should drop to Free once its paid period actually ends,
 *  rather than staying 'active' forever with nothing left to renew it. */
export async function cancelSubscriptionAction(): Promise<{ success: true; accessUntil: string | null } | { error: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id, role')
    .eq('id', user.id)
    .single();
  if (!profile?.shop_id) return { error: 'No shop profile found' };
  if (!isOwnerLikeRole(profile.role)) {
    return { error: 'Only the Owner can cancel the subscription' };
  }

  const { allowed } = await checkRateLimit(`cancel-subscription:${user.id}`, { limit: 10, windowSeconds: 3600 });
  if (!allowed) return { error: 'Too many attempts — please try again in a few minutes.' };

  const admin = createAdminClient();

  const { data: shop } = await admin
    .from('shops')
    .select('id, subscription_status, paystack_subscription_code, current_period_end, is_primary, org_id')
    .eq('id', profile.shop_id)
    .single();
  if (!shop) return { error: 'Shop not found' };

  // Billing lives on the org's primary shop — resolve there if this call
  // came from a non-primary branch, same as everywhere else in
  // lib/subscription.ts.
  const billingShop = shop.is_primary
    ? shop
    : (await admin.from('shops').select('id, subscription_status, paystack_subscription_code, current_period_end').eq('org_id', shop.org_id).eq('is_primary', true).single()).data;
  if (!billingShop) return { error: 'Shop not found' };

  // Trialing shops never had a real Paystack subscription created (see
  // migration 0042 — that only happens at trial-end, in
  // app/api/cron/subscription-grace) — nothing to disable on Paystack's
  // side, so this is a pure DB update. trial_used_at is deliberately left
  // untouched: canceling a trial doesn't refund the "used" state, closing
  // the cancel/re-trial loophole startFreeTrial guards against.
  if (billingShop.subscription_status === 'trialing') {
    await admin
      .from('shops')
      .update({ subscription_status: 'free', trial_ends_at: null })
      .eq('id', billingShop.id ?? profile.shop_id);
    return { success: true, accessUntil: null };
  }

  if (!billingShop.paystack_subscription_code) {
    return { error: 'No active subscription to cancel' };
  }

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  if (!PAYSTACK_SECRET) return { error: 'Server configuration error' };

  // Paystack requires the subscription's email_token (not our own secret
  // key alone) to authorize disabling it — fetch it fresh rather than
  // storing it, since it's only ever needed at cancellation time.
  const subResponse = await fetch(`https://api.paystack.co/subscription/${billingShop.paystack_subscription_code}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const subData = await subResponse.json();
  if (!subResponse.ok || !subData.status || !subData.data?.email_token) {
    console.error('Paystack subscription lookup failed:', subData);
    return { error: 'Could not look up your subscription — please try again' };
  }

  const disableResponse = await fetch('https://api.paystack.co/subscription/disable', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: billingShop.paystack_subscription_code, token: subData.data.email_token }),
  });
  const disableData = await disableResponse.json();
  if (!disableResponse.ok || !disableData.status) {
    console.error('Paystack subscription disable failed:', disableData);
    return { error: 'Could not cancel your subscription — please try again' };
  }

  await admin
    .from('shops')
    .update({ paystack_subscription_code: null })
    .eq('id', billingShop.id ?? profile.shop_id);

  return { success: true, accessUntil: billingShop.current_period_end };
}
