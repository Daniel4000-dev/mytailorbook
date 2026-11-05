-- 0067_entity_slugs_and_bespoke_default.sql
-- 1. Ensure every existing shop that has not selected a business_mode is defaulted to 'bespoke'
ALTER TABLE shops ALTER COLUMN business_mode SET DEFAULT 'bespoke';
UPDATE shops
SET business_mode = 'bespoke'
WHERE business_mode IS NULL
   OR btrim(business_mode) = ''
   OR business_mode NOT IN ('bespoke', 'rtw', 'hybrid');

-- 2. Add stored `slug` columns to orders, customers, and style_catalogues
ALTER TABLE orders ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE style_catalogues ADD COLUMN IF NOT EXISTS slug text;

-- 3. Helper function to slugify text cleanly in Postgres
CREATE OR REPLACE FUNCTION public.slugify_text(input text, max_len int DEFAULT 32)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM left(
    regexp_replace(
      lower(coalesce(input, '')),
      '[^a-z0-9]+',
      '-',
      'g'
    ),
    max_len
  ));
$$;

-- 4. Backfill existing orders, customers, and style_catalogues with deterministic unique slugs
UPDATE orders
SET slug = CASE
  WHEN btrim(coalesce(customer_name, '') || ' ' || coalesce(style_name, order_details, '')) <> ''
  THEN public.slugify_text(coalesce(customer_name, '') || '-' || coalesce(style_name, order_details, ''), 36)
       || '-' || left(replace(id::text, '-', ''), 6)
  ELSE 'order-' || left(replace(id::text, '-', ''), 6)
END
WHERE slug IS NULL;

UPDATE customers
SET slug = CASE
  WHEN btrim(coalesce(full_name, '')) <> ''
  THEN public.slugify_text(full_name, 28) || '-' || left(replace(id::text, '-', ''), 6)
  ELSE 'client-' || left(replace(id::text, '-', ''), 6)
END
WHERE slug IS NULL;

UPDATE style_catalogues
SET slug = CASE
  WHEN btrim(coalesce(title, '')) <> ''
  THEN public.slugify_text(title, 32) || '-' || left(replace(id::text, '-', ''), 6)
  ELSE 'lookbook-' || left(replace(id::text, '-', ''), 6)
END
WHERE slug IS NULL;

-- 5. Triggers so every newly inserted/updated row automatically gets its slug in Supabase
CREATE OR REPLACE FUNCTION public.set_order_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    base := public.slugify_text(coalesce(NEW.customer_name, '') || '-' || coalesce(NEW.style_name, NEW.order_details, ''), 36);
    IF base = '' THEN base := 'order'; END IF;
    NEW.slug := base || '-' || left(replace(NEW.id::text, '-', ''), 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_slug ON orders;
CREATE TRIGGER trg_orders_set_slug
BEFORE INSERT OR UPDATE OF customer_name, style_name, order_details ON orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_slug();

CREATE OR REPLACE FUNCTION public.set_customer_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    base := public.slugify_text(coalesce(NEW.full_name, ''), 28);
    IF base = '' THEN base := 'client'; END IF;
    NEW.slug := base || '-' || left(replace(NEW.id::text, '-', ''), 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_set_slug ON customers;
CREATE TRIGGER trg_customers_set_slug
BEFORE INSERT OR UPDATE OF full_name ON customers
FOR EACH ROW EXECUTE FUNCTION public.set_customer_slug();

CREATE OR REPLACE FUNCTION public.set_catalogue_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    base := public.slugify_text(coalesce(NEW.title, ''), 32);
    IF base = '' THEN base := 'lookbook'; END IF;
    NEW.slug := base || '-' || left(replace(NEW.id::text, '-', ''), 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_style_catalogues_set_slug ON style_catalogues;
CREATE TRIGGER trg_style_catalogues_set_slug
BEFORE INSERT OR UPDATE OF title ON style_catalogues
FOR EACH ROW EXECUTE FUNCTION public.set_catalogue_slug();

-- 6. Indexes for fast slug lookups on public & authenticated routes
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_slug ON orders(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_slug ON customers(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_style_catalogues_slug ON style_catalogues(slug);

NOTIFY pgrst, 'reload schema';

