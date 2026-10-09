-- ============================================================
-- Free trial: capture a card up front, bill nothing for 30 days
-- ============================================================
-- Paystack has no native trial-period concept on a Plan (unlike Stripe) —
-- attaching a subscription to a Plan bills immediately. So a real free
-- trial needs its own state machine on top of the existing Plan-based
-- billing in app/actions/payments.ts and app/api/webhooks/paystack:
--
--   1. app/actions/payments.ts runs a nominal, immediately-refunded charge
--      (Paystack's minimum, not the real plan price) purely to obtain a
--      reusable `authorization_code` — see startFreeTrial/confirmFreeTrial.
--   2. The shop sits in 'trialing' for `trial_ends_at`, with full Premium
--      access (enforced below, mirroring migration 0033's 'active'/
--      'past_due' treatment).
--   3. app/api/cron/subscription-grace calls Paystack's
--      POST /subscription with the saved authorization to create a real,
--      auto-renewing subscription once the trial ends — from that point
--      on, the existing webhook handlers need no further changes.
--
-- trial_used_at is permanent and never cleared (not even on cancel) so a
-- shop can't loop cancel -> re-trial -> cancel for indefinite free
-- Premium — see startFreeTrial's eligibility check.

alter table shops
  add column trial_ends_at timestamptz,
  add column trial_used_at timestamptz,
  add column paystack_authorization_code text,
  add column trial_plan_code text;

alter table shops drop constraint shops_subscription_status_check;
alter table shops add constraint shops_subscription_status_check
  check (subscription_status in ('free', 'trialing', 'active', 'past_due', 'canceled'));

-- Extend the billing-column-tampering guard (migration 0028) to cover the
-- new columns — same rule: only the webhook/cron (service-role, auth.uid()
-- is null) may ever write them.
create or replace function prevent_billing_column_tampering()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.uid() is not null and (
    new.subscription_status is distinct from old.subscription_status or
    new.subscription_plan is distinct from old.subscription_plan or
    new.paystack_customer_code is distinct from old.paystack_customer_code or
    new.paystack_subscription_code is distinct from old.paystack_subscription_code or
    new.current_period_end is distinct from old.current_period_end or
    new.grace_expires_at is distinct from old.grace_expires_at or
    new.last_billing_reminder_sent_at is distinct from old.last_billing_reminder_sent_at or
    new.trial_ends_at is distinct from old.trial_ends_at or
    new.trial_used_at is distinct from old.trial_used_at or
    new.paystack_authorization_code is distinct from old.paystack_authorization_code or
    new.trial_plan_code is distinct from old.trial_plan_code
  ) then
    raise exception 'Billing fields can only be changed by the payment system';
  end if;

  return new;
end;
$$;

-- Trialing shops get the same full Premium access as 'active'/'past_due'
-- (migration 0033) — a trial is meant to feel like the real thing.
create or replace function enforce_free_tier_order_quota()
returns trigger
language plpgsql
security definer
as $$
declare
  target_org_id uuid;
  is_premium boolean;
  order_count integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  select org_id into target_org_id from shops where id = new.shop_id;

  select (subscription_status in ('active', 'past_due', 'trialing')) into is_premium
  from shops
  where org_id = target_org_id and is_primary = true;

  if is_premium then
    return new;
  end if;

  select count(*) into order_count
  from orders
  where shop_id in (select id from shops where org_id = target_org_id)
    and created_at >= date_trunc('month', now());

  if order_count >= 15 then
    raise exception 'Free plan limit reached: 15 orders this month. Upgrade to keep creating orders.';
  end if;

  return new;
end;
$$;

create or replace function enforce_free_tier_photo_cap()
returns trigger
language plpgsql
security definer
as $$
declare
  target_org_id uuid;
  is_premium boolean;
  progress_photo_limit constant integer := 5;
  inspiration_photo_limit constant integer := 3;
  progress_count integer;
  inspiration_count integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  select org_id into target_org_id from shops where id = new.shop_id;

  select (subscription_status in ('active', 'past_due', 'trialing')) into is_premium
  from shops
  where org_id = target_org_id and is_primary = true;

  if is_premium then
    return new;
  end if;

  progress_count := jsonb_array_length(coalesce(new.images, '[]'::jsonb));
  inspiration_count := coalesce(array_length(new.inspiration_images, 1), 0);

  if progress_count > progress_photo_limit then
    raise exception 'Free plan limit reached: % progress photos per order. Upgrade to add more.', progress_photo_limit;
  end if;

  if inspiration_count > inspiration_photo_limit then
    raise exception 'Free plan limit reached: % inspiration photos per order. Upgrade to add more.', inspiration_photo_limit;
  end if;

  return new;
end;
$$;
