-- ============================================================
-- Profile pictures, customer home address, tracking-page reminders
-- ============================================================
-- avatar_url: a user's own profile picture. Personal, not shop-wide, so
-- storage is scoped by the user's own uid folder rather than
-- current_shop_id() like every other bucket so far.
--
-- address: a customer's home address, plain free text (matches this
-- app's existing preference for one simple field over premature
-- structure — same treatment as shops.address already gets).
--
-- last_reminder_at: powers a "send a reminder" button on the public,
-- unauthenticated tracking page — rate-limited server-side to once per
-- calendar day per order, and surfaced to the shop through the existing
-- notification feed the same way a customer comment or payment is.
-- ============================================================

alter table profiles add column avatar_url text;

alter table customers add column address text;

alter table orders add column last_reminder_at timestamptz;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
