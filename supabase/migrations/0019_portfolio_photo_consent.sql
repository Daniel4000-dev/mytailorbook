-- ============================================================
-- Customer photo consent tracking
-- ============================================================
-- Portfolio photos are of real customers' garments (sometimes them),
-- published publicly on /studio/[shopId]. The shop is legally responsible
-- for having the customer's consent before that happens, but until now
-- there was no record of it in the app at all — pure trust.
--
-- Deliberately NOT gating public display on this flag: every existing shop
-- already has live portfolio photos with zero consent records, and hard-
-- gating would silently empty out their public page the moment this ships.
-- Instead this adds a trackable confirmation the Owner sets per photo (see
-- app/(app)/settings/portfolio), surfaced as a nudge in that curation
-- screen — a real record instead of nothing, without a breaking change.
-- ============================================================

alter table portfolio_photo_overrides add column consent_confirmed boolean not null default false;
alter table portfolio_photo_overrides add column consent_confirmed_at timestamptz;
