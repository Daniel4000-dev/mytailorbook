CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'transfer', 'pos', 'store_credit')),
    reference_note TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and manage payments for their own shops
CREATE POLICY "Users can view payments for their shops" ON public.payments
    FOR SELECT USING (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can insert payments for their shops" ON public.payments
    FOR INSERT WITH CHECK (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can update payments for their shops" ON public.payments
    FOR UPDATE USING (shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can delete payments for their shops" ON public.payments
    FOR DELETE USING (shop_id = ANY(current_branch_ids()));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_shop_id ON public.payments(shop_id);
