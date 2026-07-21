-- ============================================================
-- Preferred styles on customers
-- ============================================================
-- Set during the new-client wizard as tappable chips (Agbada, Senator,
-- Kaftan, …): a lightweight CRM signal of what this client usually
-- commissions. Stored as a plain text array — free-form "Other" entries
-- are allowed, so no CHECK constraint on values.
-- ============================================================

alter table customers add column preferred_styles text[] not null default '{}';
