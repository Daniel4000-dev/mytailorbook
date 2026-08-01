-- ============================================================
-- Per-order tracking-link toggle, with a shop-level default
-- ============================================================
-- Some tailors want the public tracking link left out of certain WhatsApp
-- updates (e.g. a repeat customer they already text directly, or an order
-- type where the photo timeline has nothing to show yet). A shop-wide
-- on/off would be all-or-nothing, so this is per-order — but defaults to
-- the shop's own preference so the common case is a one-time setting, not
-- a per-order chore.
--
-- orders.include_tracking_link is nullable: null means "inherit the shop
-- default" (every existing order, and any new order that never touches
-- the toggle); true/false is an explicit per-order override.

alter table shops add column default_tracking_link_enabled boolean not null default true;
alter table orders add column include_tracking_link boolean;
