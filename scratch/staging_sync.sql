-- ============================================================
-- THE GRAND STAGING CATCH-UP SCRIPT
-- Safely applies all recent missing tables and columns.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================

-- 1. EXPENSES TABLE (from 20260925224500)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL CHECK (category IN ('material', 'labor', 'outsourced', 'logistics', 'general')),
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_shop_id_idx ON expenses(shop_id);
CREATE INDEX IF NOT EXISTS expenses_order_id_idx ON expenses(order_id);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view expenses for their shops" ON expenses FOR SELECT USING (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert expenses for their shops" ON expenses FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add method to expenses (from 20260926010000)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS method text;

-- 2. PAYMENTS TABLE (from 20260926001800)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'transfer', 'pos', 'store_credit')),
    reference_note TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view payments for their shops" ON public.payments FOR SELECT USING (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert payments for their shops" ON public.payments FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. BILLING SAFETY (from 0045)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS paystack_environment text CHECK (paystack_environment IN ('test', 'live'));

ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_subscription_status_check;
ALTER TABLE shops ADD CONSTRAINT shops_subscription_status_check
  CHECK (subscription_status IN ('free', 'trialing', 'converting', 'conversion_failed', 'active', 'past_due', 'canceled'));

CREATE OR REPLACE FUNCTION prevent_billing_column_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    new.subscription_status IS DISTINCT FROM old.subscription_status OR
    new.subscription_plan IS DISTINCT FROM old.subscription_plan OR
    new.paystack_customer_code IS DISTINCT FROM old.paystack_customer_code OR
    new.paystack_subscription_code IS DISTINCT FROM old.paystack_subscription_code OR
    new.current_period_end IS DISTINCT FROM old.current_period_end OR
    new.grace_expires_at IS DISTINCT FROM old.grace_expires_at OR
    new.last_billing_reminder_sent_at IS DISTINCT FROM old.last_billing_reminder_sent_at OR
    new.trial_ends_at IS DISTINCT FROM old.trial_ends_at OR
    new.trial_used_at IS DISTINCT FROM old.trial_used_at OR
    new.paystack_authorization_code IS DISTINCT FROM old.paystack_authorization_code OR
    new.trial_plan_code IS DISTINCT FROM old.trial_plan_code OR
    new.paystack_environment IS DISTINCT FROM old.paystack_environment
  ) THEN
    RAISE EXCEPTION 'Billing fields can only be changed by the payment system';
  END IF;

  RETURN new;
END;
$func$;

-- 4. RTW & HYBRID BUSINESS MODE (from 20261003_rtw_features)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_mode text NOT NULL DEFAULT 'bespoke';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS daily_capacity integer NOT NULL DEFAULT 5;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS weekly_capacity integer NOT NULL DEFAULT 30;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_internal_batch boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_sizes jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE size_charts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their shop's size charts" ON size_charts FOR SELECT USING (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their shop's size charts" ON size_charts FOR INSERT WITH CHECK (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS finished_goods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their shop's finished goods" ON finished_goods FOR SELECT USING (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage their shop's finished goods" ON finished_goods FOR ALL USING (shop_id IN (SELECT shop_id FROM staff WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. RELOAD CACHE
NOTIFY pgrst, 'reload schema';
