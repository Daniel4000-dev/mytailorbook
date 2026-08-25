-- Seed the initial four affiliate codes. Names are left as the code
-- itself (uppercased) — rename from /admin/affiliates once real names
-- are known, no need to re-migrate for that.
insert into affiliates (name, code) values
  ('HA', 'ha'),
  ('CI', 'ci'),
  ('VI', 'vi'),
  ('DA', 'da');
