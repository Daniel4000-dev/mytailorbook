-- ============================================================
-- Audit log
-- ============================================================
-- Records who did what and when, for accountability if a dispute or NDPA
-- investigation ever arises — not customer-facing, Owner-only viewer.
-- diff is a small summary payload (e.g. { fromStatus, toStatus }), never a
-- full row dump of sensitive fields like measurements or images.
--
-- shop_id deliberately has NO foreign key to shops(id): a shop-deletion
-- event is exactly the kind of record that must survive the shop itself
-- being deleted, so this can never cascade away with it (and must not
-- reference-block shop deletion either, which "on delete restrict" would).
-- ============================================================

create table audit_log (
  id bigint generated always as identity primary key,
  shop_id uuid not null,
  actor_id uuid,
  actor_name text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_log_shop_created on audit_log (shop_id, created_at desc);

alter table audit_log enable row level security;

create policy "owner reads own shop audit log" on audit_log
  for select using (
    shop_id = current_shop_id()
    and exists (select 1 from profiles where id = auth.uid() and role = 'Owner')
  );
