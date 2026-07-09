-- ============================================================
-- Order measurement snapshot + customer measurement history (Feature Section 3)
-- ============================================================
-- Today, measurements only live on the customer record — if they're edited
-- after an order is placed (very normal: growth, weight change, correcting
-- a wrong number), every past order silently shows the NEW numbers too.
-- If a customer complains a finished garment doesn't fit, there's no way
-- to check what was actually used to cut it.
--
-- Fix: freeze a copy of the customer's measurements onto the order at
-- creation time. Immune to later profile edits, permanently.
--
-- Separately: customer_measurement_history keeps the PREVIOUS measurement
-- set whenever it's edited, instead of just overwriting and losing it —
-- lets a tailor see how a recurring customer's measurements have changed
-- over time.
-- ============================================================

alter table orders
  add column measurements_snapshot jsonb;

create table customer_measurement_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  measurements jsonb not null,
  recorded_at timestamptz not null default now()
);

alter table customer_measurement_history enable row level security;

create policy "select shop measurement history" on customer_measurement_history
  for select using (shop_id = current_shop_id());
create policy "insert shop measurement history" on customer_measurement_history
  for insert with check (shop_id = current_shop_id());
