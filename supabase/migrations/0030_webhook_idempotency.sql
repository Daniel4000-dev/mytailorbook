-- ============================================================
-- Paystack webhook idempotency
-- ============================================================
-- Signature verification (app/api/webhooks/paystack) proves a request
-- really came from Paystack, but proves nothing about freshness — a
-- captured request replayed later still carries a valid signature. The
-- practical risk here is invoice.payment_failed: replaying an old one
-- after the shop has already fixed payment and gone active again would
-- wrongly drop it back into a grace period. Deduping on a hash of the
-- raw body closes this for exact replays (including Paystack's own
-- automatic retries, which resend identical payloads) without needing to
-- parse event-specific identifiers that differ by event type.

create table payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  body_hash text not null unique,
  event_type text not null,
  received_at timestamptz not null default now()
);

-- Old rows are only ever useful for the dedupe check within a short
-- window (Paystack's own retry backoff is measured in minutes/hours, not
-- days) — an index keeps that unique lookup cheap as the table grows.
create index idx_payment_webhook_events_hash on payment_webhook_events (body_hash);

-- Only the webhook route (admin/service-role client, bypasses RLS) ever
-- touches this table — no policies means anon/authenticated get nothing.
alter table payment_webhook_events enable row level security;
