-- ============================================================
-- subscription_events — real revenue + churn history
-- ============================================================
-- The Paystack webhook (app/api/webhooks/paystack) only ever wrote the
-- *current* subscription_status onto shops — it never kept history, and
-- charge.success's actual `amount` was read from the payload and then
-- discarded. That's why the admin dashboard's "Estimated MRR" has always
-- been a flat `premium count * 2500` guess rather than real revenue: there
-- was nowhere to store an actual charge, and no way to see when an
-- account churned versus just being currently canceled.
--
-- This table is purely additive — one insert alongside each existing
-- `.update()` in the webhook, same event types, same admin/service-role
-- client. It doesn't change any existing billing logic or column.
create table subscription_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  status text not null,
  amount_kobo integer,
  created_at timestamptz not null default now()
);

create index idx_subscription_events_org on subscription_events (org_id, created_at);
create index idx_subscription_events_created on subscription_events (created_at);

-- Only the webhook (service-role) writes here; only /admin (service-role)
-- reads it. No policy at all — same lockdown pattern as platform_admins
-- and affiliates in 0035/0036.
alter table subscription_events enable row level security;

-- ============================================================
-- admin_audit_log — who changed what inside /admin
-- ============================================================
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  admin_name text,
  action text not null,
  target_type text not null,
  target_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_audit_log_created on admin_audit_log (created_at);

alter table admin_audit_log enable row level security;
