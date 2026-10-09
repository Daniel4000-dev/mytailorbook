-- ============================================================
-- Enforce the free-tier order quota at the database level
-- ============================================================
-- lib/subscription.ts's checkOrderQuota() enforces the 15-orders/month
-- free-tier cap, but only from within our own server actions. Nothing
-- stopped an authenticated user from calling
-- supabase.from('orders').insert(...) directly from their own session,
-- which the "insert branch orders" RLS policy (migration 0022) already
-- permits for any of their own branches — completely bypassing the quota.
-- This mirrors the billing-column bypass fixed in migration 0028: the
-- real gate needs to live in the database, not just in application code.
--
-- auth.uid() is null for the admin/service-role client (webhooks, crons,
-- seed scripts), so those paths are never subject to this cap — only
-- real user sessions are. Mirrors lib/subscription.ts's org-wide,
-- calendar-month counting logic exactly.

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

  select (subscription_status = 'active') into is_premium
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

drop trigger if exists trg_enforce_free_tier_order_quota on orders;
create trigger trg_enforce_free_tier_order_quota
  before insert on orders
  for each row execute function enforce_free_tier_order_quota();
