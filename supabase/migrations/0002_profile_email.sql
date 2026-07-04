-- ============================================================
-- Add email to profiles
-- ============================================================
-- Email lives in Supabase's built-in auth.users table, which the regular
-- app can't query directly (it's a protected schema, not exposed via the
-- API). Since the Settings/staff-directory UI needs to display each
-- staff member's email, we store a copy of it on their profile at
-- creation time. It rarely changes, so this small denormalization is
-- simpler and safer than giving the app read access to auth.users.
-- ============================================================

alter table profiles add column email text;
