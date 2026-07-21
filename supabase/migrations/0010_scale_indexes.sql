-- Growth-proofing: the existing single-column shop_id indexes are enough
-- for a shop's current data volume, but every list query filters by shop_id
-- AND sorts by created_at — a composite index covers both in one pass
-- instead of filtering then sorting separately as row counts grow.
create index idx_orders_shop_created on orders (shop_id, created_at desc);
create index idx_customers_shop_created on customers (shop_id, created_at desc);
