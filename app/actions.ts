'use server';

import { createClient } from '@/lib/supabase/server';
import type { Order, Customer, OrderStatus, Measurements, User, Shop, PortfolioPhoto } from '@/lib/types';

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
    images: row.images || [],
    rating: row.rating ?? undefined,
    ratingSubmittedAt: row.rating_submitted_at || undefined,
    statusHistory: row.status_history || [],
    payments: row.payments || [],
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
  if (o.images !== undefined) row.images = o.images;
  if (o.statusHistory !== undefined) row.status_history = o.statusHistory;
  if (o.payments !== undefined) row.payments = o.payments;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function customerFromRow(row: any): Customer {
  return {
    id: row.id,
    shopId: row.shop_id,
    fullName: row.full_name,
    whatsappNumber: row.whatsapp_number,
    gender: row.gender,
    measurements: row.measurements || undefined,
    dateOfBirth: row.date_of_birth || undefined,
    referredBy: row.referred_by || undefined,
    createdAt: row.created_at,
  };
}

function customerToRow(updates: Partial<Customer>) {
  const row: Record<string, unknown> = {};
  if (updates.fullName !== undefined) row.full_name = updates.fullName;
  if (updates.whatsappNumber !== undefined) row.whatsapp_number = updates.whatsappNumber;
  if (updates.gender !== undefined) row.gender = updates.gender;
  if (updates.measurements !== undefined) row.measurements = updates.measurements;
  if (updates.dateOfBirth !== undefined) row.date_of_birth = updates.dateOfBirth || null;
  if (updates.referredBy !== undefined) row.referred_by = updates.referredBy || null;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function userFromRow(row: any): User {
  return {
    uid: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    shopId: row.shop_id,
    active: row.active,
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
    tagline: row.tagline || undefined,
    bio: row.bio || undefined,
    ownerUid: row.owner_id,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function portfolioPhotoFromRow(row: any): PortfolioPhoto {
  return {
    id: row.id,
    shopId: row.shop_id,
    url: row.url,
    caption: row.caption || undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------
// Reads
// ----------------------------------------------------------------------

export async function getShopBundle(shopId: string) {
  const supabase = await createClient();
  const [shopRes, customersRes, ordersRes, profilesRes] = await Promise.all([
    supabase.from('shops').select('*').eq('id', shopId).single(),
    supabase.from('customers').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
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

async function getCustomers(shopId: string): Promise<Customer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('shop_id', shopId)
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
    .select('status, status_history')
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

  return getOrders(shopId);
}

export async function updateOrderAction(orderId: string, updates: Partial<Order>, shopId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('orders')
    .update({ ...orderToRow('', updates), updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw new Error(error.message);
  return getOrders(shopId);
}

// ----------------------------------------------------------------------
// Customers
// ----------------------------------------------------------------------

export async function addCustomerAction(shopId: string, customer: Omit<Customer, 'id' | 'shopId' | 'createdAt'>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .insert({
      shop_id: shopId,
      full_name: customer.fullName,
      whatsapp_number: customer.whatsappNumber,
      gender: customer.gender,
      measurements: customer.measurements || null,
      date_of_birth: customer.dateOfBirth || null,
      referred_by: customer.referredBy || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const customers = await getCustomers(shopId);
  return { newCustomer: customerFromRow(data), customers };
}

export async function updateCustomerMeasurementsAction(customerId: string, measurements: Measurements, shopId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('customers').update({ measurements }).eq('id', customerId);
  if (error) throw new Error(error.message);
  return getCustomers(shopId);
}

export async function updateCustomerAction(customerId: string, updates: Partial<Customer>, shopId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('customers').update(customerToRow(updates)).eq('id', customerId);
  if (error) throw new Error(error.message);
  return getCustomers(shopId);
}

// ----------------------------------------------------------------------
// Staff / Shop
// ----------------------------------------------------------------------

export async function updateStaffAction(uid: string, updates: Partial<User>, shopId: string) {
  const supabase = await createClient();
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.active !== undefined) row.active = updates.active;
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
  if (updates.tagline !== undefined) row.tagline = updates.tagline || null;
  if (updates.bio !== undefined) row.bio = updates.bio || null;
  const { data, error } = await supabase.from('shops').update(row).eq('id', shopId).select().single();
  if (error) throw new Error(error.message);
  return shopFromRow(data);
}

// ----------------------------------------------------------------------
// Portfolio photos — fetched separately from getShopBundle since the
// management screen is an occasional-use page, not part of the app's
// always-loaded data.
// ----------------------------------------------------------------------

export async function getPortfolioPhotosAction(shopId: string): Promise<PortfolioPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('portfolio_photos')
    .select('*')
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(portfolioPhotoFromRow);
}

export async function addPortfolioPhotoAction(shopId: string, url: string, caption?: string): Promise<PortfolioPhoto> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('portfolio_photos')
    .select('sort_order')
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: false })
    .limit(1);
  const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
  const { data, error } = await supabase
    .from('portfolio_photos')
    .insert({ shop_id: shopId, url, caption: caption || null, sort_order: nextSortOrder })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return portfolioPhotoFromRow(data);
}

export async function deletePortfolioPhotoAction(photoId: string, shopId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('portfolio_photos').delete().eq('id', photoId).eq('shop_id', shopId);
  if (error) throw new Error(error.message);
}
