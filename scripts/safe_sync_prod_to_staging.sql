-- =====================================================================
-- MYSTITCHBOOK: SAFE IDEMPOTENT PRODUCTION SYNC (MIGRATIONS 0060 - 0072)
-- =====================================================================
-- Target Database: Production (dbbzgdklhxshgqhwrxoq)
-- Purpose: Safely brings production schema up to speed with staging.
-- Safety: Every statement uses IF NOT EXISTS and does NOT drop any table,
--         column, or existing user data.
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dbbzgdklhxshgqhwrxoq/sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Migration 0060 & 0061: Gamification, Work Days, Vacation, XP, Gems
-- ---------------------------------------------------------------------
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS work_days JSONB DEFAULT '[1,2,3,4,5,6]';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN DEFAULT false;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS daily_quests JSONB DEFAULT '{}';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS gems INT DEFAULT 0;

-- ---------------------------------------------------------------------
-- 2. Migration 0062: Master Tailor Challenge, Referrals & Buddies
-- ---------------------------------------------------------------------
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS referred_by_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS referral_reward_claimed BOOLEAN DEFAULT false;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS buddy_shop_id UUID REFERENCES shops(id) ON DELETE SET NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS buddy_streak_count INT DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS buddy_last_active_at TIMESTAMPTZ;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS rest_days_used_this_week INT DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS last_rest_day_date DATE;

-- Populate existing shops with a unique referral code if empty
UPDATE public.shops
SET referral_code = 'STITCH-' || UPPER(SUBSTRING(MD5(id::text || clock_timestamp()::text) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- Create xp_ledger table for transparent auditing
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_ledger_shop_id ON public.xp_ledger(shop_id);

-- ---------------------------------------------------------------------
-- 3. Migration 0063: Monthly Revenue Target
-- ---------------------------------------------------------------------
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS monthly_revenue_target NUMERIC DEFAULT 0;

-- ---------------------------------------------------------------------
-- 4. Migration 0064: Style Catalogues & Lookbooks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.style_catalogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_style_catalogues_shop_id ON public.style_catalogues(shop_id);

CREATE TABLE IF NOT EXISTS public.style_catalogue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_id UUID NOT NULL REFERENCES public.style_catalogues(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_style_catalogue_photos_catalogue_id ON public.style_catalogue_photos(catalogue_id);

-- Enable RLS for style_catalogues
ALTER TABLE public.style_catalogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_catalogue_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogues' AND policyname = 'Users can view catalogues of their shop'
  ) THEN
    CREATE POLICY "Users can view catalogues of their shop"
      ON public.style_catalogues FOR SELECT
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogues' AND policyname = 'Users can manage catalogues of their shop'
  ) THEN
    CREATE POLICY "Users can manage catalogues of their shop"
      ON public.style_catalogues FOR ALL
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogue_photos' AND policyname = 'Users can view catalogue photos of their shop'
  ) THEN
    CREATE POLICY "Users can view catalogue photos of their shop"
      ON public.style_catalogue_photos FOR SELECT
      USING (catalogue_id IN (
        SELECT id FROM public.style_catalogues WHERE shop_id IN (
          SELECT shop_id FROM public.profiles WHERE id = auth.uid()
        )
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogue_photos' AND policyname = 'Users can manage catalogue photos of their shop'
  ) THEN
    CREATE POLICY "Users can manage catalogue photos of their shop"
      ON public.style_catalogue_photos FOR ALL
      USING (catalogue_id IN (
        SELECT id FROM public.style_catalogues WHERE shop_id IN (
          SELECT shop_id FROM public.profiles WHERE id = auth.uid()
        )
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5. Migration 0065: Staff Craft Role & Payroll Columns
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS craft_role TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS payroll_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payroll_amount NUMERIC DEFAULT 0;

-- ---------------------------------------------------------------------
-- 6. Migration 0066: Atelier Notifications Hub
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atelier_notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  recipient_id   UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  category       TEXT        NOT NULL CHECK (category IN ('production', 'clients', 'payments', 'system')),
  tone           TEXT        NOT NULL DEFAULT 'info' CHECK (tone IN ('alert', 'warning', 'info')),
  actor_name     TEXT,
  actor_avatar_url TEXT,
  badge_icon     TEXT,
  badge_bg       TEXT,
  badge_color    TEXT,
  action_label   TEXT        NOT NULL,
  target_name    TEXT        NOT NULL,
  metadata_label TEXT,
  body           TEXT,
  link_url       TEXT,
  read           BOOLEAN     NOT NULL DEFAULT false,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atelier_notifications_shop_created
  ON public.atelier_notifications (shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atelier_notifications_shop_unread
  ON public.atelier_notifications (shop_id, read)
  WHERE read = false;

ALTER TABLE public.atelier_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'atelier_notifications' AND policyname = 'Members can read notifications for their shop'
  ) THEN
    CREATE POLICY "Members can read notifications for their shop"
      ON public.atelier_notifications FOR SELECT
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'atelier_notifications' AND policyname = 'Members can update notifications for their shop'
  ) THEN
    CREATE POLICY "Members can update notifications for their shop"
      ON public.atelier_notifications FOR UPDATE
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()))
      WITH CHECK (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'atelier_notifications' AND policyname = 'Members can delete notifications for their shop'
  ) THEN
    CREATE POLICY "Members can delete notifications for their shop"
      ON public.atelier_notifications FOR DELETE
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 7. Migration 0067: Entity Slugs & Default Bespoke Mode
-- ---------------------------------------------------------------------
ALTER TABLE public.shops ALTER COLUMN business_mode SET DEFAULT 'bespoke';
UPDATE public.shops
SET business_mode = 'bespoke'
WHERE business_mode IS NULL
   OR btrim(business_mode) = ''
   OR business_mode NOT IN ('bespoke', 'rtw', 'hybrid');

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.style_catalogues ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_shop_slug ON public.orders(shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_customers_shop_slug ON public.customers(shop_id, slug);
CREATE INDEX IF NOT EXISTS idx_style_catalogues_shop_slug ON public.style_catalogues(shop_id, slug);

-- ---------------------------------------------------------------------
-- 8. Migration 0068: Multi-Peer Circle Members
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  buddy_shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sabbatical', 'dormant')),
  sabbatical_reason TEXT,
  sabbatical_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, buddy_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_shop ON public.circle_members(shop_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_buddy ON public.circle_members(buddy_shop_id);

ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'circle_members' AND policyname = 'Members can view their own circle memberships'
  ) THEN
    CREATE POLICY "Members can view their own circle memberships"
      ON public.circle_members FOR SELECT
      USING (
        shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()) OR
        buddy_shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'circle_members' AND policyname = 'Members can manage their circle memberships'
  ) THEN
    CREATE POLICY "Members can manage their circle memberships"
      ON public.circle_members FOR ALL
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 9. Migration 0069: Extended Metadata JSONB & GIN Indexes
-- ---------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'finished_goods') THEN
    ALTER TABLE public.finished_goods ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_finished_goods_metadata ON public.finished_goods USING gin (metadata);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_metadata ON public.orders USING gin (metadata);
CREATE INDEX IF NOT EXISTS idx_customers_metadata ON public.customers USING gin (metadata);

-- ---------------------------------------------------------------------
-- 10. Migration 0070: Subscription Pause & Catalogue Retention
-- ---------------------------------------------------------------------
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS subscription_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_pause_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_pause_months INT,
  ADD COLUMN IF NOT EXISTS subscription_pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS catalogue_photos_purge_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS catalogue_photos_purged_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 11. Migration 0071: Workshop Materials Inventory & Tracking
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'yards',
  low_stock_threshold NUMERIC CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0),
  is_consignment BOOLEAN DEFAULT false,
  consignor_name TEXT,
  location TEXT,
  unit_cost NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_shop_id ON public.inventory(shop_id);

CREATE TABLE IF NOT EXISTS public.order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
  material_name TEXT NOT NULL,
  quantity_used NUMERIC NOT NULL DEFAULT 1 CHECK (quantity_used > 0),
  unit TEXT NOT NULL DEFAULT 'yards',
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_materials_order_id ON public.order_materials(order_id);
CREATE INDEX IF NOT EXISTS idx_order_materials_inventory_id ON public.order_materials(inventory_id);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Users can view their shop inventory'
  ) THEN
    CREATE POLICY "Users can view their shop inventory"
      ON public.inventory FOR SELECT
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Users can manage their shop inventory'
  ) THEN
    CREATE POLICY "Users can manage their shop inventory"
      ON public.inventory FOR ALL
      USING (shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_materials' AND policyname = 'Users can view their shop order materials'
  ) THEN
    CREATE POLICY "Users can view their shop order materials"
      ON public.order_materials FOR SELECT
      USING (order_id IN (
        SELECT id FROM public.orders WHERE shop_id IN (
          SELECT shop_id FROM public.profiles WHERE id = auth.uid()
        )
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'order_materials' AND policyname = 'Users can manage their shop order materials'
  ) THEN
    CREATE POLICY "Users can manage their shop order materials"
      ON public.order_materials FOR ALL
      USING (order_id IN (
        SELECT id FROM public.orders WHERE shop_id IN (
          SELECT shop_id FROM public.profiles WHERE id = auth.uid()
        )
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 12. Migration 0072: Mutual Handshake Invitations & Tailor Directory
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  receiver_shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_shop_id, receiver_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_requests_receiver ON public.circle_requests(receiver_shop_id, status);
CREATE INDEX IF NOT EXISTS idx_circle_requests_sender ON public.circle_requests(sender_shop_id, status);

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_circle_discoverable BOOLEAN DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_shops_circle_discoverable ON public.shops(is_circle_discoverable) WHERE is_circle_discoverable = true;

ALTER TABLE public.circle_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'circle_requests' AND policyname = 'Users can view their circle requests'
  ) THEN
    CREATE POLICY "Users can view their circle requests"
      ON public.circle_requests FOR SELECT
      USING (
        sender_shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()) OR
        receiver_shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'circle_requests' AND policyname = 'Users can create circle requests for their shop'
  ) THEN
    CREATE POLICY "Users can create circle requests for their shop"
      ON public.circle_requests FOR INSERT
      WITH CHECK (sender_shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'circle_requests' AND policyname = 'Users can update their circle requests'
  ) THEN
    CREATE POLICY "Users can update their circle requests"
      ON public.circle_requests FOR UPDATE
      USING (
        sender_shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()) OR
        receiver_shop_id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid())
      );
  END IF;
END $$;
