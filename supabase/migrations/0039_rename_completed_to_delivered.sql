-- ============================================================
-- Rename order status 'Completed' -> 'Delivered'
-- ============================================================
-- Every UI label already read "Delivered" (lib/constants.ts's
-- STATUS_CONFIG has always had label: 'Delivered' for this stage) — this
-- migration just brings the underlying enum value in line with what
-- tailors and customers have been reading all along, plus fixes the
-- handful of spots that still literally rendered the word "Completed"
-- (order tracking pill, mobile stage banner, fabric detail cards).
--
-- Touches, in order: the two CHECK constraints (orders.status,
-- order_comments.stage), existing row data (including the 'to'/'from'
-- fields buried inside orders.status_history JSON, and any tailor-
-- customized shops.stage_message_templates key), and the
-- get_branch_stats() SQL function from 0021_scale_phase3.sql.
-- ============================================================

-- Constraints must come off before the data moves — the original
-- constraint (0001_init.sql) allows 'Completed' but not 'Delivered' yet,
-- so renaming existing rows first would violate it, and adding the new,
-- stricter constraint first would reject every row still on 'Completed'.
-- Drop, migrate data, then re-add.
alter table orders drop constraint if exists orders_status_check;
alter table order_comments drop constraint if exists order_comments_stage_check;

update orders set status = 'Delivered' where status = 'Completed';
update order_comments set stage = 'Delivered' where stage = 'Completed';

alter table orders add constraint orders_status_check
  check (status in ('Documented', 'Cutting', 'Sewing', 'Ready', 'Delivered'));

alter table order_comments add constraint order_comments_stage_check
  check (stage in ('Documented', 'Cutting', 'Sewing', 'Ready', 'Delivered'));

-- status_history is a jsonb array of {from, to, at} objects — a plain
-- text replace of the quoted string is safe here since 'Completed' only
-- ever appears in this column as a status value, never as free text.
update orders
set status_history = replace(status_history::text, '"Completed"', '"Delivered"')::jsonb
where status_history::text like '%"Completed"%';

-- Sparse per-shop message-template overrides (0014_settings_expansion.sql)
-- — rename the JSON key itself for any shop that customized the
-- Completed-stage message, so it still applies to the renamed stage.
update shops
set stage_message_templates = stage_message_templates - 'Completed'
  || jsonb_build_object('Delivered', stage_message_templates->'Completed')
where stage_message_templates ? 'Completed';

create or replace function get_branch_stats(p_shop_id uuid)
returns table (
  collected numeric,
  projected numeric,
  overdue_count bigint,
  due_today_count bigint
)
language sql
security definer
stable
as $$
  select
    coalesce(sum(deposit_paid), 0) as collected,
    coalesce(sum(total_bill - deposit_paid) filter (where status != 'Delivered'), 0) as projected,
    count(*) filter (
      where status != 'Delivered'
      and (
        (due_date is not null and due_date < now())
        or priority in ('rush', 'urgent')
      )
    ) as overdue_count,
    count(*) filter (
      where status != 'Delivered'
      and due_date is not null
      and due_date::date = current_date
    ) as due_today_count
  from orders
  where shop_id = p_shop_id
$$;
