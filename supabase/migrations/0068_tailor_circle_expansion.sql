-- Migration 0068: Tailor Circle Expansion (Multi-peer Circle, Sabbaticals & Benefits Tiers)

-- 1. Create circle_members table for multi-peer atelier circles
CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  buddy_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sabbatical', 'dormant')),
  sabbatical_reason TEXT,
  sabbatical_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, buddy_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_shop ON circle_members(shop_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_buddy ON circle_members(buddy_shop_id);

-- Enable RLS on circle_members
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view circle members for their shop"
  ON circle_members FOR SELECT
  USING (shop_id = ANY(current_branch_ids()) OR buddy_shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can manage circle members for their shop"
  ON circle_members FOR ALL
  USING (shop_id = ANY(current_branch_ids()));

-- 2. Populate circle_members from existing shops.buddy_shop_id if present
INSERT INTO circle_members (shop_id, buddy_shop_id, status)
SELECT id, buddy_shop_id, 'active'
FROM shops
WHERE buddy_shop_id IS NOT NULL
ON CONFLICT (shop_id, buddy_shop_id) DO NOTHING;
