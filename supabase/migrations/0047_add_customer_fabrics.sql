alter table public.customers add column if not exists fabrics jsonb default '[]'::jsonb;
