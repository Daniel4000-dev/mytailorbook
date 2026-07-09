'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Order, Customer, Shop, PortfolioPhoto } from '@/lib/types';

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
    items: row.items && row.items.length > 0 ? row.items : undefined,
    totalBill: row.total_bill,
    depositPaid: row.deposit_paid,
    status: row.status,
    assignedTo: row.assigned_to || undefined,
    assignedToName: row.assigned_to_name || undefined,
    dueDate: row.due_date || undefined,
    priority: row.priority,
    images: row.images || [],
    rating: row.rating ?? undefined,
    ratingSubmittedAt: row.rating_submitted_at || undefined,
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
        tagline: shopRow.tagline || undefined,
        bio: shopRow.bio || undefined,
        ownerUid: shopRow.owner_id,
        createdAt: shopRow.created_at,
      }
    : null;

  return { order, customer, shop };
}

/**
 * Fetches everything the public portfolio page (/studio/[shopId]) needs:
 * the shop's profile, its featured photos, and an aggregate rating computed
 * on the fly from completed orders. No auth, single-shop lookup only —
 * same admin-bypass pattern as getPublicOrderView.
 */
export async function getPublicPortfolioView(shopId: string): Promise<{
  shop: Shop;
  photos: PortfolioPhoto[];
  ratingAverage: number | null;
  ratingCount: number;
} | null> {
  const admin = createAdminClient();

  const { data: shopRow, error } = await admin.from('shops').select('*').eq('id', shopId).single();
  if (error || !shopRow) return null;

  const shop: Shop = {
    id: shopRow.id,
    name: shopRow.name,
    phone: shopRow.phone || undefined,
    address: shopRow.address || undefined,
    tagline: shopRow.tagline || undefined,
    bio: shopRow.bio || undefined,
    ownerUid: shopRow.owner_id,
    createdAt: shopRow.created_at,
  };

  const [{ data: photoRows }, { data: ratingRows }] = await Promise.all([
    admin.from('portfolio_photos').select('*').eq('shop_id', shopId).order('sort_order', { ascending: true }),
    admin.from('orders').select('rating').eq('shop_id', shopId).not('rating', 'is', null),
  ]);

  const photos: PortfolioPhoto[] = (photoRows || []).map((row) => ({
    id: row.id,
    shopId: row.shop_id,
    url: row.url,
    caption: row.caption || undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }));

  const ratings = (ratingRows || []).map((r) => r.rating as number);
  const ratingCount = ratings.length;
  const ratingAverage = ratingCount > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratingCount : null;

  return { shop, photos, ratingAverage, ratingCount };
}

/**
 * Records a customer's post-delivery star rating from the public tracking
 * page. No auth — anyone with the tracking link can call this, so it's
 * deliberately narrow: only accepts 1-5, only applies to a Completed order,
 * and only once (a rating can never be overwritten once set). This keeps
 * it a trust signal rather than something a link-holder could spam or flip.
 */
export async function submitOrderRating(orderId: string, rating: number): Promise<{ success: boolean; error?: string }> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: 'Invalid rating.' };
  }

  const admin = createAdminClient();

  const { data: row, error: fetchError } = await admin
    .from('orders')
    .select('status, rating')
    .eq('id', orderId)
    .single();

  if (fetchError || !row) return { success: false, error: 'Order not found.' };
  if (row.status !== 'Completed') return { success: false, error: 'Order is not yet completed.' };
  if (row.rating != null) return { success: false, error: 'This order has already been rated.' };

  const { error: updateError } = await admin
    .from('orders')
    .update({ rating, rating_submitted_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateError) return { success: false, error: updateError.message };
  return { success: true };
}
