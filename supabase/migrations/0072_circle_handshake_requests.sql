-- Migration 0072: Circle Handshake Requests, Directory Discoverability & Slug Backfill

-- 1. Create circle_requests table for mutual handshake invitations
CREATE TABLE IF NOT EXISTS circle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  receiver_shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_shop_id, receiver_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_requests_receiver ON circle_requests(receiver_shop_id, status);
CREATE INDEX IF NOT EXISTS idx_circle_requests_sender ON circle_requests(sender_shop_id, status);

-- Enable RLS on circle_requests
ALTER TABLE circle_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view circle requests for their shop"
  ON circle_requests FOR SELECT
  USING (sender_shop_id = ANY(current_branch_ids()) OR receiver_shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can insert circle requests from their shop"
  ON circle_requests FOR INSERT
  WITH CHECK (sender_shop_id = ANY(current_branch_ids()));

CREATE POLICY "Users can update circle requests involving their shop"
  ON circle_requests FOR UPDATE
  USING (sender_shop_id = ANY(current_branch_ids()) OR receiver_shop_id = ANY(current_branch_ids()));

-- 2. Add directory_discoverable column to shops if not present
ALTER TABLE shops ADD COLUMN IF NOT EXISTS directory_discoverable BOOLEAN NOT NULL DEFAULT true;

-- 3. Automatic backfill of slug (usernames) for existing shops where slug is missing or blank
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, name FROM shops WHERE slug IS NULL OR slug = '' LOOP
    UPDATE shops 
    SET slug = generate_unique_shop_slug(r.name, r.id)
    WHERE id = r.id;
  END LOOP;
END $$;

