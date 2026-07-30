-- ============================================================
-- Paystack Subscriptions for Shops (Freemium Model)
-- ============================================================

-- Add subscription tracking to the shops table. Shops default to 'free' tier.
alter table shops 
  add column paystack_customer_code text,
  add column paystack_subscription_code text,
  add column subscription_plan text,
  add column subscription_status text not null default 'free' 
    check (subscription_status in ('free', 'active', 'past_due', 'canceled'));

-- Index on customer code for faster webhook lookups (webhooks will use this or the email)
create index if not exists idx_shops_paystack_customer on shops (paystack_customer_code);
