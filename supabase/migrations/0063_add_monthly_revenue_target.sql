-- Add monthly_revenue_target column to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS monthly_revenue_target numeric DEFAULT 0;
