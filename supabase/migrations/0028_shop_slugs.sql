-- ============================================================
-- Public portfolio slugs
-- ============================================================
-- The public portfolio link (/studio/[shopId]) used the shop's raw UUID
-- in the URL — fine internally, but ugly and unmemorable for the one
-- link tailors are actually meant to share as their storefront. This adds
-- a human-readable `slug` (derived from the shop name, collision-safe)
-- and resolves the public route by slug instead. The UUID `id` stays the
-- real primary key everywhere else — nothing about tenancy/RLS changes.
--
-- Slugs are assigned once, at creation, and never regenerated on rename —
-- a shared link should keep working even if the shop is renamed later.
-- ============================================================

alter table shops add column if not exists slug text;

-- Lowercase, non-alnum runs collapsed to a single hyphen, trimmed.
-- Empty/all-symbol names (e.g. an emoji-only shop name) fall back to 'shop'.
create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'shop'
  );
$$;

-- Appends -2, -3, ... until unique among existing shops (excluding the
-- row being assigned one, so re-running this on an already-slugged shop
-- is a no-op rather than always appending a new suffix).
create or replace function generate_unique_shop_slug(base_name text, for_shop_id uuid)
returns text
language plpgsql
as $$
declare
  base text := slugify(base_name);
  candidate text := base;
  suffix int := 1;
begin
  while exists (
    select 1 from shops where slug = candidate and id <> for_shop_id
  ) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;
  return candidate;
end;
$$;

-- Backfill existing shops, oldest first so earlier shops keep the plain
-- slug and later name collisions get the numbered suffix.
do $$
declare
  r record;
begin
  for r in select id, name from shops where slug is null order by created_at asc loop
    update shops set slug = generate_unique_shop_slug(r.name, r.id) where id = r.id;
  end loop;
end $$;

alter table shops alter column slug set not null;
create unique index if not exists shops_slug_key on shops (slug);

-- Auto-assign a slug for every new shop going forward (signup trigger
-- inserts `shops (name, owner_id)` directly and doesn't set one).
create or replace function assign_shop_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null then
    new.slug := generate_unique_shop_slug(new.name, new.id);
  end if;
  return new;
end;
$$;

create trigger shops_assign_slug
  before insert on shops
  for each row execute function assign_shop_slug();
