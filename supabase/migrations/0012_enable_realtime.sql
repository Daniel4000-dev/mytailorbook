-- Required for Supabase Realtime to broadcast row changes on these tables.
-- Replaces the client's time-based background poll: instead of guessing
-- how often data might have changed, the app now gets pushed an event only
-- when a row in this shop's data actually changes (e.g. a second staff
-- member's device updating an order), and re-syncs on that real signal.
alter publication supabase_realtime add table orders, customers, profiles;
