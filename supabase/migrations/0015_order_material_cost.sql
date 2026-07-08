-- ============================================================
-- Real cost/profit tracking (Feature Section 4)
-- ============================================================
-- Revenue collected isn't profit — it ignores what materials actually
-- cost. Adds an optional material_cost per order (a single number, e.g.
-- "₦8,000 fabric for this job"), independent from the fabric inventory
-- list so recording it doesn't require the heavier fabric+yardage
-- tracking workflow. Lets the Dashboard show real estimated profit
-- (revenue minus material cost) for orders where it's been recorded.
-- ============================================================

alter table orders
  add column material_cost integer;
