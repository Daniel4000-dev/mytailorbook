-- ==============================================================================
-- PRODUCTION STYLES & ACCOUNTS AUDIT QUERY (WITH EXACT TIME & DORMANCY)
-- ==============================================================================
-- Run this in the PRODUCTION Supabase SQL Editor.
--
-- Features:
-- 1. Evaluates all 21 system presets and custom styles.
-- 2. Calculates exact time last used and DAYS AGO (Dormancy tier).
-- 3. Identifies styles that are Active (<30d), Warm (30-60d), Dormant (>60d), or Dead.
-- 4. Captures all accounts that used each style with order counts.
-- ==============================================================================

WITH standard_presets(name, gender, subtitle) AS (
  VALUES
    -- Male Styles
    ('Agbada', 'Male', 'Traditional 3-piece set'),
    ('Senator', 'Male', 'Modern native'),
    ('Kaftan', 'Male', '2-piece suit'),
    ('Ankara Shirt', 'Male', 'Casual print shirt'),
    ('Danshiki', 'Male', 'Casual native top'),
    ('Two-Piece Suit', 'Male', 'Bespoke suiting'),
    ('Babariga', 'Male', 'Grand embroidered robe'),
    ('Isi Agu', 'Male', 'Chieftaincy/cultural wear'),
    ('Aso Ebi (Men)', 'Male', 'Matching event wear'),
    ('Two-Piece (Men)', 'Male', 'Matching top and trousers'),

    -- Female Styles
    ('Ankara Gown', 'Female', 'Women''s tailored gown'),
    ('Buba & Iro', 'Female', 'Traditional women''s wear'),
    ('Boubou', 'Female', 'Flowing formal gown'),
    ('Skirt & Blouse', 'Female', 'Office/native combo'),
    ('Aso Ebi Gown', 'Female', 'Event/ceremony dress'),
    ('Jumpsuit', 'Female', 'Modern tailored piece'),
    ('Kaftan (Women)', 'Female', 'Relaxed flowing gown'),
    ('Senator (Women)', 'Female', 'Fitted native 2-piece'),
    ('Peplum & Wrapper', 'Female', 'Fitted top, wrapper skirt'),
    ('Two-Piece (Women)', 'Female', 'Matching top and trousers'),
    ('Gathers Dress', 'Female', 'Flared gathered dress')
),

-- Aggregate orders per style, capturing last used timestamp and accounts
orders_by_style AS (
  SELECT
    COALESCE(NULLIF(TRIM(o.style_name), ''), '(Unassigned Style)') AS resolved_style,
    LOWER(TRIM(COALESCE(NULLIF(o.style_name, ''), ''))) AS lower_style,
    COUNT(*) AS total_orders,
    COUNT(DISTINCT o.shop_id) AS distinct_shops,
    string_agg(DISTINCT s.name, ', ') AS accounts_using_style,
    MIN(o.created_at) AS first_used_at,
    MAX(o.created_at) AS last_used_at
  FROM public.orders o
  LEFT JOIN public.shops s ON s.id = o.shop_id
  GROUP BY 1, 2
),

preset_report AS (
  SELECT
    sp.name AS style_name,
    ('Preset (' || sp.gender || ')') AS category,
    sp.subtitle,
    CASE 
      WHEN obs.total_orders IS NULL OR obs.total_orders = 0 THEN 'Dead (0 Data)'
      WHEN DATE_PART('day', NOW() - obs.last_used_at) <= 30 THEN 'Active (<30d)'
      WHEN DATE_PART('day', NOW() - obs.last_used_at) <= 60 THEN 'Warm (30-60d)'
      ELSE 'Dormant (>60d)'
    END AS recency_tier,
    COALESCE(obs.total_orders, 0) AS total_orders,
    COALESCE(obs.distinct_shops, 0) AS distinct_shops,
    COALESCE(obs.accounts_using_style, 'None') AS accounts_using_style,
    DATE_PART('day', NOW() - obs.last_used_at)::int AS days_since_last_used,
    obs.first_used_at,
    obs.last_used_at
  FROM standard_presets sp
  LEFT JOIN orders_by_style obs
    ON LOWER(TRIM(sp.name)) = obs.lower_style
),

custom_report AS (
  SELECT
    obs.resolved_style AS style_name,
    CASE 
      WHEN obs.resolved_style = '(Unassigned Style)' THEN 'Unassigned'
      ELSE 'Custom Tailor Style'
    END AS category,
    'Custom style entered by shop' AS subtitle,
    CASE 
      WHEN DATE_PART('day', NOW() - obs.last_used_at) <= 30 THEN 'Active (<30d)'
      WHEN DATE_PART('day', NOW() - obs.last_used_at) <= 60 THEN 'Warm (30-60d)'
      ELSE 'Dormant (>60d)'
    END AS recency_tier,
    obs.total_orders,
    obs.distinct_shops,
    obs.accounts_using_style,
    DATE_PART('day', NOW() - obs.last_used_at)::int AS days_since_last_used,
    obs.first_used_at,
    obs.last_used_at
  FROM orders_by_style obs
  LEFT JOIN standard_presets sp
    ON obs.lower_style = LOWER(TRIM(sp.name))
  WHERE sp.name IS NULL
)

-- ==============================================================================
-- QUERY 1: UNIFIED SUMMARY RANKED BY RECENCY
-- ==============================================================================
SELECT 
  style_name,
  category,
  recency_tier,
  COALESCE(days_since_last_used::text || ' days ago', 'Never') AS last_used_recency,
  TO_CHAR(last_used_at, 'YYYY-MM-DD HH24:MI:SS') AS exact_last_used_time,
  total_orders,
  distinct_shops,
  accounts_using_style,
  TO_CHAR(first_used_at, 'YYYY-MM-DD') AS first_used_date,
  subtitle
FROM (
  SELECT * FROM preset_report
  UNION ALL
  SELECT * FROM custom_report
) combined_styles
ORDER BY 
  CASE 
    WHEN recency_tier = 'Active (<30d)' THEN 1
    WHEN recency_tier = 'Warm (30-60d)' THEN 2
    WHEN recency_tier = 'Dormant (>60d)' THEN 3
    ELSE 4
  END,
  days_since_last_used ASC NULLS LAST,
  total_orders DESC;
