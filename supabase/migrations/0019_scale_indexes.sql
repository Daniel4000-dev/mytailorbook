-- ============================================================
-- Scale hardening: missing indexes (Phase 1 of the industry-scale roadmap)
-- ============================================================
-- Only 5 indexes exist total, all from the very first migration (0001).
-- Every table added since — appointments, order_installments, fabric_items,
-- order_templates, customer_measurement_history, portfolio_photos — has
-- zero indexes beyond its primary key. At small scale this is invisible;
-- at real volume every list/filter query on these tables degrades to a
-- full table scan.
--
-- Also adds composite indexes matching the app's ACTUAL access patterns
-- (kanban board = "this shop's orders, by status, newest first") rather
-- than just single-column FK indexes, plus a trigram index on customer
-- name/phone so server-side search (Phase 3) has something to use.
-- ============================================================

-- Newer tables that never got a shop_id index.
create index idx_appointments_shop on appointments (shop_id);
create index idx_order_installments_shop on order_installments (shop_id);
create index idx_fabric_items_shop on fabric_items (shop_id);
create index idx_order_templates_shop on order_templates (shop_id);
create index idx_measurement_history_shop on customer_measurement_history (shop_id);
create index idx_portfolio_photos_shop on portfolio_photos (shop_id);

-- Frequently-joined foreign keys that were missing an index.
create index idx_order_installments_order on order_installments (order_id);
create index idx_measurement_history_customer on customer_measurement_history (customer_id);
create index idx_appointments_customer on appointments (customer_id);
create index idx_appointments_order on appointments (order_id);

-- Composite indexes for the app's real query shapes, not just raw FKs.
-- Kanban board: "this shop's orders, filtered by status, newest first."
create index idx_orders_shop_status_created on orders (shop_id, status, created_at desc);
-- Dashboard "due today"/"overdue" checks and the Schedule page's ordering.
create index idx_orders_shop_due_date on orders (shop_id, due_date) where due_date is not null;
create index idx_appointments_shop_scheduled on appointments (shop_id, scheduled_at);

-- Server-side customer search (Phase 3 depends on this existing).
create extension if not exists pg_trgm;
create index idx_customers_full_name_trgm on customers using gin (full_name gin_trgm_ops);
create index idx_customers_whatsapp_trgm on customers using gin (whatsapp_number gin_trgm_ops);
