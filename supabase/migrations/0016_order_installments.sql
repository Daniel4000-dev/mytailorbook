-- ============================================================
-- Installment plan tracking (Feature Section 5)
-- ============================================================
-- A simple payment SCHEDULE for an order — "₦10,000 by the 15th, ₦10,000
-- by the 30th" — distinct from orders.payments, which only records money
-- already received. This is what's EXPECTED and WHEN, so overdue
-- installments can be flagged the same way overdue orders are.
--
-- Marking an installment paid also records the actual payment via the
-- existing payment flow (orders.payments / deposit_paid), so there's one
-- source of truth for money actually received — this table only tracks
-- the plan/schedule on top of that.
-- ============================================================

create table order_installments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  amount integer not null,
  due_date date not null,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table order_installments enable row level security;

create policy "select shop installments" on order_installments
  for select using (shop_id = current_shop_id());
create policy "insert shop installments" on order_installments
  for insert with check (shop_id = current_shop_id());
create policy "update shop installments" on order_installments
  for update using (shop_id = current_shop_id());
create policy "delete shop installments" on order_installments
  for delete using (shop_id = current_shop_id());
