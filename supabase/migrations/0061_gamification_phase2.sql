-- Phase 2 Gamification: Quests & Rewards
ALTER TABLE shops ADD COLUMN daily_quests JSONB DEFAULT '{}';
ALTER TABLE shops ADD COLUMN gems INT DEFAULT 0;
