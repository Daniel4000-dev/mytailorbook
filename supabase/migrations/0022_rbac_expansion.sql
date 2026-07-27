-- ============================================================
-- RBAC expansion (Scale roadmap Phase 4)
-- ============================================================
-- Extends profiles.role from ('Owner', 'Staff') to four roles:
-- 'OrgAdmin' (renamed from 'Owner' — same person, same privileges, just
-- renamed to match the org/branch model from Phase 2), 'BranchManager'
-- (same owner-level privileges as OrgAdmin, but conceptually scoped to
-- running one branch — this migration does not yet restrict a
-- BranchManager's visibility to fewer than all their org's branches;
-- that's what profile_branch_access is *for*, but OrgAdmin still sees
-- everything regardless of it), 'Staff' (unchanged), and 'Accountant'
-- (new: read-only financial access, enforced here at the RLS layer, not
-- just hidden in the UI).
--
-- lib/types.ts's isOwnerLikeRole() is the single source of truth for
-- "OrgAdmin or BranchManager" in application code — every existing
-- isOwner-gated UI check keeps its current meaning without being touched
-- individually. This migration is that same equivalence, enforced in SQL.
-- ============================================================

-- Chicken-and-egg between the old and new constraints: the OLD constraint
-- (role in ('Owner','Staff')) rejects the backfill update itself (setting
-- role = 'OrgAdmin' isn't in that allowed set), but the NEW constraint
-- (which excludes 'Owner') would reject the still-unbackfilled existing
-- rows the instant it's added. Fixed by dropping the constraint entirely
-- first (no CHECK active at all, briefly), running the backfill, then
-- adding the final constraint once every row already holds a valid value
-- (hit and fixed during rollout: "new row for relation profiles violates
-- check constraint profiles_role_check").
alter table profiles drop constraint profiles_role_check;

-- The bulk update below also has to run with the OLD
-- prevent_profile_privilege_escalation trigger (0003_rls_owner_guard.sql)
-- temporarily disabled: that trigger's "an Owner may change anything"
-- escape hatch checks auth.uid(), which is NULL when this migration runs
-- as a raw SQL-editor connection (no logged-in session) — so it falls
-- through to the trigger's rejection branch since role is changing (hit
-- and fixed during rollout: "You are not authorized to change role,
-- active status, or shop assignment"). Re-enabled immediately after.
alter table profiles disable trigger trg_prevent_profile_privilege_escalation;
update profiles set role = 'OrgAdmin' where role = 'Owner';
alter table profiles enable trigger trg_prevent_profile_privilege_escalation;

alter table profiles add constraint profiles_role_check
  check (role in ('OrgAdmin', 'BranchManager', 'Staff', 'Accountant'));

-- ============================================================
-- profile_branch_access — lets a BranchManager/Staff be granted access to
-- branches beyond their own home shop_id. OrgAdmin doesn't need rows here
-- (see current_branch_ids() below — they always see every branch in
-- their own org).
-- ============================================================
create table profile_branch_access (
  profile_id uuid not null references profiles(id) on delete cascade,
  branch_id uuid not null references shops(id) on delete cascade,
  primary key (profile_id, branch_id)
);

alter table profile_branch_access enable row level security;

-- An OrgAdmin/BranchManager manages grants for anyone in their own org,
-- for branches within their own org. Both checks are required: without
-- the branch_id check, an admin could grant one of their own staff access
-- to a branch belonging to a DIFFERENT org entirely — the grantee-profile
-- check alone doesn't stop that, since it only constrains who's being
-- granted access, not which branch they're being granted access to.
create policy "org admins manage branch access grants" on profile_branch_access
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
      and p.role in ('OrgAdmin', 'BranchManager')
      and p.org_id = (select org_id from profiles where id = profile_branch_access.profile_id)
      and p.org_id = (select org_id from shops where id = profile_branch_access.branch_id)
    )
  );

-- A profile can always see its own grants (read-only) — current_branch_ids()
-- itself is security definer and doesn't need this, but a future UI
-- listing "which branches can I access" does.
create policy "profiles read own branch access grants" on profile_branch_access
  for select using (profile_id = auth.uid());

-- ============================================================
-- current_branch_ids() — rewritten to add OrgAdmin's org-wide visibility
-- and profile_branch_access grants, without changing its signature
-- (still returns uuid[], still used unchanged by every RLS policy that
-- already calls it: orders, order_comments, audit_log).
-- ============================================================
create or replace function current_branch_ids()
returns uuid[]
language sql
security definer
stable
as $$
  select case
    when (select role from profiles where id = auth.uid()) = 'OrgAdmin'
      then coalesce(
        (select array_agg(id) from shops where org_id = (select org_id from profiles where id = auth.uid())),
        '{}'
      )
    else coalesce(
      (
        select array_agg(distinct branch_id) from (
          select shop_id as branch_id from profiles where id = auth.uid()
          union
          select branch_id from profile_branch_access where profile_id = auth.uid()
        ) granted
      ),
      '{}'
    )
  end
$$;

-- ============================================================
-- Profile privilege-escalation guard (from 0003_rls_owner_guard.sql) —
-- "Owner" was the only role that could edit a teammate's profile; now
-- OrgAdmin and BranchManager both can, matching isOwnerLikeRole().
-- ============================================================
create or replace function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  if exists (
    select 1 from profiles
    where id = auth.uid() and shop_id = old.shop_id and role in ('OrgAdmin', 'BranchManager')
  ) then
    return new;
  end if;

  if old.id <> auth.uid() then
    raise exception 'Only the studio owner can modify another team member''s profile';
  end if;

  if new.role <> old.role or new.active <> old.active or new.shop_id <> old.shop_id then
    raise exception 'You are not authorized to change role, active status, or shop assignment';
  end if;

  return new;
end;
$$;

-- ============================================================
-- Every existing "role = 'Owner'" policy, updated to "role in ('OrgAdmin',
-- 'BranchManager')" — same owner-level behavior, new role names. Dropping
-- and recreating each by its exact current name (from
-- 0020_org_branch_tenant_redesign.sql, the last migration to touch these).
-- ============================================================

drop policy "owner inserts org portfolio photo overrides" on portfolio_photo_overrides;
create policy "owner inserts org portfolio photo overrides" on portfolio_photo_overrides
  for insert with check (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

drop policy "owner updates org portfolio photo overrides" on portfolio_photo_overrides;
create policy "owner updates org portfolio photo overrides" on portfolio_photo_overrides
  for update using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

drop policy "owner deletes org portfolio photo overrides" on portfolio_photo_overrides;
create policy "owner deletes org portfolio photo overrides" on portfolio_photo_overrides
  for delete using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

drop policy "select org style photo submissions" on style_photo_submissions;
create policy "select org style photo submissions" on style_photo_submissions
  for select using (
    org_id = current_org_id()
    and (
      status = 'pending'
      or exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
    )
  );

drop policy "delete org style photo submissions" on style_photo_submissions;
create policy "delete org style photo submissions" on style_photo_submissions
  for delete using (
    org_id = current_org_id()
    and (
      status = 'pending'
      or exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
    )
  );

drop policy "owner approves org style photo submissions" on style_photo_submissions;
create policy "owner approves org style photo submissions" on style_photo_submissions
  for update using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

drop policy "owner inserts org outreach log" on customer_outreach_log;
create policy "owner inserts org outreach log" on customer_outreach_log
  for insert with check (
    shop_id = any(current_branch_ids())
    and contacted_by = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

drop policy "owner reads own branch audit log" on audit_log;
create policy "owner reads own branch audit log" on audit_log
  for select using (
    shop_id = any(current_branch_ids())
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

-- ============================================================
-- Accountant: read-only. The existing "select org customers"/"select
-- branch orders" policies already have no role restriction (any org/
-- branch member can read), so Accountant already gets read access for
-- free. What's missing is excluding Accountant from the mutation
-- policies, which today have no role check at all (open to any member).
-- ============================================================

drop policy "insert org customers" on customers;
create policy "insert org customers" on customers
  for insert with check (
    shop_id = any(current_branch_ids())
    and (select role from profiles where id = auth.uid()) <> 'Accountant'
  );

drop policy "update org customers" on customers;
create policy "update org customers" on customers
  for update using (
    org_id = current_org_id()
    and (select role from profiles where id = auth.uid()) <> 'Accountant'
  );

drop policy "insert branch orders" on orders;
create policy "insert branch orders" on orders
  for insert with check (
    shop_id = any(current_branch_ids())
    and (select role from profiles where id = auth.uid()) <> 'Accountant'
  );

drop policy "update branch orders" on orders;
create policy "update branch orders" on orders
  for update using (
    shop_id = any(current_branch_ids())
    and (select role from profiles where id = auth.uid()) <> 'Accountant'
  );
