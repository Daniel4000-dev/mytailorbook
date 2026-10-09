-- ============================================================
-- Keep Premium access through the full grace period, not just until
-- the first failed renewal charge
-- ============================================================
-- Previously, `subscription_status = 'active'` was the only status
-- treated as premium anywhere (app code and both DB-level quota
-- triggers) — the moment a renewal charge failed and flipped a shop to
-- 'past_due', it lost premium access immediately, with the 3-day grace
-- window only protecting the shop's *data* (never deleted/locked), not
-- its feature access.
--
-- Product decision: be more generous — a shop that's mid-retry on a
-- failed renewal keeps full Premium access for the entire grace window,
-- and only actually drops to Free once app/api/cron/subscription-grace
-- demotes subscription_status to 'free' after grace_expires_at passes
-- with no successful payment. 'canceled' is deliberately NOT included
-- here — a shop that explicitly canceled shouldn't get a bonus grace
-- period of continued access, only a lapsed/failed renewal should.
--
-- Updates both DB-level enforcement triggers (0030, 0032) to match —
-- lib/subscription.ts's app-level checks are updated in the same commit
-- that ships this migration. If only one side changed, the other would
-- silently override it (app allows an insert the DB trigger still
-- rejects, or vice versa).

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

  select (subscription_status in ('active', 'past_due')) into is_premium
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

  select (subscription_status in ('active', 'past_due')) into is_premium
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
