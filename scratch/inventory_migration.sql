CREATE TABLE public.inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  low_stock_threshold numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create policy for users in the same shop
CREATE POLICY "Users can access their shop's inventory" ON public.inventory
  FOR ALL USING (
    shop_id IN (
      SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );

-- Function to auto-update updated_at on inventory table
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION moddatetime (updated_at);

CREATE TABLE public.order_materials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.order_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their shop's order materials" ON public.order_materials
  FOR ALL USING (
    shop_id IN (
      SELECT profiles.shop_id FROM profiles WHERE profiles.id = auth.uid()
    )
  );
