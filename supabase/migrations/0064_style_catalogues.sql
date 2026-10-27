-- ============================================================
-- 0064_style_catalogues.sql
-- Style catalogues and album photos for atelier lookbooks
-- ============================================================

CREATE TABLE IF NOT EXISTS style_catalogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_style_catalogues_shop_id ON style_catalogues(shop_id);

CREATE TABLE IF NOT EXISTS style_catalogue_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_id UUID NOT NULL REFERENCES style_catalogues(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_style_catalogue_photos_catalogue_id ON style_catalogue_photos(catalogue_id);

-- Enable RLS
ALTER TABLE style_catalogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_catalogue_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for style_catalogues
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogues' AND policyname = 'Users can view their shop style catalogues'
  ) THEN
    CREATE POLICY "Users can view their shop style catalogues" ON style_catalogues
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogues' AND policyname = 'Users can manage their shop style catalogues'
  ) THEN
    CREATE POLICY "Users can manage their shop style catalogues" ON style_catalogues
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RLS Policies for style_catalogue_photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogue_photos' AND policyname = 'Users can view style catalogue photos'
  ) THEN
    CREATE POLICY "Users can view style catalogue photos" ON style_catalogue_photos
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'style_catalogue_photos' AND policyname = 'Users can manage style catalogue photos'
  ) THEN
    CREATE POLICY "Users can manage style catalogue photos" ON style_catalogue_photos
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
