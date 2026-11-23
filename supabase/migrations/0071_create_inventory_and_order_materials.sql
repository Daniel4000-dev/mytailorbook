-- ============================================================
-- 0071_create_inventory_and_order_materials.sql
-- Workshop Materials Inventory and Order Material Tracking
-- ============================================================

-- 1. Create inventory table for tailoring haberdashery, lining, threads, and fabrics
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'yards',
  low_stock_threshold NUMERIC CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0),
  is_consignment BOOLEAN DEFAULT false,
  consignor_name TEXT,
  consignor_cut_percent NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory (shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON inventory (shop_id, item_name);

-- Enable Row Level Security (RLS)
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shop's inventory" 
ON inventory FOR SELECT 
USING (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can manage their shop's inventory" 
ON inventory FOR ALL 
USING (shop_id = ANY(current_branch_ids()));


-- 2. Create order_materials table for tracking materials assigned to garment orders
CREATE TABLE IF NOT EXISTS order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for order materials
CREATE INDEX IF NOT EXISTS idx_order_materials_order ON order_materials (order_id);
CREATE INDEX IF NOT EXISTS idx_order_materials_inventory ON order_materials (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_order_materials_shop ON order_materials (shop_id);

-- Enable Row Level Security (RLS)
ALTER TABLE order_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shop's order materials" 
ON order_materials FOR SELECT 
USING (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can manage their shop's order materials" 
ON order_materials FOR ALL 
USING (shop_id = ANY(current_branch_ids()));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
