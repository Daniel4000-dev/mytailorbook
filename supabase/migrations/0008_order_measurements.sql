-- ============================================================
-- Per-order measurement snapshot
-- ============================================================
-- The numbers a garment was actually cut to, frozen at intake by the
-- order wizard's measurement step. The customer's body profile
-- (customers.measurements) keeps evolving; this records what THIS
-- garment used — bodies change, cut garments don't. Also powers
-- "import from last Agbada" in the wizard (latest same-style order's
-- snapshot wins over the generic profile).
-- ============================================================

alter table orders add column measurements jsonb;
