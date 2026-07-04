'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Order, Customer, Shop } from '@/lib/types';

/**
 * Fetches a single order (+ its customer and shop) for the public,
 * unauthenticated tracking and receipt pages. These pages are intentionally
 * link-only (no login) — a visitor has no Supabase session, so Row Level
 * Security's "must belong to this shop" policies would block a normal
 * client entirely. The admin client bypasses RLS on purpose here, but it's
 * only ever used for an exact single-order lookup by ID — never a list or
 * search — which keeps the exposure limited to "if you have the link."
 */
export async function getPublicOrderView(orderId: string): Promise<{
  order: Order;
  customer: Customer | null;
  shop: Shop | null;
} | null> {
  const admin = createAdminClient();

  const { data: row, error } = await admin.from('orders').select('*').eq('id', orderId).single();
  if (error || !row) return null;

  const order: Order = {
    id: row.id,
    shopId: row.shop_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    orderDetails: row.order_details,
    totalBill: row.total_bill,
    depositPaid: row.deposit_paid,
    status: row.status,
    assignedTo: row.assigned_to || undefined,
    assignedToName: row.assigned_to_name || undefined,
    dueDate: row.due_date || undefined,
    priority: row.priority,
    images: row.images || [],
    statusHistory: row.status_history || [],
    payments: row.payments || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const [{ data: customerRow }, { data: shopRow }] = await Promise.all([
    admin.from('customers').select('*').eq('id', order.customerId).single(),
    admin.from('shops').select('*').eq('id', order.shopId).single(),
  ]);

  const customer: Customer | null = customerRow
    ? {
        id: customerRow.id,
        shopId: customerRow.shop_id,
        fullName: customerRow.full_name,
        whatsappNumber: customerRow.whatsapp_number,
        gender: customerRow.gender,
        measurements: customerRow.measurements || undefined,
        createdAt: customerRow.created_at,
      }
    : null;

  const shop: Shop | null = shopRow
    ? {
        id: shopRow.id,
        name: shopRow.name,
        phone: shopRow.phone || undefined,
        address: shopRow.address || undefined,
        ownerUid: shopRow.owner_id,
        createdAt: shopRow.created_at,
      }
    : null;

  return { order, customer, shop };
}
