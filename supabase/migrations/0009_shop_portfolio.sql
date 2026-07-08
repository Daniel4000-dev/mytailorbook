-- ============================================================
-- Public shop portfolio (Feature Section 2)
-- ============================================================
-- Lets a tailor showcase their best work + trust signals (rating) on a
-- public, no-login page for new-customer acquisition — distinct from the
-- rest of this section, which builds trust with an EXISTING customer.
--
-- Portfolio photos are their own table, not reused from orders.images:
-- an owner should be able to feature their best work without tying the
-- public page to a specific customer's order.
-- ============================================================

alter table shops
  add column bio text,
  add column tagline text;

create table portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table portfolio_photos enable row level security;

create policy "select shop portfolio photos" on portfolio_photos
  for select using (shop_id = current_shop_id());
create policy "insert shop portfolio photos" on portfolio_photos
  for insert with check (shop_id = current_shop_id());
create policy "update shop portfolio photos" on portfolio_photos
  for update using (shop_id = current_shop_id());
create policy "delete shop portfolio photos" on portfolio_photos
  for delete using (shop_id = current_shop_id());

-- Storage: same pattern as order-photos, public read since the portfolio
-- page itself is public.
-- Same 10MB / image-only restrictions as the order-photos bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-photos', 'portfolio-photos', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "public read portfolio photos"
  on storage.objects for select
  using (bucket_id = 'portfolio-photos');

create policy "shop members upload own portfolio photos"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
  );

create policy "shop members delete own portfolio photos"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
  );
