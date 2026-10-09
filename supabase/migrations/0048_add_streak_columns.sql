-- Migration to add streak columns to shops table
ALTER TABLE shops ADD COLUMN streak_current INT DEFAULT 0;
ALTER TABLE shops ADD COLUMN streak_best INT DEFAULT 0;
ALTER TABLE shops ADD COLUMN streak_last_counted_at TIMESTAMP WITH TIME ZONE;
