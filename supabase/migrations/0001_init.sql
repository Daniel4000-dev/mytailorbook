-- ============================================================
-- MyTailorBook — Initial Schema
-- ============================================================
-- Run this once in Supabase Dashboard → SQL Editor → New query → Paste → Run.
--
-- What this does, in plain terms:
-- 1. Creates 4 tables that mirror lib/types.ts (Shop, User→profiles, Customer, Order)
-- 2. Turns on Row Level Security (RLS) on every table
-- 3. Adds policies so a logged-in user can only ever see/change rows
--    belonging to their own shop — enforced by the database itself,
--    not just by our frontend code.
-- ============================================================

-- ── SHOPS ────────────────────────────────────────────────────
-- One row per tailor shop (tenant). Supabase Auth already gives us
-- `auth.users` for login/passwords — we don't touch that table directly.
create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── PROFILES ─────────────────────────────────────────────────
-- Extends Supabase's built-in auth.users with the app-specific fields
-- our User type needs (name, role, shopId, active). One profile row
-- is created per signed-up person, linked 1:1 to their auth account.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  role text not null check (role in ('Owner', 'Staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── CUSTOMERS ────────────────────────────────────────────────
create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  full_name text not null,
  whatsapp_number text not null,
  gender text not null check (gender in ('male', 'female')),
  measurements jsonb,
  created_at timestamptz not null default now()
);

-- ── ORDERS ───────────────────────────────────────────────────
-- statusHistory and payments stay as JSON arrays for now (matches the
-- current app exactly) rather than separate tables — simpler to ship,
-- can be normalized into their own tables later without breaking the UI.
create table orders (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  customer_name text not null,
  order_details text not null,
  total_bill integer not null default 0,
  deposit_paid integer not null default 0,
  status text not null default 'Documented'
    check (status in ('Documented', 'Cutting', 'Sewing', 'Ready', 'Completed')),
  assigned_to uuid references profiles(id) on delete set null,
  assigned_to_name text,
  due_date timestamptz,
  priority text not null default 'normal' check (priority in ('normal', 'urgent', 'rush')),
  images text[] not null default '{}',
  status_history jsonb not null default '[]',
  payments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes for the queries the app makes constantly.
create index idx_customers_shop on customers (shop_id);
create index idx_orders_shop on orders (shop_id);
create index idx_orders_customer on orders (customer_id);
create index idx_orders_assigned_to on orders (assigned_to);
create index idx_profiles_shop on profiles (shop_id);

-- ============================================================
-- Row Level Security
-- ============================================================
-- Turn it on for every table — until a policy explicitly allows an
-- action, everything is denied by default. This is the real security
-- boundary; our frontend's shopId filtering becomes a nice-to-have on
-- top of this, not the only thing protecting one shop's data from another.

alter table shops enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;

-- A small reusable helper: "what shop does the currently logged-in
-- user belong to?" — every policy below uses this.
create function current_shop_id()
returns uuid
language sql
security definer
stable
as $$
  select shop_id from profiles where id = auth.uid()
$$;

-- SHOPS: you may only see/update your own shop.
create policy "select own shop" on shops
  for select using (id = current_shop_id());

create policy "update own shop" on shops
  for update using (id = current_shop_id());

-- PROFILES: you may see every profile in your own shop (so an Owner
-- can see their staff list), but never another shop's staff.
create policy "select shop profiles" on profiles
  for select using (shop_id = current_shop_id());

create policy "update own profile or owner updates shop staff" on profiles
  for update using (shop_id = current_shop_id());

-- CUSTOMERS / ORDERS: standard "everything scoped to my shop" policies.
create policy "select shop customers" on customers
  for select using (shop_id = current_shop_id());
create policy "insert shop customers" on customers
  for insert with check (shop_id = current_shop_id());
create policy "update shop customers" on customers
  for update using (shop_id = current_shop_id());

create policy "select shop orders" on orders
  for select using (shop_id = current_shop_id());
create policy "insert shop orders" on orders
  for insert with check (shop_id = current_shop_id());
create policy "update shop orders" on orders
  for update using (shop_id = current_shop_id());
