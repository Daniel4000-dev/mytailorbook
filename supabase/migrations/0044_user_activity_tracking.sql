-- ============================================================
-- User Activity Tracking
-- ============================================================
-- Adds last_active_at to profiles for real-time presence/activity analytics
-- without relying solely on auth.users.last_sign_in_at (which only tracks logins).
-- ============================================================

alter table profiles add column last_active_at timestamptz;

-- Backfill with created_at for all users
update profiles set last_active_at = created_at;

-- Create an index to speed up activity-based analytics queries
create index idx_profiles_last_active on profiles(last_active_at desc);
