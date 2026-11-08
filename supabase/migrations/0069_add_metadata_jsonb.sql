-- Migration 0069: Add metadata JSONB to orders, customers, and finished_goods
-- Supports extended tailor attributes (logistics, multi-contact, artisan specialization, consignment)
-- without requiring future schema migrations as the atelier scales to 10,000+ shops.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create GIN indexes for high-speed nested JSONB querying at scale
CREATE INDEX IF NOT EXISTS idx_orders_metadata ON orders USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_customers_metadata ON customers USING gin (metadata);
