-- ============================================================
-- 0065_staff_craft_role_and_payroll.sql
-- Adds craft_role, payroll_type, and payroll_amount to profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS craft_role TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS payroll_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payroll_amount NUMERIC DEFAULT 0;
