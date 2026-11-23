-- Migration 0062: Master Tailor Challenge (Equipment Grant, Referrals & Studio Buddies)

-- 1. Add Challenge, Referral, and Buddy columns to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS referred_by_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS referral_reward_claimed BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS buddy_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS buddy_streak_count INT DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS buddy_last_active_at TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rest_days_used_this_week INT DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS last_rest_day_date DATE;

-- Populate existing shops with a unique referral code if empty
UPDATE shops
SET referral_code = 'STITCH-' || UPPER(SUBSTRING(MD5(id::text || clock_timestamp()::text) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- 2. Create append-only XP Ledger for auditability and anti-cheat tracking
CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  action_type TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  description TEXT,
  fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast rate limiting & leaderboard queries
CREATE INDEX IF NOT EXISTS idx_xp_ledger_shop_date ON xp_ledger(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_fingerprint ON xp_ledger(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shops_xp_leaderboard ON shops(xp DESC);

-- Enable RLS on xp_ledger
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shop's xp ledger"
  ON xp_ledger FOR SELECT
  USING (shop_id = ANY(current_branch_ids()));
