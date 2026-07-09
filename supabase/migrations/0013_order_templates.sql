-- ============================================================
-- Order templates (Feature Section 4)
-- ============================================================
-- Lets a shop save a common order (description/items + price) as a
-- reusable template, so repeat order types (e.g. "2-piece native attire,
-- ₦25,000") don't need retyping every time. Lives inside the existing
-- New Order form — no new page.
-- ============================================================

create table order_templates (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  order_details text not null,
  items jsonb not null default '[]'::jsonb,
  total_bill integer not null default 0,
  created_at timestamptz not null default now()
);

alter table order_templates enable row level security;

create policy "select shop order templates" on order_templates
  for select using (shop_id = current_shop_id());
create policy "insert shop order templates" on order_templates
  for insert with check (shop_id = current_shop_id());
create policy "delete shop order templates" on order_templates
  for delete using (shop_id = current_shop_id());
