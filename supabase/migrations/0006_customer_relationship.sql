-- ============================================================
-- Customer relationship fields (Feature Section 1)
-- ============================================================
-- Two new optional fields on customers, both used purely for
-- relationship-building nudges — birthday messages and referral
-- tracking — nothing here is required to create a customer.
-- ============================================================

alter table customers
  add column date_of_birth date,
  add column referred_by uuid references customers(id) on delete set null;
