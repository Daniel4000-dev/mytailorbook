-- Phase 1 Safety Migration

-- 1. Add paystack_environment tracking
ALTER TABLE shops
  ADD COLUMN paystack_environment text CHECK (paystack_environment IN ('test', 'live'));

-- 2. Expand subscription statuses for safer transitions and failures
ALTER TABLE shops DROP CONSTRAINT shops_subscription_status_check;
ALTER TABLE shops ADD CONSTRAINT shops_subscription_status_check
  CHECK (subscription_status IN ('free', 'trialing', 'converting', 'conversion_failed', 'active', 'past_due', 'canceled'));

-- 3. Update the tampering guard to protect the new columns
CREATE OR REPLACE FUNCTION prevent_billing_column_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    new.subscription_status IS DISTINCT FROM old.subscription_status OR
    new.subscription_plan IS DISTINCT FROM old.subscription_plan OR
    new.paystack_customer_code IS DISTINCT FROM old.paystack_customer_code OR
    new.paystack_subscription_code IS DISTINCT FROM old.paystack_subscription_code OR
    new.current_period_end IS DISTINCT FROM old.current_period_end OR
    new.grace_expires_at IS DISTINCT FROM old.grace_expires_at OR
    new.last_billing_reminder_sent_at IS DISTINCT FROM old.last_billing_reminder_sent_at OR
    new.trial_ends_at IS DISTINCT FROM old.trial_ends_at OR
    new.trial_used_at IS DISTINCT FROM old.trial_used_at OR
    new.paystack_authorization_code IS DISTINCT FROM old.paystack_authorization_code OR
    new.trial_plan_code IS DISTINCT FROM old.trial_plan_code OR
    new.paystack_environment IS DISTINCT FROM old.paystack_environment
  ) THEN
    RAISE EXCEPTION 'Billing fields can only be changed by the payment system';
  END IF;

  RETURN new;
END;
$$;
