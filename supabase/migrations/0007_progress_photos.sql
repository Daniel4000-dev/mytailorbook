-- ============================================================
-- Progress photos (Feature Section 2)
-- ============================================================
-- orders.images was a flat text[] of photo URLs with no memory of *when*
-- in production each photo was taken. Converting to jsonb so each photo
-- can carry the production stage it was taken at ({url, stage, uploadedAt})
-- — this is what lets the customer-facing tracking page show an actual
-- visual story (cutting -> sewing -> ready) instead of one flat gallery.
--
-- Existing plain-URL rows are backfilled by tagging every photo with
-- whatever stage the order is CURRENTLY in — an imperfect guess for
-- historical data, but a reasonable one, and new uploads are tagged
-- correctly going forward.
--
-- Done as add-column/backfill/swap rather than a single
-- ALTER COLUMN ... TYPE ... USING, because Postgres does not allow a
-- subquery inside a column transform expression (error 0A000).
-- ============================================================

alter table orders add column images_new jsonb default '[]'::jsonb;

update orders
set images_new = coalesce(
  (
    select jsonb_agg(jsonb_build_object('url', img, 'stage', status, 'uploadedAt', created_at))
    from unnest(images) as img
  ),
  '[]'::jsonb
);

alter table orders drop column images;
alter table orders rename column images_new to images;
