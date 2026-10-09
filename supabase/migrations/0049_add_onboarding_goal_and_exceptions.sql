-- Add onboarding goal to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS onboarding_goal TEXT;

-- Create shop_exceptions table
CREATE TABLE IF NOT EXISTS shop_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    reason TEXT,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shop_exceptions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for shop_exceptions
CREATE POLICY "Users can view exceptions for their shops" ON shop_exceptions
    FOR SELECT USING (shop_id = current_shop_id());

CREATE POLICY "Users can create exceptions for their shops" ON shop_exceptions
    FOR INSERT WITH CHECK (shop_id = current_shop_id());

CREATE POLICY "Users can update exceptions for their shops" ON shop_exceptions
    FOR UPDATE USING (shop_id = current_shop_id());

CREATE POLICY "Users can delete exceptions for their shops" ON shop_exceptions
    FOR DELETE USING (shop_id = current_shop_id());
