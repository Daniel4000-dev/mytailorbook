-- ============================================================
-- 0070_subscription_pause_and_catalogue_retention.sql
-- Adds 1-to-3 month subscription pause and catalogue retention policy
-- ============================================================

-- 1. Add subscription pause and photo purge tracking columns to shops
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS subscription_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_pause_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_pause_months INT CHECK (subscription_pause_months BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS subscription_pause_reason TEXT,
  ADD COLUMN IF NOT EXISTS catalogue_photos_purge_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS catalogue_photos_purged_at TIMESTAMPTZ;

-- 2. Update status constraint to include 'paused'
ALTER TABLE shops DROP CONSTRAINT IF EXISTS shops_subscription_status_check;
ALTER TABLE shops ADD CONSTRAINT shops_subscription_status_check
  CHECK (subscription_status IN ('free', 'trialing', 'active', 'past_due', 'canceled', 'paused'));

-- 3. Extend the billing-column-tampering guard to prevent direct client edits
CREATE OR REPLACE FUNCTION prevent_billing_column_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.subscription_status IS DISTINCT FROM OLD.subscription_status OR
    NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan OR
    NEW.paystack_customer_code IS DISTINCT FROM OLD.paystack_customer_code OR
    NEW.paystack_subscription_code IS DISTINCT FROM OLD.paystack_subscription_code OR
    NEW.current_period_end IS DISTINCT FROM OLD.current_period_end OR
    NEW.grace_expires_at IS DISTINCT FROM OLD.grace_expires_at OR
    NEW.last_billing_reminder_sent_at IS DISTINCT FROM OLD.last_billing_reminder_sent_at OR
    NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at OR
    NEW.trial_used_at IS DISTINCT FROM OLD.trial_used_at OR
    NEW.paystack_authorization_code IS DISTINCT FROM OLD.paystack_authorization_code OR
    NEW.trial_plan_code IS DISTINCT FROM OLD.trial_plan_code OR
    NEW.subscription_paused_at IS DISTINCT FROM OLD.subscription_paused_at OR
    NEW.subscription_pause_ends_at IS DISTINCT FROM OLD.subscription_pause_ends_at OR
    NEW.subscription_pause_months IS DISTINCT FROM OLD.subscription_pause_months OR
    NEW.subscription_pause_reason IS DISTINCT FROM OLD.subscription_pause_reason OR
    NEW.catalogue_photos_purge_warning_sent_at IS DISTINCT FROM OLD.catalogue_photos_purge_warning_sent_at OR
    NEW.catalogue_photos_purged_at IS DISTINCT FROM OLD.catalogue_photos_purged_at
  ) THEN
    RAISE EXCEPTION 'Cannot modify billing, subscription, or pause status directly';
  END IF;
  RETURN NEW;
END;
$$;
