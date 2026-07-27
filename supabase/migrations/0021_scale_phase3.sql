-- ============================================================
-- Phase 3: paginated/aggregate data loading — indexing + stats function
-- ============================================================
-- customers.org_id became the shop-list's real query key once Phase 2
-- made customers org-shared, but no index existed for it — every
-- customer-list load was a sequential scan on that column.
create index idx_customers_org_created on customers (org_id, created_at desc);

-- get_branch_stats: computes the dashboard's Collected/Projected/Overdue/
-- Due Today figures via a single aggregate query instead of requiring the
-- full order list client-side. Mirrors the exact logic already fixed this
-- session in app/(app)/dashboard/page.tsx — Documented-status orders are
-- NOT excluded from overdue/due-today (only Completed orders are), and
-- urgent counts both isOverdue() and priority in ('rush','urgent').
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
    coalesce(sum(total_bill - deposit_paid) filter (where status != 'Completed'), 0) as projected,
    count(*) filter (
      where status != 'Completed'
      and (
        (due_date is not null and due_date < now())
        or priority in ('rush', 'urgent')
      )
    ) as overdue_count,
    count(*) filter (
      where status != 'Completed'
      and due_date is not null
      and due_date::date = current_date
    ) as due_today_count
  from orders
  where shop_id = p_shop_id
$$;
