-- Shop-wide reusable custom garment styles (name + optional photo) —
-- a tailor's own one-off styles beyond the built-in catalog, remembered
-- across future orders once created, same as the built-in styles.
alter table shops add column custom_styles jsonb not null default '[]'::jsonb;
