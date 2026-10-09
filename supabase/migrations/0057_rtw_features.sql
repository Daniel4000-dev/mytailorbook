-- RTW & Hybrid Business Mode Schema Updates

-- 1. Add RTW and Capacity Configuration to Shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_mode text NOT NULL DEFAULT 'bespoke';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS daily_capacity integer NOT NULL DEFAULT 5;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS weekly_capacity integer NOT NULL DEFAULT 30;

-- 2. Add Batch properties to Orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_internal_batch boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_sizes jsonb DEFAULT '[]'::jsonb;

-- 3. Create Size Charts table (for RTW grading)
CREATE TABLE IF NOT EXISTS size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for size_charts
ALTER TABLE size_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shop's size charts" 
ON size_charts FOR SELECT 
USING (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can insert their shop's size charts" 
ON size_charts FOR INSERT 
WITH CHECK (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can delete their shop's size charts" 
ON size_charts FOR DELETE 
USING (shop_id = ANY(current_branch_ids()));


-- 4. Create Finished Goods / Stock table (for Retail/POS)
CREATE TABLE IF NOT EXISTS finished_goods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for finished_goods
ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shop's finished goods" 
ON finished_goods FOR SELECT 
USING (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can manage their shop's finished goods" 
ON finished_goods FOR ALL 
USING (shop_id = ANY(current_branch_ids()));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
