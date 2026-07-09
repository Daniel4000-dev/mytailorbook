-- ============================================================
-- Staff/ops: commission tracking + stage checklists (Feature Section 7)
-- ============================================================
-- Commission: an optional per-staff rate (%), used to compute what each
-- person has actually earned from their completed, assigned orders — set
-- alongside the existing staff directory in Settings, surfaced as a new
-- stat in the Dashboard's existing Team Snapshot rather than a new page.
--
-- Stage checklists: a small FIXED checklist per production stage
-- (Cutting/Sewing/Ready), ticked off on the Order Detail Sheet — a
-- lightweight quality-control habit, not a configurable workflow builder.
-- ============================================================

alter table profiles
  add column commission_rate numeric;

alter table orders
  add column stage_checklist jsonb not null default '{}'::jsonb;
