-- ============================================================
-- Elevate style/fit notes to a first-class field (Feature Section 3)
-- ============================================================
-- "Notes" used to live nested inside customers.measurements, only ever
-- saved as a side effect of a measurement edit. That's a poor fit for
-- something that's actually a fit/style preference log ("prefers loose
-- sleeves", "left shoulder slightly lower") — it shouldn't be coupled to
-- number edits, and it shouldn't get swept into the new measurement
-- history snapshots (those should capture pure numbers).
--
-- Existing notes are backfilled from measurements->>'notes' so nothing
-- written so far is lost.
-- ============================================================

alter table customers
  add column style_notes text;

update customers
set style_notes = measurements->>'notes'
where measurements ? 'notes' and measurements->>'notes' is not null and measurements->>'notes' != '';
