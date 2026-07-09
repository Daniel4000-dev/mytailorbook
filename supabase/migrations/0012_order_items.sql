-- ============================================================
-- Itemized multi-garment orders (Feature Section 4)
-- ============================================================
-- Orders today are one free-text description + one lump-sum price. Real
-- Nigerian tailoring orders very often bundle multiple garments in one
-- visit (agbada + trousers + cap, an aso-ebi set for several people) —
-- this lets an order optionally carry a structured line-item breakdown
-- (description + price per item) instead of squashing everything into
-- one string and one number.
--
-- Additive only: orderDetails/totalBill still work exactly as before for
-- existing orders and simple one-item orders. `items` is empty by default.
-- ============================================================

alter table orders
  add column items jsonb not null default '[]'::jsonb;
