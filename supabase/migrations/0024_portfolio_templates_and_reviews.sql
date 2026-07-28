-- ============================================================
-- Portfolio personalization: templates, accent color, tagline/bio,
-- photo captions, and real customer reviews.
-- ============================================================
-- The public portfolio page (/studio/[shopId]) has always had one fixed
-- look for every shop. This adds: a choice of visual template, a small
-- curated accent color, free-text tagline/bio/founding-year, per-photo
-- captions, and a genuine customer-review mechanism collected from the
-- public tracking page once an order is Completed — not owner-typed.

alter table shops add column portfolio_template text not null default 'modern'
  check (portfolio_template in ('modern', 'editorial', 'heritage'));
alter table shops add column portfolio_accent text not null default 'indigo';
-- Free-form settings blob (tagline, bio, foundedYear, section toggles) —
-- same "sparse jsonb settings" convention as stage_message_templates.
alter table shops add column portfolio_settings jsonb not null default '{}'::jsonb;

alter table portfolio_photo_overrides add column caption text;

-- ============================================================
-- order_ratings — a customer's star rating + optional comment, submitted
-- from the public tracking page once their order reaches Completed.
-- Deliberately NOT owner-typed: the whole point is that it's tied to a
-- real order, verifiable in the sense that it can only be created once
-- per completed order, by whoever holds that order's tracking link.
-- ============================================================
create table order_ratings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  submitted_at timestamptz not null default now(),
  approved boolean not null default false,
  featured boolean not null default false,
  unique (order_id)
);

create index idx_order_ratings_shop on order_ratings (shop_id);

alter table order_ratings enable row level security;

-- Public submission and the public portfolio's read of approved ratings
-- both go through the service-role admin client (see app/public-actions.ts
-- submitOrderRatingAction / getPublicShopPortfolio), bypassing RLS by
-- design — same pattern as order_comments. These policies only govern the
-- authenticated in-app moderation screen.
create policy "select branch order ratings" on order_ratings
  for select using (shop_id = any(current_branch_ids()));

create policy "owner updates branch order ratings" on order_ratings
  for update using (
    shop_id = any(current_branch_ids())
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );
