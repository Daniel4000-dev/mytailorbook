'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rateLimit';
import { logAudit } from '@/lib/audit';
import { sendPushToShop } from '@/lib/push';
import type { Order, Customer, OrderStatus, Measurements, User, Shop, OrderComment, StylePhotoSubmission, OutreachLogEntry, PortfolioPhotoOverride, AuditLogEntry } from '@/lib/types';
import { isOwnerLikeRole } from '@/lib/types';

// ----------------------------------------------------------------------
// Row <-> App-type mappers
// ----------------------------------------------------------------------
// The database uses snake_case columns; the app's TypeScript types use
// camelCase. These functions are the single place that translates between
// the two, so the rest of the app never has to think about column names.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orderFromRow(row: any): Order {
  return {
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
    measurements: row.measurements || undefined,
    images: row.images || [],
    inspirationImages: row.inspiration_images || [],
    batchId: row.batch_id || undefined,
    lastCommentAt: row.last_comment_at || undefined,
    commentsSeenAt: row.comments_seen_at || undefined,
    statusHistory: row.status_history || [],
    payments: row.payments || [],
    styleName: row.style_name || undefined,
    materialSuppliedBy: row.material_supplied_by || 'shop',
    materialCost: row.material_cost || 0,
    otherCosts: row.other_costs || 0,
    lastReminderAt: row.last_reminder_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function orderToRow(shopId: string, o: Partial<Order>) {
  const row: Record<string, unknown> = {};
  if (shopId) row.shop_id = shopId;
  if (o.customerId !== undefined) row.customer_id = o.customerId;
  if (o.customerName !== undefined) row.customer_name = o.customerName;
  if (o.orderDetails !== undefined) row.order_details = o.orderDetails;
  if (o.totalBill !== undefined) row.total_bill = o.totalBill;
  if (o.depositPaid !== undefined) row.deposit_paid = o.depositPaid;
  if (o.status !== undefined) row.status = o.status;
  if (o.assignedTo !== undefined) row.assigned_to = o.assignedTo || null;
  if (o.assignedToName !== undefined) row.assigned_to_name = o.assignedToName || null;
  if (o.dueDate !== undefined) row.due_date = o.dueDate || null;
  if (o.priority !== undefined) row.priority = o.priority;
  if (o.measurements !== undefined) row.measurements = o.measurements;
  if (o.images !== undefined) row.images = o.images;
  if (o.inspirationImages !== undefined) row.inspiration_images = o.inspirationImages;
  if (o.batchId !== undefined) row.batch_id = o.batchId || null;
  if (o.commentsSeenAt !== undefined) row.comments_seen_at = o.commentsSeenAt || null;
  if (o.statusHistory !== undefined) row.status_history = o.statusHistory;
  if (o.payments !== undefined) row.payments = o.payments;
  if (o.styleName !== undefined) row.style_name = o.styleName || null;
  if (o.materialSuppliedBy !== undefined) row.material_supplied_by = o.materialSuppliedBy;
  if (o.materialCost !== undefined) row.material_cost = o.materialCost;
  if (o.otherCosts !== undefined) row.other_costs = o.otherCosts;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orderCommentFromRow(row: any): OrderComment {
  return {
    id: row.id,
    orderId: row.order_id,
    message: row.message,
    stage: row.stage,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function customerFromRow(row: any): Customer {
  return {
    id: row.id,
    shopId: row.shop_id,
    fullName: row.full_name,
    whatsappNumber: row.whatsapp_number,
    gender: row.gender,
    preferredStyles: row.preferred_styles || undefined,
    measurements: row.measurements || undefined,
    styleMeasurements: row.style_measurements && Object.keys(row.style_measurements).length > 0 ? row.style_measurements : undefined,
    address: row.address || undefined,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function userFromRow(row: any): User {
  return {
    uid: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    shopId: row.shop_id,
    orgId: row.org_id,
    active: row.active,
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shopFromRow(row: any): Shop {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    address: row.address || undefined,
    ownerUid: row.owner_id,
    createdAt: row.created_at,
    orgId: row.org_id,
    isPrimary: row.is_primary,
    customStyles: row.custom_styles || [],
    logoUrl: row.logo_url || undefined,
    outreachTemplate: row.outreach_template || undefined,
    stageMessageTemplates: row.stage_message_templates || {},
    portfolioTemplate: row.portfolio_template || 'modern',
    portfolioAccent: row.portfolio_accent || 'indigo',
    portfolioSettings: row.portfolio_settings || {},
    paystackCustomerCode: row.paystack_customer_code || undefined,
    paystackSubscriptionCode: row.paystack_subscription_code || undefined,
    subscriptionPlan: row.subscription_plan || undefined,
    subscriptionStatus: row.subscription_status || 'free',
  };
}

// ----------------------------------------------------------------------
// Reads
// ----------------------------------------------------------------------

/** `shopId` is the ACTIVE BRANCH (orders/staff stay branch-scoped);
 *  `orgId` scopes customers, which are shared across every branch in the
 *  organization. For every org today (exactly one branch), these two ids
 *  point at the same underlying shop row, so behavior is unchanged. */
export async function getShopBundle(shopId: string, orgId: string) {
  const supabase = await createClient();
  const [shopRes, customersRes, ordersRes, profilesRes] = await Promise.all([
    supabase.from('shops').select('*').eq('id', shopId).single(),
    supabase.from('customers').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('orders').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('shop_id', shopId),
  ]);

  return {
    shop: shopRes.data ? shopFromRow(shopRes.data) : null,
    customers: (customersRes.data || []).map(customerFromRow),
    orders: (ordersRes.data || []).map(orderFromRow),
    staffMembers: (profilesRes.data || []).map(userFromRow),
  };
}

/** Dashboard's Collected/Projected/Overdue/Due Today figures via a single
 *  SQL aggregate (get_branch_stats, migration 0021) instead of requiring
 *  the full order list client-side — mirrors the exact overdue/due-today
 *  logic already fixed this session (Documented-status orders are NOT
 *  excluded, only Completed ones are). */
export async function getBranchStats(shopId: string): Promise<{
  collected: number;
  projected: number;
  overdueCount: number;
  dueTodayCount: number;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_branch_stats', { p_shop_id: shopId }).single();
  if (error || !data) return null;
  const row = data as { collected: number; projected: number; overdue_count: number; due_today_count: number };
  return {
    collected: Number(row.collected) || 0,
    projected: Number(row.projected) || 0,
    overdueCount: Number(row.overdue_count) || 0,
    dueTodayCount: Number(row.due_today_count) || 0,
  };
}

/** Server-side paginated + searched customer list — keyset pagination on
 *  (created_at, id), search hits the database (ilike on name/phone)
 *  instead of filtering an in-memory array. New infrastructure, not yet
 *  wired into app/(app)/customers/page.tsx: that page's outreach feature
 *  ("reach out to N customers about this style") builds its send queue
 *  from the FULL filtered customer list, not one page at a time — wiring
 *  this in would silently make outreach only see the current page. Use
 *  this for a future customer-list redesign that also reworks outreach,
 *  or anywhere else that doesn't need the complete filtered set at once. */
export async function getCustomersPage({
  orgId,
  search,
  cursor,
  limit = 40,
}: {
  orgId: string;
  search?: string;
  cursor?: { createdAt: string; id: string };
  limit?: number;
}): Promise<{ customers: Customer[]; nextCursor: { createdAt: string; id: string } | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (search) {
    const q = search.replace(/[%_]/g, '');
    query = query.or(`full_name.ilike.%${q}%,whatsapp_number.ilike.%${q}%`);
  }
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data || [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    customers: page.map(customerFromRow),
    nextCursor: hasMore && last ? { createdAt: last.created_at, id: last.id } : null,
  };
}

/** Every branch (shops row) under an organization — powers the branch
 *  switcher and the "Your Organization" settings list. */
export async function getOrgBranches(orgId: string): Promise<Shop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('org_id', orgId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(shopFromRow);
}

/** Owner-only: adds a new physical location under their existing
 *  organization — not the signup flow, no new auth user/profile. org_id
 *  is derived server-side from the caller's own session, never trusted
 *  from the client. */
export async function addBranchAction(
  name: string,
  phone?: string,
  address?: string
): Promise<{ shop?: Shop; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single();
  if (!profile || !isOwnerLikeRole(profile.role)) return { error: 'Only the Owner can add a branch' };

  // No RLS INSERT policy exists on `shops` (it's normally only ever
  // inserted via the security-definer signup trigger) — the admin client
  // is used here after the Owner/org check above, the same pattern as
  // other Owner-gated mutations in this file (e.g. deleteOwnShopAction).
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shops')
    .insert({ name, phone, address, owner_id: user.id, org_id: profile.org_id, is_primary: false })
    .select()
    .single();
  if (error) return { error: error.message };
  return { shop: shopFromRow(data) };
}

async function getOrders(shopId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(orderFromRow);
}

// Customers are org-shared (see migration 0020) — scoped by org_id, not
// any single branch's shop_id.
async function getCustomers(orgId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(customerFromRow);
}

export async function getStaff(shopId: string): Promise<User[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('shop_id', shopId);
  if (error) throw new Error(error.message);
  return (data || []).map(userFromRow);
}

// ----------------------------------------------------------------------
// Orders
// ----------------------------------------------------------------------

export async function addOrderAction(shopId: string, order: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) {
  const supabase = await createClient();
  const { error } = await supabase.from('orders').insert(orderToRow(shopId, order));
  if (error) throw new Error(error.message);
  return getOrders(shopId);
}

/**
 * Creates several orders in one intake session — e.g. a customer dropping
 * off multiple garments at once. Each garment becomes its own independent
 * order/kanban card (they move through production at different paces),
 * but all rows share a generated batchId so the UI can show "N items from
 * this visit" without merging their statuses together.
 */
export async function addOrderBatchAction(
  shopId: string,
  garments: Omit<Order, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'batchId'>[]
) {
  const supabase = await createClient();
  const batchId = garments.length > 1 ? crypto.randomUUID() : undefined;
  const rows = garments.map((garment) => orderToRow(shopId, { ...garment, batchId }));
  const { error } = await supabase.from('orders').insert(rows);
  if (error) throw new Error(error.message);
  return getOrders(shopId);
}

export async function updateOrderStatusAction(
  orderId: string,
  newStatus: OrderStatus,
  changedBy: string,
  changedByName: string,
  shopId: string
) {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('orders')
    .select('status, status_history, customer_name')
    .eq('id', orderId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const newHistory = [
    ...(current.status_history || []),
    { from: current.status, to: newStatus, changedBy, changedByName, timestamp: new Date().toISOString() },
  ];

  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus, status_history: newHistory, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);

  await logAudit({
    shopId,
    actorId: changedBy,
    actorName: changedByName,
    action: 'order.status_changed',
    entityType: 'order',
    entityId: orderId,
    diff: { fromStatus: current.status, toStatus: newStatus },
  });

  sendPushToShop(shopId, changedBy, {
    title: `${current.customer_name}'s order moved to ${newStatus}`,
    body: `By ${changedByName}`,
    orderId,
  }).catch(() => {});

  return getOrders(shopId);
}

export async function updateOrderAction(orderId: string, updates: Partial<Order>, shopId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('orders')
    .update({ ...orderToRow('', updates), updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);

  const { data: authData } = await supabase.auth.getUser();
  const actorId = authData?.user?.id ?? null;
  let actorName = 'Unknown';
  if (actorId) {
    const { data: actorProfile } = await supabase.from('profiles').select('name').eq('id', actorId).single();
    actorName = actorProfile?.name || actorName;
  }

  if (updates.payments) {
    const lastPayment = updates.payments[updates.payments.length - 1];
    await logAudit({
      shopId,
      actorId,
      actorName,
      action: 'payment.recorded',
      entityType: 'order',
      entityId: orderId,
      diff: lastPayment ? { amount: lastPayment.amount } : undefined,
    });
    if (lastPayment) {
      const { data: orderRow } = await supabase.from('orders').select('customer_name').eq('id', orderId).single();
      sendPushToShop(shopId, actorId, {
        title: `Payment recorded for ${orderRow?.customer_name ?? 'an order'}`,
        body: `₦${lastPayment.amount.toLocaleString()} — by ${actorName}`,
        orderId,
      }).catch(() => {});
    }
  } else {
    await logAudit({
      shopId,
      actorId,
      actorName,
      action: 'order.updated',
      entityType: 'order',
      entityId: orderId,
      diff: { fields: Object.keys(updates) },
    });
  }

  return getOrders(shopId);
}

/** Sibling orders created in the same multi-garment intake session. */
export async function getBatchOrdersAction(batchId: string, excludeOrderId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('batch_id', batchId)
    .neq('id', excludeOrderId);
  if (error) throw new Error(error.message);
  return (data || []).map(orderFromRow);
}

export async function getOrderCommentsAction(orderId: string): Promise<OrderComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('order_comments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(orderCommentFromRow);
}

// ----------------------------------------------------------------------
// Customers
// ----------------------------------------------------------------------

// shopId tags which branch this customer was created at (required by the
// "insert org customers" RLS policy); orgId is used to return the full
// org-wide customer list afterward, since customers are org-shared.
export async function addCustomerAction(
  shopId: string,
  orgId: string,
  customer: Omit<Customer, 'id' | 'shopId' | 'createdAt'>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .insert({
      shop_id: shopId,
      full_name: customer.fullName,
      whatsapp_number: customer.whatsappNumber,
      gender: customer.gender,
      preferred_styles: customer.preferredStyles || [],
      measurements: customer.measurements || null,
      address: customer.address || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const customers = await getCustomers(orgId);
  return { newCustomer: customerFromRow(data), customers };
}

export async function updateCustomerMeasurementsAction(customerId: string, measurements: Measurements, orgId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('customers').update({ measurements }).eq('id', customerId);
  if (error) throw new Error(error.message);
  return getCustomers(orgId);
}

export async function updateCustomerStyleProfileAction(
  customerId: string,
  styleName: string,
  measurements: Measurements,
  orgId: string
) {
  const supabase = await createClient();
  const { data: current, error: fetchError } = await supabase
    .from('customers')
    .select('style_measurements')
    .eq('id', customerId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const existing = (current?.style_measurements as Record<string, unknown>) || {};
  const updated = {
    ...existing,
    [styleName]: { measurements, updatedAt: new Date().toISOString() },
  };
  const { error } = await supabase.from('customers').update({ style_measurements: updated }).eq('id', customerId);
  if (error) throw new Error(error.message);
  return getCustomers(orgId);
}

export async function deleteCustomerStyleProfileAction(customerId: string, styleName: string, orgId: string) {
  const supabase = await createClient();
  const { data: current, error: fetchError } = await supabase
    .from('customers')
    .select('style_measurements')
    .eq('id', customerId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const existing = { ...((current?.style_measurements as Record<string, unknown>) || {}) };
  delete existing[styleName];
  const { error } = await supabase.from('customers').update({ style_measurements: existing }).eq('id', customerId);
  if (error) throw new Error(error.message);
  return getCustomers(orgId);
}

export async function updateCustomerProfileAction(
  customerId: string,
  updates: Partial<Pick<Customer, 'fullName' | 'whatsappNumber' | 'gender' | 'preferredStyles' | 'address'>>,
  orgId: string
) {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (updates.fullName !== undefined) row.full_name = updates.fullName;
  if (updates.whatsappNumber !== undefined) row.whatsapp_number = updates.whatsappNumber;
  if (updates.gender !== undefined) row.gender = updates.gender;
  if (updates.preferredStyles !== undefined) row.preferred_styles = updates.preferredStyles;
  if (updates.address !== undefined) row.address = updates.address || null;
  const { error } = await supabase.from('customers').update(row).eq('id', customerId);
  if (error) throw new Error(error.message);
  return getCustomers(orgId);
}

// ----------------------------------------------------------------------
// Staff / Shop
// ----------------------------------------------------------------------

export async function updateStaffAction(uid: string, updates: Partial<User>, shopId: string) {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.active !== undefined) row.active = updates.active;
  if (updates.avatarUrl !== undefined) row.avatar_url = updates.avatarUrl || null;
  const { error } = await supabase.from('profiles').update(row).eq('id', uid);
  if (error) throw new Error(error.message);
  return getStaff(shopId);
}

export async function updateShopAction(shopId: string, updates: Partial<Shop>) {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.address !== undefined) row.address = updates.address;
  if (updates.customStyles !== undefined) row.custom_styles = updates.customStyles;
  if (updates.logoUrl !== undefined) row.logo_url = updates.logoUrl;
  if (updates.outreachTemplate !== undefined) row.outreach_template = updates.outreachTemplate;
  if (updates.stageMessageTemplates !== undefined) row.stage_message_templates = updates.stageMessageTemplates;
  if (updates.portfolioTemplate !== undefined) row.portfolio_template = updates.portfolioTemplate;
  if (updates.portfolioAccent !== undefined) row.portfolio_accent = updates.portfolioAccent;
  if (updates.portfolioSettings !== undefined) row.portfolio_settings = updates.portfolioSettings;
  const { data, error } = await supabase.from('shops').update(row).eq('id', shopId).select().single();
  if (error) throw new Error(error.message);
  return shopFromRow(data);
}

/** Adds or updates one custom garment style by name (case-insensitive).
 *  Reads `custom_styles` fresh from the database immediately before
 *  writing — rather than trusting the caller's possibly-stale client-side
 *  `currentShop.customStyles` snapshot — so two near-simultaneous calls
 *  (e.g. creating a custom style, then immediately attaching a photo to
 *  it) can never each compute their own array and silently create a
 *  duplicate entry with the same name. */
export async function upsertCustomStyleAction(
  shopId: string,
  name: string,
  photoUrl?: string,
  measurementFields?: { id: string; label: string }[]
): Promise<Shop> {
  const supabase = await createClient();
  const { data: shopRow, error: fetchError } = await supabase
    .from('shops')
    .select('custom_styles')
    .eq('id', shopId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const existing: { name: string; photoUrl?: string; measurementFields?: { id: string; label: string }[] }[] =
    shopRow?.custom_styles || [];
  const idx = existing.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
  const next =
    idx === -1
      ? [...existing, { name, photoUrl, measurementFields }]
      : existing.map((s, i) =>
          i === idx
            ? { ...s, photoUrl: photoUrl ?? s.photoUrl, measurementFields: measurementFields ?? s.measurementFields }
            : s
        );

  const { data, error } = await supabase.from('shops').update({ custom_styles: next }).eq('id', shopId).select().single();
  if (error) throw new Error(error.message);
  return shopFromRow(data);
}

/** Renames a custom style everywhere it's referenced: the shop's own style
 *  list, AND every customer's `preferredStyles` that names it — otherwise a
 *  rename would silently orphan existing customer records (they'd keep the
 *  old name, which no longer matches anything in the picker or the Style
 *  Gallery/Customers filter). */
export async function renameCustomStyleEverywhereAction(
  shopId: string,
  oldName: string,
  newName: string
): Promise<Shop> {
  const supabase = await createClient();

  const { data: shopRow, error: shopFetchError } = await supabase
    .from('shops')
    .select('custom_styles')
    .eq('id', shopId)
    .single();
  if (shopFetchError) throw new Error(shopFetchError.message);

  const existing: { name: string; photoUrl?: string }[] = shopRow?.custom_styles || [];
  const nextStyles = existing.map((s) =>
    s.name.toLowerCase() === oldName.toLowerCase() ? { ...s, name: newName } : s
  );

  const { data: updatedShop, error: shopUpdateError } = await supabase
    .from('shops')
    .update({ custom_styles: nextStyles })
    .eq('id', shopId)
    .select()
    .single();
  if (shopUpdateError) throw new Error(shopUpdateError.message);

  const { data: affectedCustomers, error: customersError } = await supabase
    .from('customers')
    .select('id, preferred_styles')
    .eq('shop_id', shopId)
    .contains('preferred_styles', [oldName]);
  if (customersError) throw new Error(customersError.message);

  if (affectedCustomers && affectedCustomers.length > 0) {
    const updates = affectedCustomers.map((c) => ({
      id: c.id,
      preferred_styles: (c.preferred_styles as string[]).map((s) => (s === oldName ? newName : s)),
    }));
    const { error: cascadeError } = await supabase.from('customers').upsert(updates);
    if (cascadeError) throw new Error(cascadeError.message);
  }

  return shopFromRow(updatedShop);
}

/** Owner resets a staff member's password. Verifies the requester actually
 *  owns the shop that `staffUid` belongs to (never trust a client-supplied
 *  staff id alone) before using the admin client to do the actual reset —
 *  same bootstrap reasoning as staff creation. Generates a random temporary
 *  password when none is given. */
export async function resetStaffPasswordAction(
  staffUid: string,
  requestedBy: string,
  newPassword?: string
): Promise<{ password?: string; error?: string }> {
  const admin = createAdminClient();

  const { data: staffProfile } = await admin.from('profiles').select('shop_id, name').eq('id', staffUid).single();
  const { data: ownerProfile } = await admin.from('profiles').select('shop_id, role, name').eq('id', requestedBy).single();
  if (
    !staffProfile ||
    !ownerProfile ||
    !isOwnerLikeRole(ownerProfile.role) ||
    ownerProfile.shop_id !== staffProfile.shop_id
  ) {
    return { error: 'Not authorized to reset this password' };
  }

  const password = newPassword || Math.random().toString(36).slice(-10) + 'A1!';
  const { error } = await admin.auth.admin.updateUserById(staffUid, { password });
  if (error) return { error: error.message };

  await logAudit({
    shopId: ownerProfile.shop_id,
    actorId: requestedBy,
    actorName: ownerProfile.name,
    action: 'staff.password_reset',
    entityType: 'profile',
    entityId: staffUid,
    diff: { staffName: staffProfile.name },
  });

  return { password };
}

// ----------------------------------------------------------------------
// Portfolio photo curation
// ----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function portfolioPhotoOverrideFromRow(row: any): PortfolioPhotoOverride {
  return {
    id: row.id,
    shopId: row.shop_id,
    photoUrl: row.photo_url,
    hidden: row.hidden,
    featured: row.featured,
    consentConfirmed: row.consent_confirmed,
    consentConfirmedAt: row.consent_confirmed_at || undefined,
    caption: row.caption || undefined,
    createdAt: row.created_at,
  };
}

export async function getPortfolioPhotoOverridesAction(shopId: string): Promise<PortfolioPhotoOverride[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('portfolio_photo_overrides')
    .select('*')
    .eq('shop_id', shopId);
  if (error) throw new Error(error.message);
  return (data || []).map(portfolioPhotoOverrideFromRow);
}

export async function setPortfolioPhotoOverrideAction(
  shopId: string,
  photoUrl: string,
  updates: { hidden?: boolean; featured?: boolean; consentConfirmed?: boolean; caption?: string }
): Promise<void> {
  const supabase = await createClient();
  const row: Record<string, unknown> = { shop_id: shopId, photo_url: photoUrl };
  if (updates.hidden !== undefined) row.hidden = updates.hidden;
  if (updates.featured !== undefined) row.featured = updates.featured;
  if (updates.caption !== undefined) row.caption = updates.caption || null;
  if (updates.consentConfirmed !== undefined) {
    row.consent_confirmed = updates.consentConfirmed;
    row.consent_confirmed_at = updates.consentConfirmed ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from('portfolio_photo_overrides')
    .upsert(row, { onConflict: 'shop_id,photo_url' });
  if (error) throw new Error(error.message);

  if (updates.consentConfirmed) {
    const { data: authData } = await supabase.auth.getUser();
    const actorId = authData?.user?.id ?? null;
    let actorName = 'Unknown';
    if (actorId) {
      const { data: actorProfile } = await supabase.from('profiles').select('name').eq('id', actorId).single();
      actorName = actorProfile?.name || actorName;
    }
    await logAudit({
      shopId,
      actorId,
      actorName,
      action: 'portfolio_photo.consent_confirmed',
      entityType: 'portfolio_photo_override',
      entityId: null,
      diff: { photoUrl },
    });
  }
}

// ----------------------------------------------------------------------
// Style photo gallery — staff-sourced outreach photos, owner-curated
// ----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stylePhotoSubmissionFromRow(row: any): StylePhotoSubmission {
  return {
    id: row.id,
    shopId: row.shop_id,
    styleName: row.style_name,
    photoUrl: row.photo_url,
    storagePath: row.storage_path,
    status: row.status,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    savedBy: row.saved_by || undefined,
    createdAt: row.created_at,
    savedAt: row.saved_at || undefined,
  };
}

export async function createStylePhotoSubmissionAction(
  shopId: string,
  styleName: string,
  storagePath: string,
  photoUrl: string,
  uploadedBy: string,
  uploadedByName: string
): Promise<StylePhotoSubmission> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('style_photo_submissions')
    .insert({
      shop_id: shopId,
      style_name: styleName,
      storage_path: storagePath,
      photo_url: photoUrl,
      uploaded_by: uploadedBy,
      uploaded_by_name: uploadedByName,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return stylePhotoSubmissionFromRow(data);
}

/** Pending photos are visible shop-wide by RLS; saved photos only come
 *  back for the Owner (RLS hides them from Staff entirely) — so `saved`
 *  is naturally empty for a Staff caller without any app-level role check. */
export async function getStylePhotoSubmissionsAction(
  shopId: string,
  styleName: string
): Promise<{ pending: StylePhotoSubmission[]; saved: StylePhotoSubmission[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('style_photo_submissions')
    .select('*')
    .eq('shop_id', shopId)
    .eq('style_name', styleName)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const all = (data || []).map(stylePhotoSubmissionFromRow);
  return {
    pending: all.filter((s) => s.status === 'pending'),
    saved: all.filter((s) => s.status === 'saved'),
  };
}

/** Org-wide (not one style at a time) — every pending submission awaiting
 *  the Owner's approval, across every style and branch. Powers the
 *  "needs your approval" notification; org_id is derived server-side from
 *  the caller's own session, never trusted from the client. */
export async function getPendingStylePhotoSubmissions(): Promise<StylePhotoSubmission[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  if (!profile?.org_id) return [];

  const { data, error } = await supabase
    .from('style_photo_submissions')
    .select('*')
    .eq('org_id', profile.org_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(stylePhotoSubmissionFromRow);
}

/** One query for the whole Style Gallery index — how many pending photos
 *  are waiting per style, so the grid can badge them without a per-tile request. */
export async function getPendingStyleCountsAction(shopId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('style_photo_submissions')
    .select('style_name')
    .eq('shop_id', shopId)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  (data || []).forEach((row) => {
    counts[row.style_name] = (counts[row.style_name] || 0) + 1;
  });
  return counts;
}

export async function approveStylePhotoSubmissionAction(id: string, savedBy: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('style_photo_submissions')
    .update({ status: 'saved', saved_by: savedBy, saved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function discardStylePhotoSubmissionAction(id: string, storagePath: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('style_photo_submissions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await supabase.storage.from('style-photos').remove([storagePath]);
}

// ----------------------------------------------------------------------
// Outreach log
// ----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function outreachLogEntryFromRow(row: any): OutreachLogEntry {
  return {
    id: row.id,
    shopId: row.shop_id,
    customerId: row.customer_id,
    styleName: row.style_name,
    contactedBy: row.contacted_by,
    contactedAt: row.contacted_at,
  };
}

/** Latest contact per customer for this style — one query per filter
 *  selection, joined client-side against the already-loaded customer list. */
export async function getOutreachLogAction(shopId: string, styleName: string): Promise<OutreachLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_outreach_log')
    .select('*')
    .eq('shop_id', shopId)
    .eq('style_name', styleName)
    .order('contacted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(outreachLogEntryFromRow);
}

export async function logOutreachContactAction(
  shopId: string,
  customerId: string,
  styleName: string,
  contactedBy: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('customer_outreach_log').insert({
    shop_id: shopId,
    customer_id: customerId,
    style_name: styleName,
    contacted_by: contactedBy,
  });
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------
// Portfolio content curation (owner-facing — unlike the public
// getPublicShopPortfolio in public-actions.ts, this returns every photo,
// including ones currently hidden, so the Owner can unhide them again.)
// ----------------------------------------------------------------------

export interface PortfolioCurationPhoto {
  url: string;
  garment: string;
  takenAt: string;
  hidden: boolean;
  featured: boolean;
  consentConfirmed: boolean;
  caption?: string;
}

export async function getPortfolioCurationPhotosAction(shopId: string): Promise<PortfolioCurationPhoto[]> {
  const supabase = await createClient();
  const { data: orderRows, error } = await supabase
    .from('orders')
    .select('order_details, images')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);

  const { data: overrideRows } = await supabase
    .from('portfolio_photo_overrides')
    .select('photo_url, hidden, featured, consent_confirmed, caption')
    .eq('shop_id', shopId);
  const overrides = new Map((overrideRows || []).map((r) => [r.photo_url, r]));

  const photos: PortfolioCurationPhoto[] = [];
  for (const o of orderRows || []) {
    for (const p of (o.images || []) as { url: string; stage: string; uploadedAt: string }[]) {
      const override = overrides.get(p.url);
      photos.push({
        url: p.url,
        garment: o.order_details,
        takenAt: p.uploadedAt,
        hidden: override?.hidden || false,
        featured: override?.featured || false,
        consentConfirmed: override?.consent_confirmed || false,
        caption: override?.caption || undefined,
      });
    }
  }
  return photos;
}

// ----------------------------------------------------------------------
// Customer reviews (order_ratings) — owner-facing moderation. Submission
// itself happens unauthenticated from the public tracking page (see
// app/public-actions.ts submitOrderRatingAction) and lands unapproved;
// nothing here is visible on the public portfolio until approved.
// ----------------------------------------------------------------------

export interface OrderRating {
  id: string;
  orderId: string;
  shopId: string;
  customerName: string;
  rating: number;
  comment?: string;
  submittedAt: string;
  approved: boolean;
  featured: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orderRatingFromRow(row: any): OrderRating {
  return {
    id: row.id,
    orderId: row.order_id,
    shopId: row.shop_id,
    customerName: row.customer_name,
    rating: row.rating,
    comment: row.comment || undefined,
    submittedAt: row.submitted_at,
    approved: row.approved,
    featured: row.featured,
  };
}

export async function getOrderRatingsAction(shopId: string): Promise<OrderRating[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('order_ratings')
    .select('*')
    .eq('shop_id', shopId)
    .order('submitted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(orderRatingFromRow);
}

export async function setOrderRatingModerationAction(
  ratingId: string,
  updates: { approved?: boolean; featured?: boolean }
): Promise<void> {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (updates.approved !== undefined) row.approved = updates.approved;
  if (updates.featured !== undefined) row.featured = updates.featured;
  const { error } = await supabase.from('order_ratings').update(row).eq('id', ratingId);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------
// Account / data deletion (NDPR right-to-erasure)
// ----------------------------------------------------------------------
// Every deletion below re-derives "who is asking" from the actual session
// cookie (via createClient().auth.getUser()), never from a client-supplied
// id — a deletion action is exactly the wrong place to trust a caller's
// self-reported identity.

/** Recursively lists and removes every file under `prefix` in `bucket`.
 *  Storage's `list()` only returns one folder level at a time and doesn't
 *  distinguish files from sub-folders in its response shape, so folders
 *  are detected by the absence of `id` (files always have one) and walked
 *  one level deeper. Best-effort: swallows list/remove errors so a missing
 *  or already-empty bucket never blocks the rest of a deletion. */
async function deleteStorageFolder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  bucket: string,
  prefix: string
): Promise<void> {
  try {
    const { data: entries } = await admin.storage.from(bucket).list(prefix);
    if (!entries || entries.length === 0) return;

    const filePaths: string[] = [];
    for (const entry of entries) {
      const fullPath = `${prefix}/${entry.name}`;
      if (entry.id) {
        filePaths.push(fullPath);
      } else {
        await deleteStorageFolder(admin, bucket, fullPath);
      }
    }
    if (filePaths.length > 0) {
      await admin.storage.from(bucket).remove(filePaths);
    }
  } catch {
    // Best-effort cleanup — never let a storage hiccup block account/order
    // deletion, which must still succeed on the database side.
  }
}

/** Owner deletes their entire shop: every order/customer/staff profile and
 *  all associated storage, then the Owner's own auth account. The shop row
 *  cascades (via `on delete cascade` FKs) to profiles/customers/orders and
 *  everything keyed off them — but deleting a `shops` row does NOT touch
 *  `auth.users` (shops.owner_id is `on delete set null`, not cascade), so
 *  every profile's auth user under this shop is deleted explicitly, last. */
export async function deleteOwnShopAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { error: 'Not signed in' };

  const admin = createAdminClient();
  const { data: requester } = await admin.from('profiles').select('shop_id, role, name').eq('id', uid).single();
  if (!requester || !isOwnerLikeRole(requester.role)) {
    return { error: 'Only the shop owner can delete the shop account' };
  }
  const shopId = requester.shop_id;

  const { data: shopRow } = await admin.from('shops').select('name').eq('id', shopId).single();
  const { data: allProfiles } = await admin.from('profiles').select('id').eq('shop_id', shopId);
  const profileIds = (allProfiles || []).map((p) => p.id as string);

  await deleteStorageFolder(admin, 'order-photos', shopId);
  await deleteStorageFolder(admin, 'portfolio-photos', shopId);
  await deleteStorageFolder(admin, 'style-photos', shopId);
  for (const pid of profileIds) {
    await deleteStorageFolder(admin, 'avatars', pid);
  }

  await logAudit({
    shopId,
    actorId: uid,
    actorName: requester.name,
    action: 'shop.deleted',
    entityType: 'shop',
    entityId: shopId,
    diff: { shopName: shopRow?.name, staffCount: profileIds.length },
  });

  const { error: shopDeleteError } = await admin.from('shops').delete().eq('id', shopId);
  if (shopDeleteError) return { error: shopDeleteError.message };

  for (const pid of profileIds) {
    await admin.auth.admin.deleteUser(pid);
  }

  return {};
}

/** A Staff member deletes their own account only — never the shop or its
 *  data. Deleting their own auth.users row cascades to their own profiles
 *  row automatically (`profiles.id references auth.users(id) on delete
 *  cascade`), and any orders assigned to them are auto-unassigned by the
 *  existing `assigned_to ... on delete set null` FK — no manual cleanup
 *  needed for either. */
export async function deleteOwnStaffAccountAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { error: 'Not signed in' };

  const admin = createAdminClient();
  const { data: requester } = await admin.from('profiles').select('role, name, shop_id').eq('id', uid).single();
  if (!requester || requester.role !== 'Staff') {
    return { error: 'Only a staff member can delete their own staff account' };
  }

  await deleteStorageFolder(admin, 'avatars', uid);

  await logAudit({
    shopId: requester.shop_id,
    actorId: uid,
    actorName: requester.name,
    action: 'staff.deleted',
    entityType: 'profile',
    entityId: uid,
    diff: { staffName: requester.name },
  });

  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return { error: error.message };
  return {};
}

/** Owner deletes a single order (and its photos). Verifies the order
 *  actually belongs to the requester's own shop before touching anything. */
export async function deleteOrderAction(orderId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { error: 'Not signed in' };

  const admin = createAdminClient();
  const { data: requester } = await admin.from('profiles').select('shop_id, role, name').eq('id', uid).single();
  if (!requester || !isOwnerLikeRole(requester.role)) {
    return { error: 'Only the shop owner can delete orders' };
  }

  const { data: order } = await admin.from('orders').select('id, shop_id, customer_name, order_details').eq('id', orderId).single();
  if (!order || order.shop_id !== requester.shop_id) {
    return { error: 'Order not found' };
  }

  await deleteStorageFolder(admin, 'order-photos', `${requester.shop_id}/${orderId}`);

  await logAudit({
    shopId: requester.shop_id,
    actorId: uid,
    actorName: requester.name,
    action: 'order.deleted',
    entityType: 'order',
    entityId: orderId,
    diff: { customerName: order.customer_name, orderDetails: order.order_details },
  });

  const { error } = await admin.from('orders').delete().eq('id', orderId);
  if (error) return { error: error.message };
  return {};
}

/** Owner deletes a customer and every order they have (orders.customer_id
 *  is `on delete restrict`, so the customer row itself would otherwise be
 *  rejected by Postgres while any order still references it — their orders
 *  are deleted first, deliberately, not left to a cascade that doesn't
 *  exist for this relationship). */
export async function deleteCustomerAction(customerId: string): Promise<{ error?: string; deletedOrderCount?: number }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { error: 'Not signed in' };

  const admin = createAdminClient();
  const { data: requester } = await admin.from('profiles').select('shop_id, role, name').eq('id', uid).single();
  if (!requester || !isOwnerLikeRole(requester.role)) {
    return { error: 'Only the shop owner can delete customers' };
  }

  const { data: customer } = await admin.from('customers').select('id, shop_id, full_name').eq('id', customerId).single();
  if (!customer || customer.shop_id !== requester.shop_id) {
    return { error: 'Customer not found' };
  }

  const { data: customerOrders } = await admin.from('orders').select('id').eq('customer_id', customerId);
  const orderIds = (customerOrders || []).map((o) => o.id as string);

  for (const oid of orderIds) {
    await deleteStorageFolder(admin, 'order-photos', `${requester.shop_id}/${oid}`);
  }

  await logAudit({
    shopId: requester.shop_id,
    actorId: uid,
    actorName: requester.name,
    action: 'customer.deleted',
    entityType: 'customer',
    entityId: customerId,
    diff: { customerName: customer.full_name, deletedOrderCount: orderIds.length },
  });

  if (orderIds.length > 0) {
    const { error: ordersDeleteError } = await admin.from('orders').delete().in('id', orderIds);
    if (ordersDeleteError) return { error: ordersDeleteError.message };
  }

  const { error } = await admin.from('customers').delete().eq('id', customerId);
  if (error) return { error: error.message };
  return { deletedOrderCount: orderIds.length };
}

/** Owner-only self-serve export of everything this app stores for their
 *  shop — fulfills the data-access/portability right the privacy policy
 *  already promises, without needing a manual support request. Everything
 *  is scoped to the requester's own shop_id, derived server-side from
 *  their session, never a client-supplied id. */
export async function exportShopDataAction(): Promise<{ data?: string; error?: string }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) return { error: 'Not signed in' };

  const admin = createAdminClient();
  const { data: requester } = await admin.from('profiles').select('shop_id, role').eq('id', uid).single();
  if (!requester || !isOwnerLikeRole(requester.role)) {
    return { error: 'Only the shop owner can export shop data' };
  }
  const shopId = requester.shop_id;

  const { allowed } = await checkRateLimit(`export:${uid}`, { limit: 3, windowSeconds: 3600 });
  if (!allowed) return { error: 'Too many export requests — please try again in an hour.' };

  const [shop, customers, orders, staff, stylePhotos, portfolioOverrides] = await Promise.all([
    admin.from('shops').select('*').eq('id', shopId).single(),
    admin.from('customers').select('*').eq('shop_id', shopId),
    admin.from('orders').select('*').eq('shop_id', shopId),
    admin.from('profiles').select('id, name, email, role').eq('shop_id', shopId),
    admin.from('style_photo_submissions').select('*').eq('shop_id', shopId),
    admin.from('portfolio_photo_overrides').select('*').eq('shop_id', shopId),
  ]);

  const orderIds = (orders.data || []).map((o) => o.id as string);
  const { data: orderComments } = orderIds.length
    ? await admin.from('order_comments').select('*').in('order_id', orderIds)
    : { data: [] };

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    shop: shop.data,
    staff: staff.data,
    customers: customers.data,
    orders: orders.data,
    orderComments,
    stylePhotoSubmissions: stylePhotos.data,
    portfolioPhotoOverrides: portfolioOverrides.data,
  };

  return { data: JSON.stringify(exportPayload, null, 2) };
}

/** Owner-only recent activity, for accountability — RLS (see migration
 *  0018) already restricts this to the caller's own shop and Owner role,
 *  so a Staff member calling this simply gets zero rows back, not an error. */
export async function getAuditLogAction(shopId: string): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: String(row.id),
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    diff: row.diff,
    createdAt: row.created_at,
  }));
}

export interface FinancialReportBranch {
  shopId: string;
  shopName: string;
  isPrimary: boolean;
  collected: number;
  outstanding: number;
  revenueWithCostData: number;
  costTotal: number;
  marginTotal: number;
  ordersWithCostCount: number;
}

export interface FinancialReport {
  branches: FinancialReportBranch[];
  totals: Omit<FinancialReportBranch, 'shopId' | 'shopName' | 'isPrimary'>;
}

/** Owner/Accountant-only. fromDate (ISO string), if given, limits to orders
 *  created on or after that date — omit for all-time. org_id is derived
 *  server-side from the caller's own session, never trusted from the
 *  client; the admin client is used for the actual cross-branch orders
 *  read (after the role check below), the same pattern already used by
 *  addBranchAction/deleteOwnShopAction elsewhere in this file — this
 *  avoids depending on current_branch_ids() correctly covering every
 *  branch in the org, which only holds once the RBAC migration (Phase 4)
 *  is applied. */
export async function getFinancialReport(fromDate?: string): Promise<{ data?: FinancialReport; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single();
  if (!profile) return { error: 'Profile not found' };
  if (!isOwnerLikeRole(profile.role) && profile.role !== 'Accountant') {
    return { error: 'Only the Owner or Accountant can view financial reports' };
  }

  const admin = createAdminClient();
  const { data: shops, error: shopsError } = await admin
    .from('shops')
    .select('id, name, is_primary')
    .eq('org_id', profile.org_id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (shopsError) return { error: shopsError.message };
  if (!shops || shops.length === 0) return { data: { branches: [], totals: emptyTotals() } };

  let ordersQuery = admin
    .from('orders')
    .select('shop_id, total_bill, deposit_paid, status, material_cost, other_costs, created_at')
    .in('shop_id', shops.map((s) => s.id));
  if (fromDate) ordersQuery = ordersQuery.gte('created_at', fromDate);
  const { data: orders, error: ordersError } = await ordersQuery;
  if (ordersError) return { error: ordersError.message };

  const branches: FinancialReportBranch[] = shops.map((shop) => {
    const shopOrders = (orders || []).filter((o) => o.shop_id === shop.id);
    return {
      shopId: shop.id,
      shopName: shop.name,
      isPrimary: shop.is_primary,
      ...rollup(shopOrders),
    };
  });

  const totals = rollup(orders || []);

  return { data: { branches, totals } };
}

function emptyTotals(): FinancialReport['totals'] {
  return { collected: 0, outstanding: 0, revenueWithCostData: 0, costTotal: 0, marginTotal: 0, ordersWithCostCount: 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rollup(rows: any[]): Omit<FinancialReportBranch, 'shopId' | 'shopName' | 'isPrimary'> {
  let collected = 0;
  let outstanding = 0;
  let revenueWithCostData = 0;
  let costTotal = 0;
  let ordersWithCostCount = 0;

  for (const row of rows) {
    collected += row.deposit_paid || 0;
    if (row.status !== 'Completed') outstanding += (row.total_bill || 0) - (row.deposit_paid || 0);

    const materialCost = row.material_cost || 0;
    const otherCosts = row.other_costs || 0;
    if (materialCost > 0 || otherCosts > 0) {
      ordersWithCostCount += 1;
      revenueWithCostData += row.total_bill || 0;
      costTotal += materialCost + otherCosts;
    }
  }

  return {
    collected,
    outstanding,
    revenueWithCostData,
    costTotal,
    marginTotal: revenueWithCostData - costTotal,
    ordersWithCostCount,
  };
}

// ----------------------------------------------------------------------
// Web Push subscriptions
// ----------------------------------------------------------------------

export async function savePushSubscriptionAction(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return { error: 'Not signed in' };

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      profile_id: authData.user.id,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    { onConflict: 'endpoint' }
  );
  if (error) return { error: error.message };
  return {};
}

export async function removePushSubscriptionAction(endpoint: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return { error: 'Not signed in' };

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('profile_id', authData.user.id);
  if (error) return { error: error.message };
  return {};
}
