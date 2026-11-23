-- ==============================================================
-- PHASE 2 & 3: Calendar Smart Automations and Event Status
-- ==============================================================

-- 1. Add weekly_capacity to shops table for Smart Capacity Warnings
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS weekly_capacity integer DEFAULT 15;

-- 2. Add status column to calendar_events for Task Completion Tracking
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text;

-- Update any existing rows to have the 'pending' status instead of NULL
UPDATE public.calendar_events 
SET status = 'pending' 
WHERE status IS NULL;
