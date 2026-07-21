-- Persisted, named per-style measurement profiles for a customer (e.g. "Agbada",
-- "Two-Piece Suit"), distinct from the customer's flat body-profile in
-- `measurements`. Lets a returning client's numbers for a specific garment be
-- recalled directly, instead of only via scanning their past orders.
alter table customers add column style_measurements jsonb not null default '{}'::jsonb;

