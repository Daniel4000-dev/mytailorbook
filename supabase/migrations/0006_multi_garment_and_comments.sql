-- ============================================================
-- Multi-garment batch intake, stage-tagged photos, customer comments,
-- and inspiration photos
-- ============================================================
-- Problem this solves: when a customer drops off multiple garments at
-- once, each one needs its own kanban card (they move through
-- Cutting/Sewing/Ready at different paces) — but re-entering the same
-- customer's details for every single garment is tedious. batch_id lets
-- several orders created in one intake session be grouped together in the
-- UI, while each still moves independently on the board.
--
-- images: converts from a flat text[] of URLs to jsonb so each photo can
-- carry the production stage it was taken at ({url, stage, uploadedAt}) —
-- lets the tracking page show a real cutting -> sewing -> ready story
-- instead of one flat gallery. Done as add-column/backfill/swap rather
-- than a single ALTER COLUMN ... USING, because Postgres does not allow a
-- subquery inside a column transform expression (error 0A000).
--
-- order_comments: lets a customer leave a note/comment on their garment
-- from the public tracking page, tagged with whatever stage the order was
-- in at the moment they wrote it — same tagging idea as the photos above,
-- applied to comments. One-directional for now (customer writes, tailor
-- reads) — matches every other customer-facing feature in this app, which
-- has no in-app messaging and relies on manual WhatsApp for replies.
--
-- inspiration_images: a reference photo the CUSTOMER brought in (what they
-- want made), separate from the progress photos (which show the tailor's
-- actual work) — attached once at intake, for whoever's assigned to the
-- order to reference while working.
-- ============================================================

alter table orders add column batch_id uuid;
create index idx_orders_batch on orders (batch_id) where batch_id is not null;

alter table orders add column inspiration_images text[] not null default '{}';

-- New-comment visibility: last_comment_at is bumped by the public comment
-- action whenever a customer writes; comments_seen_at is bumped when the
-- shop opens that order's detail sheet. last_comment_at > comments_seen_at
-- means "unread" — surfaced as a badge on the order card and a Needs
-- Attention nudge, since nothing else in this app is a notification system
-- and a comment sitting unseen for days is effectively invisible.
alter table orders add column last_comment_at timestamptz;
alter table orders add column comments_seen_at timestamptz;

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
alter table orders alter column images set not null;

create table order_comments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  message text not null,
  stage text not null check (stage in ('Documented', 'Cutting', 'Sewing', 'Ready', 'Completed')),
  created_at timestamptz not null default now()
);

create index idx_order_comments_order on order_comments (order_id);
create index idx_order_comments_shop on order_comments (shop_id);

alter table order_comments enable row level security;

-- Shop members read comments left by customers. No insert/update/delete
-- policy for authenticated shop members — customer comments come in only
-- through the public tracking page, via a service-role action that
-- bypasses RLS by design (same pattern as submitOrderRating), never
-- through a normal logged-in client.
create policy "select shop order comments" on order_comments
  for select using (shop_id = current_shop_id());
