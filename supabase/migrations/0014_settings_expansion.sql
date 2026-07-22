-- ============================================================
-- Settings page expansion: shop logo, message templates, and
-- persisted portfolio photo curation (hide/feature).
-- ============================================================

alter table shops add column logo_url text;
alter table shops add column outreach_template text;
-- Keyed by OrderStatus ('Documented' | 'Cutting' | 'Sewing' | 'Ready' |
-- 'Completed'); an absent key means "use the app's built-in default wording"
-- (see lib/formatters.ts getOrderProgressMessage) — shops that never touch
-- this screen keep today's exact behavior.
alter table shops add column stage_message_templates jsonb not null default '{}'::jsonb;

-- ============================================================
-- Portfolio photo curation — order photos live embedded in orders.images
-- (jsonb), not as their own rows, so there's nowhere to persist "hide this
-- one" or "feature this one" without a side table keyed by the photo's URL.
-- ============================================================
create table portfolio_photo_overrides (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  photo_url text not null,
  hidden boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  unique (shop_id, photo_url)
);

create index idx_portfolio_photo_overrides_shop
  on portfolio_photo_overrides (shop_id);

alter table portfolio_photo_overrides enable row level security;

-- The public portfolio page reads through the service-role admin client
-- (see app/public-actions.ts getPublicShopPortfolio), bypassing RLS
-- entirely — these policies only govern the authenticated in-app curation
-- screen. Only the Owner curates their own portfolio.
create policy "select portfolio photo overrides" on portfolio_photo_overrides
  for select using (shop_id = current_shop_id());

create policy "owner manages portfolio photo overrides" on portfolio_photo_overrides
  for insert with check (
    shop_id = current_shop_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

create policy "owner updates portfolio photo overrides" on portfolio_photo_overrides
  for update using (
    shop_id = current_shop_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

create policy "owner deletes portfolio photo overrides" on portfolio_photo_overrides
  for delete using (
    shop_id = current_shop_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );
