-- ============================================================
-- Subscription grace period + billing-reminder tracking
-- ============================================================
-- Complements 0025_paystack_subscriptions.sql. When a renewal charge
-- fails, the webhook flips subscription_status to 'past_due' and stamps
-- grace_expires_at 3 days out. The tailor immediately reverts to free-tier
-- limits (see lib/subscription.ts) but keeps full access to their own
-- data throughout. A daily cron (app/api/cron/subscription-grace) demotes
-- any shop still past_due once grace_expires_at has passed, and sends
-- reminder pushes along the way.

alter table shops
  add column current_period_end timestamptz,
  add column grace_expires_at timestamptz,
  add column last_billing_reminder_sent_at timestamptz;

create index if not exists idx_shops_grace_expires on shops (grace_expires_at)
  where subscription_status = 'past_due';
