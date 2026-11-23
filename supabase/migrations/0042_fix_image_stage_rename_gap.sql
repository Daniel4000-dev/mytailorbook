-- ============================================================
-- Fix a gap in 0039's 'Completed' -> 'Delivered' rename
-- ============================================================
-- 0039 renamed orders.status, order_comments.stage, and the {from,to}
-- fields inside orders.status_history — but missed the per-photo `stage`
-- tag inside orders.images (a jsonb array of {url, stage, uploadedAt}).
-- Any photo taken at the old 'Completed' stage was left stamped that
-- way, which silently breaks syncAutoPortfolioPhotosAction (Phase 2 of
-- the portfolio redesign) — it only pulls photos where stage =
-- 'Delivered', so a delivered order's own photos could be invisible to
-- its own portfolio pool.
--
-- Rebuilds each order's images array via jsonb_set rather than a text
-- replace — correct regardless of how Postgres serializes the jsonb
-- (key order, whitespace), unlike 0039's plain-text approach for
-- status_history.
update orders
set images = (
  select jsonb_agg(
    case when elem->>'stage' = 'Completed'
      then jsonb_set(elem, '{stage}', '"Delivered"')
      else elem
    end
  )
  from jsonb_array_elements(images) as elem
)
where images::text like '%"Completed"%';
