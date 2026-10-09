-- ── UNIQUE CUSTOMER CONSTRAINT ───────────────────────────────────────────────
-- Prevents creating multiple customers with the exact same WhatsApp number
-- in the same shop.

-- NOTE: If this migration fails, it means you already have duplicate customers
-- in your database. You will need to manually resolve those duplicates (e.g. 
-- re-assigning their orders to a single customer record and deleting the extras)
-- before this constraint can be successfully applied.

alter table customers 
  add constraint unique_shop_whatsapp unique (shop_id, whatsapp_number);
