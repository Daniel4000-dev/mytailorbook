-- ============================================================
-- Organization / Branch multi-tenant redesign (Scale roadmap Phase 2)
-- ============================================================
-- The single highest-blast-radius migration in this project: introduces a
-- new top-level tenant boundary (organization) above the existing shop,
-- and rewrites every RLS policy in the system to use it.
--
-- `shops` deliberately keeps its table/column name and is now
-- conceptually "a branch" — renaming it would mean rewriting every
-- `shopId` reference across ~20 files in one atomic step; instead this
-- migration only changes what shops MEANS, not what it's called.
--
-- Every shop that exists today becomes "an organization with exactly one
-- branch" via a zero-data-loss backfill: organizations.id is set equal to
-- the shop's own id, giving a trivial, verifiable 1:1 mapping with no
-- temp tables or correlated subqueries needed for the backfill itself.
--
-- Scoping decision:
--   - Org-shared (a multi-branch house wants ONE shared customer book and
--     ONE shared portfolio): customers, portfolio_photo_overrides,
--     style_photo_submissions, customer_outreach_log.
--   - Branch-scoped (production work and its audit trail are per
--     location): orders, order_comments, audit_log.
--   - Untouched: rate_limit_hits (not tenant-scoped at all), the
--     `avatars` storage bucket (personal, not shop/org scoped), and every
--     other storage bucket (order-photos/portfolio-photos/style-photos —
--     photos are physically tied to one branch, stay branch-scoped).
--
-- current_branch_ids() returns an ARRAY of uuids (not a single uuid) even
-- though every profile has exactly one shop_id today — this is what lets
-- a future profile_branch_access table (deferred, not built here) extend
-- a staff member to multiple branches later without another RLS rewrite.
-- (Returns uuid[], not setof uuid — Postgres disallows set-returning
-- functions directly in RLS policy expressions.)
--
-- NOTE on ordering: current_org_id()/current_branch_ids() and the shops
-- RLS policies that use them are defined AFTER profiles.org_id exists —
-- Postgres validates a `language sql` function's body against the actual
-- catalog at CREATE FUNCTION time, so defining current_org_id() before
-- profiles.org_id exists fails with "column org_id does not exist" (hit
-- and fixed during rollout).
-- ============================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- shops (branches)
-- ============================================================
alter table shops add column org_id uuid references organizations(id);
alter table shops add column is_primary boolean not null default false;

insert into organizations (id, name, owner_id, created_at)
select id, name, owner_id, created_at from shops;

update shops set org_id = id, is_primary = true;

alter table shops alter column org_id set not null;

-- Every future new signup creates a shop with no org_id supplied — this
-- auto-creates a fresh organization for it, the same as the backfill
-- above did for existing shops. A later "add a branch" feature will
-- supply an existing org_id explicitly, which this trigger leaves alone.
create function shops_auto_create_org()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.org_id is null then
    insert into organizations (name, owner_id)
    values (new.name, new.owner_id)
    returning id into new.org_id;
    new.is_primary := true;
  end if;
  return new;
end;
$$;

create trigger trg_shops_auto_create_org
  before insert on shops
  for each row execute function shops_auto_create_org();

-- ============================================================
-- profiles — stays branch-scoped (cross-branch staff visibility is
-- explicitly out of scope for this migration), but still needs org_id
-- for current_org_id() to work, and for the org-shared tables' triggers
-- below to derive org_id correctly regardless of which branch a staff
-- member is on.
-- ============================================================
alter table profiles add column org_id uuid references organizations(id);

update profiles set org_id = (select org_id from shops where shops.id = profiles.shop_id);

alter table profiles alter column org_id set not null;

create function profiles_auto_set_org()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.org_id is null then
    new.org_id := (select org_id from shops where id = new.shop_id);
  end if;
  return new;
end;
$$;

create trigger trg_profiles_auto_set_org
  before insert on profiles
  for each row execute function profiles_auto_set_org();

-- profiles select/update policies are UNCHANGED (still shop_id =
-- current_shop_id()) — deliberately not touched in this migration.

-- ============================================================
-- current_org_id() / current_branch_ids() — defined here, now that
-- profiles.org_id actually exists.
-- ============================================================
create function current_org_id()
returns uuid
language sql
security definer
stable
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- Returns a plain array, not `setof uuid` — Postgres disallows set-
-- returning functions directly in RLS policy expressions ("set-returning
-- functions are not allowed in policy expressions", hit and fixed during
-- rollout). An array gives the same multi-branch capability (a future
-- profile_branch_access table can extend this to return several ids)
-- while remaining a valid scalar value inside `= any(...)`.
create function current_branch_ids()
returns uuid[]
language sql
security definer
stable
as $$
  select coalesce(array_agg(shop_id), '{}') from profiles where id = auth.uid()
$$;

-- shops (branches) RLS — uses current_org_id(), defined above.
drop policy "select own shop" on shops;
create policy "select org shops" on shops
  for select using (org_id = current_org_id());

drop policy "owner updates own shop" on shops;
create policy "owner updates org shops" on shops
  for update using (
    org_id = current_org_id() and owner_id = auth.uid()
  );

-- ============================================================
-- Org-shared tables: customers, portfolio_photo_overrides,
-- style_photo_submissions, customer_outreach_log
-- ============================================================
-- Each gets an org_id column, always derived server-side from shop_id via
-- a BEFORE INSERT trigger (unconditionally, not just "if null") — this is
-- deliberately not client-suppliable, so a spoofed org_id in an insert
-- payload can never bypass the real org boundary.

alter table customers add column org_id uuid references organizations(id);
update customers set org_id = (select org_id from shops where shops.id = customers.shop_id);
alter table customers alter column org_id set not null;

alter table portfolio_photo_overrides add column org_id uuid references organizations(id);
update portfolio_photo_overrides set org_id = (select org_id from shops where shops.id = portfolio_photo_overrides.shop_id);
alter table portfolio_photo_overrides alter column org_id set not null;

alter table style_photo_submissions add column org_id uuid references organizations(id);
update style_photo_submissions set org_id = (select org_id from shops where shops.id = style_photo_submissions.shop_id);
alter table style_photo_submissions alter column org_id set not null;

alter table customer_outreach_log add column org_id uuid references organizations(id);
update customer_outreach_log set org_id = (select org_id from shops where shops.id = customer_outreach_log.shop_id);
alter table customer_outreach_log alter column org_id set not null;

create function set_org_id_from_shop()
returns trigger
language plpgsql
security definer
as $$
begin
  new.org_id := (select org_id from shops where id = new.shop_id);
  return new;
end;
$$;

create trigger trg_customers_set_org_id
  before insert or update of shop_id on customers
  for each row execute function set_org_id_from_shop();

create trigger trg_portfolio_photo_overrides_set_org_id
  before insert or update of shop_id on portfolio_photo_overrides
  for each row execute function set_org_id_from_shop();

create trigger trg_style_photo_submissions_set_org_id
  before insert or update of shop_id on style_photo_submissions
  for each row execute function set_org_id_from_shop();

create trigger trg_customer_outreach_log_set_org_id
  before insert or update of shop_id on customer_outreach_log
  for each row execute function set_org_id_from_shop();

-- customers
drop policy "select shop customers" on customers;
drop policy "insert shop customers" on customers;
drop policy "update shop customers" on customers;

create policy "select org customers" on customers
  for select using (org_id = current_org_id());
create policy "insert org customers" on customers
  for insert with check (shop_id = any(current_branch_ids()));
create policy "update org customers" on customers
  for update using (org_id = current_org_id());

-- portfolio_photo_overrides
drop policy "select portfolio photo overrides" on portfolio_photo_overrides;
drop policy "owner manages portfolio photo overrides" on portfolio_photo_overrides;
drop policy "owner updates portfolio photo overrides" on portfolio_photo_overrides;
drop policy "owner deletes portfolio photo overrides" on portfolio_photo_overrides;

create policy "select org portfolio photo overrides" on portfolio_photo_overrides
  for select using (org_id = current_org_id());
create policy "owner inserts org portfolio photo overrides" on portfolio_photo_overrides
  for insert with check (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );
create policy "owner updates org portfolio photo overrides" on portfolio_photo_overrides
  for update using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );
create policy "owner deletes org portfolio photo overrides" on portfolio_photo_overrides
  for delete using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

-- style_photo_submissions
drop policy "select style photo submissions" on style_photo_submissions;
drop policy "insert style photo submissions" on style_photo_submissions;
drop policy "delete style photo submissions" on style_photo_submissions;
drop policy "owner approves style photo submissions" on style_photo_submissions;

create policy "select org style photo submissions" on style_photo_submissions
  for select using (
    org_id = current_org_id()
    and (
      status = 'pending'
      or exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
    )
  );
create policy "insert org style photo submissions" on style_photo_submissions
  for insert with check (
    shop_id = any(current_branch_ids()) and uploaded_by = auth.uid()
  );
create policy "delete org style photo submissions" on style_photo_submissions
  for delete using (
    org_id = current_org_id()
    and (
      status = 'pending'
      or exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
    )
  );
create policy "owner approves org style photo submissions" on style_photo_submissions
  for update using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

-- customer_outreach_log
drop policy "select outreach log" on customer_outreach_log;
drop policy "owner inserts outreach log" on customer_outreach_log;

create policy "select org outreach log" on customer_outreach_log
  for select using (org_id = current_org_id());
create policy "owner inserts org outreach log" on customer_outreach_log
  for insert with check (
    shop_id = any(current_branch_ids())
    and contacted_by = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

-- ============================================================
-- Branch-scoped tables: orders, order_comments, audit_log
-- ============================================================
drop policy "select shop orders" on orders;
drop policy "insert shop orders" on orders;
drop policy "update shop orders" on orders;

create policy "select branch orders" on orders
  for select using (shop_id = any(current_branch_ids()));
create policy "insert branch orders" on orders
  for insert with check (shop_id = any(current_branch_ids()));
create policy "update branch orders" on orders
  for update using (shop_id = any(current_branch_ids()));

drop policy "select shop order comments" on order_comments;
create policy "select branch order comments" on order_comments
  for select using (shop_id = any(current_branch_ids()));

drop policy "owner reads own shop audit log" on audit_log;
create policy "owner reads own branch audit log" on audit_log
  for select using (
    shop_id = any(current_branch_ids())
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

-- rate_limit_hits: no tenant scoping, untouched.
-- avatars / order-photos / portfolio-photos / style-photos storage
-- policies: untouched (branch- or user-scoped as before).
