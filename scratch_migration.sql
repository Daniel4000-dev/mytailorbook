-- Add category to portfolio_outfits
ALTER TABLE portfolio_outfits ADD COLUMN IF NOT EXISTS category text;
