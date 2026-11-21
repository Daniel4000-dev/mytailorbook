-- =====================================================================
-- MYSTITCHBOOK: DATABASE MIGRATION & SCHEMA AUDIT
-- Run this in the Supabase Dashboard SQL Editor for both Staging & Prod:
-- Staging:    https://supabase.com/dashboard/project/atmtzcimmdzfzkixiiyl/sql
-- Production: https://supabase.com/dashboard/project/dbbzgdklhxshgqhwrxoq/sql
-- =====================================================================

-- 1. Check Recorded CLI Migrations (if supabase_migrations exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations') THEN
    RAISE NOTICE 'supabase_migrations.schema_migrations table exists.';
  ELSE
    RAISE NOTICE 'supabase_migrations.schema_migrations not found (migrations were run via SQL Editor).';
  END IF;
END $$;

-- 2. Audit All Tables in public schema
SELECT 
  t.table_name,
  CASE 
    WHEN t.table_name IN (
      'shops', 'profiles', 'customers', 'orders', 'order_items', 'order_photos',
      'calendar_events', 'expenses', 'payments', 'finished_goods',
      'style_catalogues', 'style_catalogue_photos', 'atelier_notifications',
      'circle_members', 'circle_requests', 'inventory', 'order_materials',
      'push_subscriptions', 'payment_webhook_events'
    ) THEN 'Core / Feature Table'
    ELSE 'Auxiliary / Extension'
  END AS classification
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- 3. Targeted Column & Feature Audit for Migrations 0045 - 0072
WITH checks AS (
  SELECT '0047_customer_fabrics' AS migration, 'customers' AS target_table, 'fabrics' AS target_column UNION ALL
  SELECT '0048_streak_columns', 'shops', 'streak_current' UNION ALL
  SELECT '0050_calendar_events', 'calendar_events', 'event_type' UNION ALL
  SELECT '0052_calendar_status', 'calendar_events', 'status' UNION ALL
  SELECT '0052_streak_freezes', 'shops', 'streak_freezes' UNION ALL
  SELECT '0054_expenses', 'expenses', 'amount' UNION ALL
  SELECT '0055_payments', 'payments', 'method' UNION ALL
  SELECT '0057_rtw_finished_goods', 'finished_goods', 'product_name' UNION ALL
  SELECT '0060_work_days_vacation', 'shops', 'work_days' UNION ALL
  SELECT '0060_xp', 'shops', 'xp' UNION ALL
  SELECT '0061_daily_quests', 'shops', 'daily_quests' UNION ALL
  SELECT '0061_gems', 'shops', 'gems' UNION ALL
  SELECT '0062_referral_code', 'shops', 'referral_code' UNION ALL
  SELECT '0062_buddy_shop', 'shops', 'buddy_shop_id' UNION ALL
  SELECT '0063_monthly_revenue_target', 'shops', 'monthly_revenue_target' UNION ALL
  SELECT '0064_style_catalogues', 'style_catalogues', 'title' UNION ALL
  SELECT '0065_staff_craft_role', 'profiles', 'craft_role' UNION ALL
  SELECT '0065_payroll_amount', 'profiles', 'payroll_amount' UNION ALL
  SELECT '0066_atelier_notifications', 'atelier_notifications', 'category' UNION ALL
  SELECT '0067_order_slug', 'orders', 'slug' UNION ALL
  SELECT '0067_customer_slug', 'customers', 'slug' UNION ALL
  SELECT '0068_circle_members', 'circle_members', 'buddy_shop_id' UNION ALL
  SELECT '0069_order_metadata_jsonb', 'orders', 'metadata' UNION ALL
  SELECT '0069_customer_metadata_jsonb', 'customers', 'metadata' UNION ALL
  SELECT '0070_subscription_pause', 'shops', 'subscription_paused_at' UNION ALL
  SELECT '0071_inventory', 'inventory', 'item_name' UNION ALL
  SELECT '0071_order_materials', 'order_materials', 'material_name' UNION ALL
  SELECT '0072_circle_requests', 'circle_requests', 'sender_shop_id' UNION ALL
  SELECT '0072_circle_discovery', 'shops', 'is_circle_discoverable'
)
SELECT 
  c.migration,
  c.target_table,
  c.target_column,
  CASE 
    WHEN col.column_name IS NOT NULL THEN 'APPLIED'
    ELSE 'MISSING'
  END AS status
FROM checks c
LEFT JOIN information_schema.columns col 
  ON col.table_schema = 'public' 
  AND col.table_name = c.target_table 
  AND col.column_name = c.target_column
ORDER BY c.migration;
