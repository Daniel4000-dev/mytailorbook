-- ============================================================
-- Scheduling: fitting/pickup appointments (Feature Section 6)
-- ============================================================
-- The one feature in the roadmap that's a genuine new DAILY workflow
-- ("who's coming in today?") rather than something that belongs on an
-- existing customer/order page — so it gets a real bottom-nav spot,
-- unlike every other Section 3-5 feature which extended an existing
-- screen instead.
-- ============================================================

create table appointments (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  customer_name text not null,
  order_id uuid references orders(id) on delete set null,
  type text not null check (type in ('fitting', 'pickup', 'consultation')),
  scheduled_at timestamptz not null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;

create policy "select shop appointments" on appointments
  for select using (shop_id = current_shop_id());
create policy "insert shop appointments" on appointments
  for insert with check (shop_id = current_shop_id());
create policy "update shop appointments" on appointments
  for update using (shop_id = current_shop_id());
create policy "delete shop appointments" on appointments
  for delete using (shop_id = current_shop_id());
