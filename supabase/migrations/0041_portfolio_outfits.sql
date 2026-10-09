-- ============================================================
-- Portfolio redesign, Phase 2: outfits, angle-tagged photos, story mode
-- ============================================================
-- Replaces the old "compute the gallery on the fly from orders.images[]"
-- approach (app/public-actions.ts getPublicShopPortfolio) with real,
-- explicitly-curated rows. Nothing here is public until a tailor actually
-- builds an outfit from it — landing in the pool is not the same as
-- publishing.
--
-- Three tables:
--   portfolio_photos        — the pool. Auto-pulled from Delivered orders
--                              (source='auto', source_order_id set) or
--                              directly uploaded (source='manual') to the
--                              new portfolio-photos storage bucket below.
--                              A photo sitting here alone is never shown
--                              on the public page.
--   portfolio_outfits       — the actual gallery unit a visitor sees.
--                              Creating one *is* the publish action — no
--                              separate approval step. story_mode_enabled
--                              gates whether the outfit has a "see how
--                              this was made" view at all.
--   portfolio_outfit_photos — join table: which pool photo belongs to
--                              which outfit, as a 'display' shot (angle-
--                              tagged: front/back/side/detail) or a
--                              'story' shot (the making-of sequence — no
--                              angle, it's chronological instead).
--
-- Org-shared, following the same pattern as portfolio_photo_overrides
-- (0014) and customers (0020): shop_id is the source of truth, org_id is
-- auto-derived via the existing set_org_id_from_shop() trigger so a
-- multi-branch org's portfolio work is visible org-wide.
-- ============================================================

create table portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  image_url text not null,
  source text not null default 'manual' check (source in ('auto', 'manual')),
  source_order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Auto-pull runs repeatedly (every time a tailor opens Manage
  -- Portfolio) and re-scans the same Delivered orders — this stops it
  -- from re-inserting a photo already sitting in the pool.
  unique (shop_id, image_url)
);

create index idx_portfolio_photos_shop on portfolio_photos (shop_id);
create index idx_portfolio_photos_org on portfolio_photos (org_id);

create trigger trg_portfolio_photos_set_org_id
  before insert or update of shop_id on portfolio_photos
  for each row execute function set_org_id_from_shop();

create table portfolio_outfits (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  title text,
  story_mode_enabled boolean not null default false,
  story_caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_portfolio_outfits_shop on portfolio_outfits (shop_id);
create index idx_portfolio_outfits_org on portfolio_outfits (org_id);

create trigger trg_portfolio_outfits_set_org_id
  before insert or update of shop_id on portfolio_outfits
  for each row execute function set_org_id_from_shop();

create table portfolio_outfit_photos (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references portfolio_outfits(id) on delete cascade,
  photo_id uuid not null references portfolio_photos(id) on delete cascade,
  kind text not null check (kind in ('display', 'story')),
  angle text check (angle in ('front', 'back', 'side', 'detail')),
  sort_order integer not null default 0,
  -- A story shot is chronological (cutting -> sewing -> fitting), not
  -- angle-tagged — enforced here rather than just in the editor UI so a
  -- bad write can't silently corrupt the distinction the template code
  -- relies on to separate "gallery grid" from "making-of sequence".
  check (kind = 'display' or angle is null),
  unique (outfit_id, photo_id, kind)
);

create index idx_portfolio_outfit_photos_outfit on portfolio_outfit_photos (outfit_id);
create index idx_portfolio_outfit_photos_photo on portfolio_outfit_photos (photo_id);

-- ============================================================
-- RLS — same shape as every other org-shared curation table: any org
-- member can read (so staff can see what's been built), only
-- OrgAdmin/BranchManager can write (portfolio curation is an owner-level
-- action, matching the "Owner curates portfolio" precedent in 0014).
-- ============================================================

alter table portfolio_photos enable row level security;
alter table portfolio_outfits enable row level security;
alter table portfolio_outfit_photos enable row level security;

create policy "select org portfolio photos" on portfolio_photos
  for select using (org_id = current_org_id());
create policy "owner inserts org portfolio photos" on portfolio_photos
  for insert with check (
    shop_id = any(current_branch_ids())
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );
create policy "owner deletes org portfolio photos" on portfolio_photos
  for delete using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

create policy "select org portfolio outfits" on portfolio_outfits
  for select using (org_id = current_org_id());
create policy "owner inserts org portfolio outfits" on portfolio_outfits
  for insert with check (
    shop_id = any(current_branch_ids())
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );
create policy "owner updates org portfolio outfits" on portfolio_outfits
  for update using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );
create policy "owner deletes org portfolio outfits" on portfolio_outfits
  for delete using (
    org_id = current_org_id()
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

-- portfolio_outfit_photos has no org_id of its own — scope through the
-- parent outfit instead.
create policy "select org portfolio outfit photos" on portfolio_outfit_photos
  for select using (
    exists (select 1 from portfolio_outfits o where o.id = outfit_id and o.org_id = current_org_id())
  );
create policy "owner inserts org portfolio outfit photos" on portfolio_outfit_photos
  for insert with check (
    exists (
      select 1 from portfolio_outfits o
      join profiles p on p.id = auth.uid()
      where o.id = outfit_id and o.org_id = current_org_id() and p.role in ('OrgAdmin', 'BranchManager')
    )
  );
create policy "owner deletes org portfolio outfit photos" on portfolio_outfit_photos
  for delete using (
    exists (
      select 1 from portfolio_outfits o
      join profiles p on p.id = auth.uid()
      where o.id = outfit_id and o.org_id = current_org_id() and p.role in ('OrgAdmin', 'BranchManager')
    )
  );

-- ============================================================
-- Storage: direct portfolio-photo uploads (manual source). Public read,
-- same reasoning as order-photos (0005) — the public portfolio page
-- shows these with no login. Path convention {shopId}/{filename}, same
-- as order-photos, scoped to owner-like roles rather than any shop
-- member since portfolio curation is an owner action here.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('portfolio-photos', 'portfolio-photos', true)
on conflict (id) do nothing;

create policy "public read portfolio photos"
  on storage.objects for select
  using (bucket_id = 'portfolio-photos');

create policy "owner uploads own portfolio photos"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );

create policy "owner deletes own portfolio photos"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
    and exists (select 1 from profiles where id = auth.uid() and role in ('OrgAdmin', 'BranchManager'))
  );
