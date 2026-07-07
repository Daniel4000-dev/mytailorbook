-- ============================================================
-- Garment photo storage (Supabase Storage, not the database)
-- ============================================================
-- Order photos were previously stored as base64 data URLs directly in
-- orders.images (text[]). That silently broke uploads: this whole update
-- goes through a Next.js Server Action, which caps request bodies at 1MB
-- by default — a real phone photo, base64-encoded (~33% larger than the
-- original file), almost always exceeds that. It was also a bad idea
-- regardless of the size limit: multi-MB blobs inline in a Postgres row
-- bloat every read of that order and the whole table's storage/backup size.
--
-- Fix: photos upload directly from the browser to Supabase Storage
-- (bypassing the Server Action entirely), and only the resulting short
-- URL string gets saved to orders.images.
--
-- Path convention: {shopId}/{orderId}/{filename} — lets us scope the
-- write/delete policies to "your own shop's files" using the same
-- current_shop_id() helper as every other table.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;

-- Public read: the customer-facing /track/[orderId] page shows these
-- photos with no login, so the bucket itself is public.
create policy "public read order photos"
  on storage.objects for select
  using (bucket_id = 'order-photos');

create policy "shop members upload own order photos"
  on storage.objects for insert
  with check (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
  );

create policy "shop members delete own order photos"
  on storage.objects for delete
  using (
    bucket_id = 'order-photos'
    and (storage.foldername(name))[1] = current_shop_id()::text
  );
