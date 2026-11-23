-- Persistent notification store for the atelier activity hub.
-- Replaces ephemeral client-side order scanning with durable server-written rows
-- that survive device switches and are queryable via Supabase Realtime.

create table if not exists atelier_notifications (
  id             uuid        primary key default gen_random_uuid(),
  shop_id        uuid        not null references shops(id) on delete cascade,
  recipient_id   uuid        references profiles(id) on delete cascade,
  category       text        not null check (category in ('production', 'clients', 'payments', 'system')),
  tone           text        not null default 'info' check (tone in ('alert', 'warning', 'info')),
  actor_name     text,
  actor_avatar_url text,
  badge_icon     text,
  badge_bg       text,
  badge_color    text,
  title          text        not null,
  subtitle       text,
  thumbnail_url  text,
  action_label   text,
  action_href    text,
  order_id       uuid        references orders(id) on delete set null,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_atelier_notifications_shop
  on atelier_notifications (shop_id, created_at desc);

create index if not exists idx_atelier_notifications_recipient
  on atelier_notifications (recipient_id, created_at desc);

alter table atelier_notifications enable row level security;

-- Shop staff (any member whose profile.shop_id matches) can read.
drop policy if exists "shop members read notifications" on atelier_notifications;
create policy "shop members read notifications"
  on atelier_notifications
  for select
  using (
    shop_id in (select shop_id from profiles where id = auth.uid())
  );

-- Only service role can insert (via admin client in server actions / crons).

-- Individual profiles can update read_at on rows addressed to them
-- or on broadcast rows (recipient_id is null).
drop policy if exists "profiles mark own read" on atelier_notifications;
create policy "profiles mark own read"
  on atelier_notifications
  for update
  using (recipient_id = auth.uid() or recipient_id is null)
  with check (true);

-- Enable Supabase Realtime for instant in-app activity feed delivery (idempotent)
do $$ begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'atelier_notifications'
  ) then
    alter publication supabase_realtime add table atelier_notifications;
  end if;
end $$;


