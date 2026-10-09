CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL CHECK (category IN ('material', 'labor', 'outsourced', 'logistics', 'general')),
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX expenses_shop_id_idx ON expenses(shop_id);
CREATE INDEX expenses_order_id_idx ON expenses(order_id);
CREATE INDEX expenses_date_idx ON expenses(date);

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their shop's expenses" ON expenses
  FOR SELECT
  USING (shop_id = any(current_branch_ids()));

CREATE POLICY "Users can insert their shop's expenses" ON expenses
  FOR INSERT
  WITH CHECK (shop_id = any(current_branch_ids()));

CREATE POLICY "Users can update their shop's expenses" ON expenses
  FOR UPDATE
  USING (shop_id = any(current_branch_ids()))
  WITH CHECK (shop_id = any(current_branch_ids()));

CREATE POLICY "Users can delete their shop's expenses" ON expenses
  FOR DELETE
  USING (shop_id = any(current_branch_ids()));
