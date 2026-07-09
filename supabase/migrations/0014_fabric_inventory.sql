-- ============================================================
-- Fabric/inventory tracking (Feature Section 4)
-- ============================================================
-- A simple stock list for fabrics — name, cost per yard, yards on hand —
-- so a tailor can check/update stock before quoting or cutting a job.
-- Genuinely a new dataset (materials, not customers/orders), and an
-- occasional-use task, not a daily habit — lives in the sidebar's "More"
-- section, not the bottom nav.
--
-- Deliberately manual for now: stock isn't auto-deducted from orders,
-- since that would require specifying which fabric + yardage on every
-- order — a bigger commitment most shops won't want yet. Cost per yard
-- here is what real cost/profit tracking (next) builds on.
-- ============================================================

create table fabric_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  cost_per_yard integer not null default 0,
  yards_in_stock numeric not null default 0,
  low_stock_threshold numeric not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fabric_items enable row level security;

create policy "select shop fabric items" on fabric_items
  for select using (shop_id = current_shop_id());
create policy "insert shop fabric items" on fabric_items
  for insert with check (shop_id = current_shop_id());
create policy "update shop fabric items" on fabric_items
  for update using (shop_id = current_shop_id());
create policy "delete shop fabric items" on fabric_items
  for delete using (shop_id = current_shop_id());
