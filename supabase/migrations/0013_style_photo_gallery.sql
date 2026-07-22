-- ============================================================
-- Style photo gallery: staff-sourced outreach photos, owner-curated
-- ============================================================
-- Workflow: anyone in the shop can upload a photo for one of the built-in
-- garment styles (spotted somewhere, worth showing customers who like that
-- style). It lands as `pending`, visible to the whole shop (so staff can
-- see what's already been submitted before adding a duplicate). Only the
-- Owner can approve a pending photo, which moves it to `saved` — a private
-- gallery only the Owner can see, and the only source the outreach picker
-- on the customers page pulls from. Anyone can discard a pending photo;
-- once approved, only the Owner can remove it. Anything left pending for
-- 10 days is cleaned up automatically (see /api/cron/cleanup-style-photos).
-- ============================================================

create table style_photo_submissions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  style_name text not null,
  storage_path text not null,
  photo_url text not null,
  status text not null default 'pending' check (status in ('pending', 'saved')),
  uploaded_by uuid not null references profiles(id) on delete cascade,
  uploaded_by_name text not null,
  saved_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  saved_at timestamptz
);

create index idx_style_photo_submissions_shop_style_status
  on style_photo_submissions (shop_id, style_name, status);

alter table style_photo_submissions enable row level security;

-- Pending photos: visible to the whole shop. Saved photos: Owner only.
create policy "select style photo submissions" on style_photo_submissions
  for select using (
    shop_id = current_shop_id()
    and (
      status = 'pending'
      or exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
    )
  );

create policy "insert style photo submissions" on style_photo_submissions
  for insert with check (
    shop_id = current_shop_id() and uploaded_by = auth.uid()
  );

-- Discard: anyone in the shop while a photo is still pending; once it's
-- been approved (saved), only the Owner may remove it from the gallery.
create policy "delete style photo submissions" on style_photo_submissions
  for delete using (
    shop_id = current_shop_id()
    and (
      status = 'pending'
      or exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
    )
  );

-- Approve (pending -> saved): Owner only.
create policy "owner approves style photo submissions" on style_photo_submissions
  for update using (
    shop_id = current_shop_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

-- ============================================================
-- Outreach log: who's been sent a photo for which style, and when —
-- powers the "Reached out X ago" badge on the filtered customer list.
-- ============================================================
create table customer_outreach_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  style_name text not null,
  contacted_by uuid not null references profiles(id) on delete cascade,
  contacted_at timestamptz not null default now()
);

create index idx_customer_outreach_log_shop_style_customer
  on customer_outreach_log (shop_id, style_name, customer_id);

alter table customer_outreach_log enable row level security;

create policy "select outreach log" on customer_outreach_log
  for select using (shop_id = current_shop_id());

-- Only the Owner sends outreach messages.
create policy "owner inserts outreach log" on customer_outreach_log
  for insert with check (
    shop_id = current_shop_id()
    and contacted_by = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );

-- ============================================================
-- Storage bucket for outreach photos — same public-read/shop-scoped-write
-- pattern as order-photos (0005).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('style-photos', 'style-photos', true)
on conflict (id) do nothing;

create policy "public read style photos"
  on storage.objects for select
  using (bucket_id = 'style-photos');

create policy "shop members upload style photos"
  on storage.objects for insert
  with check (
    bucket_id = 'style-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
  );

create policy "shop members delete style photos"
  on storage.objects for delete
  using (
    bucket_id = 'style-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
  );
