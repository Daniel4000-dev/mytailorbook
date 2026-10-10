-- Phase 1 Gamification: Weekend Immunity & Vacation Mode
-- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
ALTER TABLE shops ADD COLUMN work_days JSONB DEFAULT '[1,2,3,4,5,6]';
ALTER TABLE shops ADD COLUMN vacation_mode BOOLEAN DEFAULT false;

-- Phase 2 Preparation: XP
ALTER TABLE shops ADD COLUMN xp INT DEFAULT 0;
