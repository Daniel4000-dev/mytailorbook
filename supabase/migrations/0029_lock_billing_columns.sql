-- ============================================================
-- Lock billing columns against direct client writes
-- ============================================================
-- CRITICAL FIX: the "owner updates org shops" RLS policy (migration 0020)
-- lets a shop owner UPDATE any column on their own shop row, including the
-- billing columns added in 0025/0026. Nothing stopped an owner from
-- calling supabase.from('shops').update({ subscription_status: 'active' })
-- directly from their own authenticated session — a full, permanent,
-- free bypass of the entire subscription gate. Confirmed exploitable
-- against a live test row before this fix.
--
-- Billing state must only ever be written by the Paystack webhook
-- (app/api/webhooks/paystack) and the grace-period cron
-- (app/api/cron/subscription-grace), both of which use the admin/service-
-- role client and therefore have auth.uid() = null. Any request carrying
-- a real user session (auth.uid() is not null) is blocked from touching
-- these columns, mirroring the privilege-escalation guard already in
-- place for profiles (migration 0003).

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
    new.last_billing_reminder_sent_at is distinct from old.last_billing_reminder_sent_at
  ) then
    raise exception 'Billing fields can only be changed by the payment system';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_billing_column_tampering on shops;
create trigger trg_prevent_billing_column_tampering
  before update on shops
  for each row execute function prevent_billing_column_tampering();
