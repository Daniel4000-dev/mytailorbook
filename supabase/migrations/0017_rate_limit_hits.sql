-- ============================================================
-- Rate limiting for public, unauthenticated routes
-- ============================================================
-- /track/[orderId], /studio/[shopId], /receipt/[orderId] and the public
-- comment/reminder actions all use a service-role client that bypasses
-- RLS, secured only by an unguessable ID in the URL — with nothing to
-- stop one IP from scripting through many IDs to scrape customer names,
-- phone numbers, and photos. This table backs a simple sliding-window
-- counter (see lib/rateLimit.ts) keyed by "route:ip", checked before each
-- public read/write. Deliberately Postgres-backed rather than a new
-- Redis/Upstash service — this app already has a Supabase project, and at
-- this traffic scale an extra DB round-trip is irrelevant.
-- ============================================================

create table rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limit_hits_key_created on rate_limit_hits (key, created_at);
