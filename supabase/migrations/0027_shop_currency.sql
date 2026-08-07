-- Add currency support to shops (defaults to NGN for existing shops)
ALTER TABLE shops ADD COLUMN currency text NOT NULL DEFAULT 'NGN';
