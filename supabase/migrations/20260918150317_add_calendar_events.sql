CREATE TYPE calendar_event_type AS ENUM (
  'fitting', 
  'market_run', 
  'meeting', 
  'dispatch', 
  'fabric_delivery', 
  'payment_followup', 
  'shop_maintenance', 
  'general_task', 
  'off_day'
);

CREATE TABLE public.calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type calendar_event_type NOT NULL,
  date date NOT NULL,
  start_time time,
  end_time time,
  related_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  related_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for efficient querying by month and shop
CREATE INDEX idx_calendar_events_shop_date ON public.calendar_events(shop_id, date);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/write calendar events for their own shop
CREATE POLICY "Users can manage calendar events in their shop"
  ON public.calendar_events
  FOR ALL
  USING (shop_id = current_shop_id());
