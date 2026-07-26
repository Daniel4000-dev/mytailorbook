-- ============================================================
-- Style persistence + cost/margin tracking
-- ============================================================
-- style_name: the wizard already picks a style per garment from the
-- built-in/custom styles catalog (to look up the right measurement spec),
-- but until now that value was discarded after intake, folded only into
-- the free-text order_details. Persisting it lets a future "suggested
-- pricing for this style" feature aggregate real cost data by style.
--
-- material_supplied_by / material_cost / other_costs: nothing today lets
-- a tailor see whether an order was actually profitable — total_bill and
-- deposit_paid only describe cash flow, not cost. These three fields are
-- entirely optional (all default to "no cost recorded"), letting a shop
-- compute a margin (total_bill - material_cost - other_costs) without
-- touching the existing deposit/balance behavior at all. When the
-- customer supplies their own fabric, material cost is naturally zero.
-- ============================================================

alter table orders add column style_name text;

alter table orders add column material_supplied_by text not null default 'shop'
  check (material_supplied_by in ('shop', 'customer'));
alter table orders add column material_cost numeric not null default 0;
alter table orders add column other_costs numeric not null default 0;
