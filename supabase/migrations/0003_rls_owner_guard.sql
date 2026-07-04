-- ============================================================
-- Owner-only guardrails
-- ============================================================
-- The original policies allowed ANY logged-in member of a shop to update
-- that shop's profile (name/phone/address) or any staff member's role/
-- active flag — our UI hides those actions from Staff, but nothing in the
-- database enforced it, so a Staff member could still call the Supabase
-- API directly and, say, promote themselves to Owner. This migration
-- closes that gap at the database level, where it actually matters.
-- ============================================================

-- SHOPS: only the shop's actual owner may update it (studio name/phone/
-- address). shops.owner_id already tells us exactly who that is.
drop policy if exists "update own shop" on shops;
create policy "owner updates own shop" on shops
  for update using (
    id = current_shop_id() and owner_id = auth.uid()
  );

-- PROFILES: everyone in a shop can still SEE their teammates (unchanged),
-- but a trigger — not just a policy — now enforces who can change what:
--   - An Owner can update anything on any profile in their shop.
--   - A Staff member can only update their OWN profile, and only their
--     `name` — attempting to change role/active/shop_id (for themselves
--     or anyone else) is rejected outright.
drop policy if exists "update own profile or owner updates shop staff" on profiles;
create policy "update shop profiles" on profiles
  for update using (shop_id = current_shop_id());

create or replace function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Owners of this shop may change anything.
  if exists (
    select 1 from profiles
    where id = auth.uid() and shop_id = old.shop_id and role = 'Owner'
  ) then
    return new;
  end if;

  -- Non-owners may only touch their own row.
  if old.id <> auth.uid() then
    raise exception 'Only the studio owner can modify another team member''s profile';
  end if;

  -- ...and even on their own row, may not change role, active status, or shop.
  if new.role <> old.role or new.active <> old.active or new.shop_id <> old.shop_id then
    raise exception 'You are not authorized to change role, active status, or shop assignment';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_privilege_escalation on profiles;
create trigger trg_prevent_profile_privilege_escalation
  before update on profiles
  for each row execute function prevent_profile_privilege_escalation();
