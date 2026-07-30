'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestIp, checkRateLimit } from '@/lib/rateLimit';
import { sendPushToShop } from '@/lib/push';
import type { Order, Customer, Shop, OrderComment } from '@/lib/types';
import { canSendReminder } from '@/lib/types';

// A real customer refreshing their own tracking page a few times is
// normal; a scraper hitting many different order/shop IDs from one IP in
// a burst is what this guards against.
const READ_LIMIT = { limit: 20, windowSeconds: 60 };
const WRITE_LIMIT = { limit: 5, windowSeconds: 3600 };

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
  const ip = await getRequestIp();
  const { allowed } = await checkRateLimit(`track:${ip}`, READ_LIMIT);
  if (!allowed) return null;

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
    inspirationImages: row.inspiration_images || [],
    statusHistory: row.status_history || [],
    payments: row.payments || [],
    lastReminderAt: row.last_reminder_at || undefined,
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
        orgId: shopRow.org_id,
        isPrimary: shopRow.is_primary,
        logoUrl: shopRow.logo_url || undefined,
        portfolioTemplate: shopRow.portfolio_template || 'modern',
        portfolioAccent: shopRow.portfolio_accent || 'indigo',
        portfolioSettings: shopRow.portfolio_settings || {},
        // Billing state is deliberately never surfaced on this
        // customer-facing tracking page — 'free' is a safe, inert default
        // to satisfy the type, not a real read of the shop's own status.
        subscriptionStatus: 'free',
      }
    : null;

  return { order, customer, shop };
}

/** Comments a customer has left on their order, for display on the public
 *  tracking page (read-back of what they've written so far). */
export async function getPublicOrderComments(orderId: string): Promise<OrderComment[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('order_comments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    message: row.message,
    stage: row.stage,
    createdAt: row.created_at,
  }));
}

/**
 * Records a customer's comment from the public tracking page, tagged with
 * whatever stage the order is in right now — no auth, so deliberately
 * narrow: requires a non-empty, length-capped message and a real order.
 * One-directional (the tailor reads it in the Order Detail Sheet; any
 * reply happens over WhatsApp, same as everywhere else in this app).
 */
export async function submitOrderComment(orderId: string, message: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = message.trim();
  if (!trimmed) return { success: false, error: 'Comment cannot be empty.' };
  if (trimmed.length > 1000) return { success: false, error: 'Comment is too long.' };

  const ip = await getRequestIp();
  const { allowed } = await checkRateLimit(`comment:${ip}`, WRITE_LIMIT);
  if (!allowed) return { success: false, error: 'Too many requests — please try again in a few minutes.' };

  const admin = createAdminClient();

  const { data: order, error: fetchError } = await admin.from('orders').select('id, shop_id, status, customer_name').eq('id', orderId).single();
  if (fetchError || !order) return { success: false, error: 'Order not found.' };

  const { error: insertError } = await admin.from('order_comments').insert({
    order_id: orderId,
    shop_id: order.shop_id,
    message: trimmed,
    stage: order.status,
  });

  if (insertError) return { success: false, error: insertError.message };

  // Bump the unread marker so the shop's board/dashboard can surface
  // "new comment" without querying the comments table per order.
  await admin.from('orders').update({ last_comment_at: new Date().toISOString() }).eq('id', orderId);

  sendPushToShop(order.shop_id, null, {
    title: `${order.customer_name} left a comment`,
    body: trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed,
    orderId,
  }).catch(() => {});

  return { success: true };
}

/**
 * Records a customer clicking "Send a reminder" on the public tracking
 * page — no auth, so the once-per-calendar-day rate limit is enforced
 * here server-side (client-side disabling is just for immediate UX
 * feedback, not the real guard) rather than trusting the caller.
 */
export async function submitOrderReminder(orderId: string): Promise<{ success: boolean; error?: string; lastReminderAt?: string }> {
  const ip = await getRequestIp();
  const { allowed } = await checkRateLimit(`reminder:${ip}`, WRITE_LIMIT);
  if (!allowed) return { success: false, error: 'Too many requests — please try again in a few minutes.' };

  const admin = createAdminClient();

  const { data: order, error: fetchError } = await admin.from('orders').select('id, shop_id, status, customer_name, last_reminder_at').eq('id', orderId).single();
  if (fetchError || !order) return { success: false, error: 'Order not found.' };

  if (!canSendReminder({ lastReminderAt: order.last_reminder_at || undefined })) {
    return { success: false, error: 'You can send another reminder tomorrow.' };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin.from('orders').update({ last_reminder_at: now }).eq('id', orderId);
  if (updateError) return { success: false, error: updateError.message };

  sendPushToShop(order.shop_id, null, {
    title: `${order.customer_name} sent a reminder about their order`,
    body: `Status: ${order.status}`,
    orderId,
  }).catch(() => {});

  return { success: true, lastReminderAt: now };
}

/** Whether this order already has a rating — the tracking page uses this to
 *  decide between showing the "leave a review" prompt or a thank-you state,
 *  since the table's unique constraint means only one is ever possible. */
export async function hasOrderRatingAction(orderId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('order_ratings')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId);
  return (count || 0) > 0;
}

/**
 * Records a customer's star rating (+ optional comment) from the public
 * tracking page, once their order is Completed — no auth, so deliberately
 * narrow: one rating per order (enforced by the table's unique constraint,
 * not just this check), and it lands unapproved until the Owner reviews it
 * in Settings → Manage Portfolio. Never shown publicly until approved.
 */
export async function submitOrderRatingAction(
  orderId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5 stars.' };
  }
  const trimmedComment = comment?.trim();
  if (trimmedComment && trimmedComment.length > 500) {
    return { success: false, error: 'Comment is too long.' };
  }

  const ip = await getRequestIp();
  const { allowed } = await checkRateLimit(`rating:${ip}`, WRITE_LIMIT);
  if (!allowed) return { success: false, error: 'Too many requests — please try again in a few minutes.' };

  const admin = createAdminClient();

  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, shop_id, status, customer_name')
    .eq('id', orderId)
    .single();
  if (fetchError || !order) return { success: false, error: 'Order not found.' };
  if (order.status !== 'Completed') {
    return { success: false, error: 'You can leave a review once your order is complete.' };
  }

  const { error: insertError } = await admin.from('order_ratings').insert({
    order_id: orderId,
    shop_id: order.shop_id,
    customer_name: order.customer_name,
    rating,
    comment: trimmedComment || null,
  });
  if (insertError) {
    if (insertError.code === '23505') return { success: false, error: 'You already left a review for this order.' };
    return { success: false, error: insertError.message };
  }

  sendPushToShop(order.shop_id, null, {
    title: `${order.customer_name} left a ${rating}-star review`,
    body: trimmedComment ? (trimmedComment.length > 80 ? trimmedComment.slice(0, 80) + '…' : trimmedComment) : 'Awaiting your approval to go public.',
    orderId,
  }).catch(() => {});

  return { success: true };
}

/** The other garments dropped off in the same visit, so a customer holding
 *  any one tracking link can reach all of their items — without this, batch
 *  grouping exists only on the tailor's side and a 3-garment drop-off means
 *  juggling 3 unrelated links. Minimal fields only: no financials exposed. */
export async function getPublicBatchSiblings(orderId: string): Promise<
  { id: string; orderDetails: string; status: Order['status'] }[]
> {
  const admin = createAdminClient();

  const { data: order } = await admin.from('orders').select('batch_id').eq('id', orderId).single();
  if (!order?.batch_id) return [];

  const { data: siblings } = await admin
    .from('orders')
    .select('id, order_details, status')
    .eq('batch_id', order.batch_id)
    .neq('id', orderId)
    .order('created_at', { ascending: true });

  return (siblings || []).map((row) => ({
    id: row.id,
    orderDetails: row.order_details,
    status: row.status,
  }));
}

/* ── Public shop portfolio ─────────────────────────────────────
   The tailor's shareable "website": shop identity + finished-work
   gallery + computed proof stats. Customer-identifying fields and
   financials are deliberately never exposed here. */

export interface PortfolioPhoto {
  url: string;
  /** Garment description the photo belongs to (safe: no customer info) */
  garment: string;
  /** ISO date the photo was taken */
  takenAt: string;
  /** Owner-entered story/caption for this specific photo. */
  caption?: string;
}

export interface PortfolioTestimonial {
  customerName: string;
  rating: number;
  comment?: string;
  submittedAt: string;
}

export interface PublicPortfolio {
  shop: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    logoUrl?: string;
    portfolioTemplate: 'modern' | 'editorial' | 'heritage';
    portfolioAccent: string;
    tagline?: string;
    bio?: string;
    foundedYear?: number;
  };
  photos: PortfolioPhoto[];
  stats: {
    completed: number;
    onTimePercent: number | null; // null until enough data
    stylesCount: number;
  };
  testimonials: PortfolioTestimonial[];
}

export async function getPublicShopPortfolio(shopId: string): Promise<PublicPortfolio | null> {
  const ip = await getRequestIp();
  const { allowed } = await checkRateLimit(`portfolio:${ip}`, READ_LIMIT);
  if (!allowed) return null;

  const admin = createAdminClient();

  const { data: shopRow, error: shopErr } = await admin
    .from('shops')
    .select('id, name, phone, address, logo_url, portfolio_template, portfolio_accent, portfolio_settings')
    .eq('id', shopId)
    .single();
  if (shopErr || !shopRow) return null;

  const { data: orderRows } = await admin
    .from('orders')
    .select('order_details, status, due_date, images, status_history, created_at')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(300);

  const orders = orderRows || [];

  const { data: overrideRows } = await admin
    .from('portfolio_photo_overrides')
    .select('photo_url, hidden, featured, caption')
    .eq('shop_id', shopId);
  const overrides = new Map((overrideRows || []).map((r) => [r.photo_url, r]));

  // Gallery: featured photos first, then finished-stage (Ready/Completed —
  // the actual showcase), padded with the freshest in-progress shots if
  // sparse. Anything explicitly hidden by the Owner never appears here.
  const featured: PortfolioPhoto[] = [];
  const finished: PortfolioPhoto[] = [];
  const inProgress: PortfolioPhoto[] = [];
  for (const o of orders) {
    for (const p of (o.images || []) as { url: string; stage: string; uploadedAt: string }[]) {
      const override = overrides.get(p.url);
      if (override?.hidden) continue;
      const entry: PortfolioPhoto = {
        url: p.url,
        garment: o.order_details,
        takenAt: p.uploadedAt,
        caption: override?.caption || undefined,
      };
      if (override?.featured) featured.push(entry);
      else if (p.stage === 'Ready' || p.stage === 'Completed') finished.push(entry);
      else inProgress.push(entry);
    }
  }
  const photos = [...featured, ...finished, ...inProgress].slice(0, 30);

  const { data: ratingRows } = await admin
    .from('order_ratings')
    .select('customer_name, rating, comment, submitted_at, featured')
    .eq('shop_id', shopId)
    .eq('approved', true)
    .order('featured', { ascending: false })
    .order('submitted_at', { ascending: false })
    .limit(20);
  const testimonials: PortfolioTestimonial[] = (ratingRows || []).map((r) => ({
    customerName: r.customer_name,
    rating: r.rating,
    comment: r.comment || undefined,
    submittedAt: r.submitted_at,
  }));

  const completedOrders = orders.filter((o) => o.status === 'Completed');
  const withDue = completedOrders.filter((o) => o.due_date);
  const onTime = withDue.filter((o) => {
    const history = (o.status_history || []) as { to: string; timestamp: string }[];
    const done = history.filter((h) => h.to === 'Completed').pop();
    if (!done) return true;
    const doneDay = new Date(done.timestamp);
    const dueDay = new Date(o.due_date);
    doneDay.setHours(0, 0, 0, 0);
    dueDay.setHours(23, 59, 59, 999);
    return doneDay.getTime() <= dueDay.getTime();
  });

  const styleSet = new Set<string>();
  for (const o of orders) {
    const text = (o.order_details || '').toLowerCase();
    for (const style of ['agbada', 'kaftan', 'senator', 'ankara', 'gown', 'buba', 'suit']) {
      if (text.includes(style)) styleSet.add(style);
    }
  }

  const settings = (shopRow.portfolio_settings || {}) as { tagline?: string; bio?: string; foundedYear?: number };

  return {
    shop: {
      id: shopRow.id,
      name: shopRow.name,
      phone: shopRow.phone || undefined,
      address: shopRow.address || undefined,
      logoUrl: shopRow.logo_url || undefined,
      portfolioTemplate: shopRow.portfolio_template || 'modern',
      portfolioAccent: shopRow.portfolio_accent || 'indigo',
      tagline: settings.tagline || undefined,
      bio: settings.bio || undefined,
      foundedYear: settings.foundedYear || undefined,
    },
    photos,
    stats: {
      completed: completedOrders.length,
      onTimePercent: withDue.length >= 3 ? Math.round((onTime.length / withDue.length) * 100) : null,
      stylesCount: styleSet.size,
    },
    testimonials,
  };
}
