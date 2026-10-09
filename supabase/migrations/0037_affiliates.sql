-- Affiliate link tracking. `affiliates` is admin-managed only (no RLS
-- policy at all for authenticated/anon — every read/write goes through
-- the service-role client from the internal /admin dashboard, same
-- lockdown pattern as platform_admins in 0035).
--
-- Attribution lives on `organizations`, not `shops` — organizations is
-- the real top-level tenant (see 0020_org_branch_tenant_redesign.sql);
-- a shop is just a branch under it. `referral_code_raw` is kept
-- alongside the FK so a code that didn't match any known affiliate (typo,
-- expired code, etc.) is still visible for debugging instead of silently
-- discarded.
create table affiliates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table affiliates enable row level security;

alter table organizations
  add column referred_by_affiliate_id uuid references affiliates(id),
  add column referral_code_raw text;
