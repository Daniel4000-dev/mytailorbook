-- ============================================================
-- Free-tier photo cap per order
-- ============================================================
-- Every order's `images` (progress gallery) and `inspiration_images`
-- (customer reference photos) arrays currently have no ceiling — a free
-- shop could attach unlimited photos to every order with no cost to them.
-- Mirrors the order-quota trigger from migration 0030: the real gate lives
-- in the database, not just app code, since a direct API call could
-- otherwise bypass a client-side-only check.
--
-- auth.uid() is null for the admin/service-role client (crons, webhooks,
-- seed scripts), so those paths are never subject to this cap — only real
-- user sessions are, same as the order-quota trigger.

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

  select (subscription_status = 'active') into is_premium
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

drop trigger if exists trg_enforce_free_tier_photo_cap on orders;
create trigger trg_enforce_free_tier_photo_cap
  before insert or update on orders
  for each row execute function enforce_free_tier_photo_cap();
