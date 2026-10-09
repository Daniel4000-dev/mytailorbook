-- In case these columns are missing from the shops table, this will add them
-- (Run this in the Supabase SQL Editor)
ALTER TABLE shops 
  ADD COLUMN IF NOT EXISTS daily_capacity integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS weekly_capacity integer,
  ADD COLUMN IF NOT EXISTS business_mode text DEFAULT 'bespoke';

-- Force Supabase's API schema cache to reload immediately
NOTIFY pgrst, 'reload schema';
