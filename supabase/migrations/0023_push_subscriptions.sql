-- ============================================================
-- Web Push subscriptions (OS-level notifications for the installed PWA)
-- ============================================================
-- Each row is one browser/device's subscription (a profile can have more
-- than one — e.g. phone + desktop). Stored so server actions can push a
-- real OS notification via the admin client, independent of whether the
-- app is open. RLS restricts a profile to only ever touch its own rows;
-- reads for sending happen via the service-role admin client, which
-- bypasses RLS entirely, so no cross-profile select policy is needed.
-- ============================================================

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_profile on push_subscriptions (profile_id);

alter table push_subscriptions enable row level security;

create policy "profiles manage own push subscriptions" on push_subscriptions
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
