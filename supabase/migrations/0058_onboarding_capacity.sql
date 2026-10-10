-- Add capacity and sourcing method to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS weekly_capacity integer;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rtw_sourcing_method text CHECK (rtw_sourcing_method IN ('in-house', 'wholesale', 'both'));
