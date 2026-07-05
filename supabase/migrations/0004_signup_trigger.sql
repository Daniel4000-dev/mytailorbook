-- ============================================================
-- Auto-create shop + profile on Owner signup
-- ============================================================
-- Previously, signup created the auth account via the admin API (with
-- email_confirm: true) and then a separate server action inserted the
-- shop + profile rows. Now that Owner signup goes through Supabase's
-- normal supabase.auth.signUp() (so it sends a real confirmation email),
-- we need a different hook point: this trigger fires the moment a new
-- row appears in auth.users — regardless of whether the email has been
-- confirmed yet — so the shop and profile exist immediately, and the
-- person can log in and see their data as soon as they click the link.
--
-- Staff accounts (created by an Owner from Settings) don't carry
-- `shop_name` metadata, so this trigger skips them — that path still
-- goes through the admin-created, pre-confirmed flow in auth-actions.ts.
-- ============================================================

create or replace function handle_new_owner_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_shop_id uuid;
begin
  if new.raw_user_meta_data ? 'shop_name' then
    insert into shops (name, owner_id)
    values (new.raw_user_meta_data->>'shop_name', new.id)
    returning id into new_shop_id;

    insert into profiles (id, shop_id, name, role, email)
    values (new.id, new_shop_id, new.raw_user_meta_data->>'name', 'Owner', new.email);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_owner_signup();
