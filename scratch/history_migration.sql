ALTER TABLE public.customers
ADD COLUMN measurements_updated_at timestamp with time zone,
ADD COLUMN measurements_history jsonb DEFAULT '[]'::jsonb;
