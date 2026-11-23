-- Platform-level admin allowlist — distinct from profiles.role, which is
-- tenant-scoped (OrgAdmin/BranchManager/Staff/Accountant mean nothing
-- across organizations). A row here grants access to the internal /admin
-- dashboard, which reads across every tenant using the service-role
-- client. RLS only allows a user to read their own membership row — just
-- enough for the admin layout's identity check, nothing more. Rows are
-- added via the service-role client (Supabase dashboard SQL editor or a
-- trusted server script) — never through the app itself, so there is no
-- insert/update/delete policy for authenticated users here.
create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

create policy "platform admins can read their own row"
  on platform_admins for select
  using (auth.uid() = user_id);
