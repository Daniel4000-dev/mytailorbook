-- Migration to add streak freezes column to shops table
ALTER TABLE shops ADD COLUMN streak_freezes INT DEFAULT 0;
