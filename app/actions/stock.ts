'use server';

import { createClient } from '@/lib/supabase/server';
import { FinishedGood, PosSale, AddStockGarmentInput } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function getStockAction(shopId: string): Promise<FinishedGood[] | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('finished_goods')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };

  return (data || []).map(row => ({
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    size: row.size,
    quantity: row.quantity,
    price: Number(row.price) || 0,
    sku: row.sku || row.metadata?.sku || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined
  }));
}

export async function addStockGarmentsAction(
  shopId: string,
  input: AddStockGarmentInput
): Promise<{ success?: boolean; count?: number; error?: string }> {
  if (!shopId) return { error: 'Shop ID is required' };
  if (!input.name || !input.name.trim()) return { error: 'Garment style name is required' };
  if (typeof input.price !== 'number' || input.price < 0) return { error: 'Valid selling price is required' };

  const validSizes = (input.sizes || []).filter(s => s && s.size && s.size.trim() && s.quantity > 0);
  if (validSizes.length === 0) {
    return { error: 'Please specify at least one size with quantity greater than zero' };
  }

  const cleanName = input.name.trim();
  const supabase = await createClient();

  // Check for existing items of this style name in the shop to merge inventory cleanly
  const { data: existingRows } = await supabase
    .from('finished_goods')
    .select('id, name, size, quantity, metadata')
    .eq('shop_id', shopId)
    .ilike('name', cleanName);

  const existingMap = new Map<string, { id: string; quantity: number; metadata: any }>();
  (existingRows || []).forEach(row => {
    // Exact case-insensitive match prevents SQL wildcard false-positives (e.g. % or _)
    if (row.name && row.name.trim().toLowerCase() === cleanName.toLowerCase()) {
      existingMap.set(row.size.trim().toLowerCase(), {
        id: row.id,
        quantity: Number(row.quantity) || 0,
        metadata: row.metadata || {}
      });
    }
  });

  const toInsert: any[] = [];
  let totalProcessed = 0;

  for (const s of validSizes) {
    const sizeKey = s.size.trim().toLowerCase();
    const existing = existingMap.get(sizeKey);
    const itemMetadata = {
      category: input.category?.trim() || undefined,
      color: input.color?.trim() || undefined,
      fabric: input.fabric?.trim() || undefined,
      costPrice: typeof input.costPrice === 'number' && input.costPrice >= 0 ? input.costPrice : undefined,
      rackLocation: input.rackLocation?.trim() || undefined,
      sku: input.sku?.trim() || undefined,
      parentGarmentName: cleanName
    };

    if (existing) {
      // Restock existing showroom item by incrementing quantity and updating details
      const { error: updateError } = await supabase
        .from('finished_goods')
        .update({
          quantity: existing.quantity + Math.max(0, Math.floor(s.quantity)),
          price: input.price,
          metadata: {
            ...existing.metadata,
            ...itemMetadata
          }
        })
        .eq('id', existing.id);

      if (updateError) return { error: updateError.message };
      totalProcessed++;
    } else {
      toInsert.push({
        shop_id: shopId,
        name: cleanName,
        size: s.size.trim(),
        quantity: Math.max(0, Math.floor(s.quantity)),
        price: input.price,
        metadata: itemMetadata
      });
    }
  }

  if (toInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('finished_goods')
      .insert(toInsert)
      .select('id');

    if (insertError) return { error: insertError.message };
    totalProcessed += inserted?.length || toInsert.length;
  }

  revalidatePath('/stock');
  return { success: true, count: totalProcessed };
}

export async function updateStockPriceAction(id: string, price: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('finished_goods')
    .update({ price })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/stock');
  return {};
}

export async function updateStockQuantityAction(id: string, quantity: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('finished_goods')
    .update({ quantity: Math.max(0, quantity) })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/stock');
  return {};
}

export async function quickRestockSizeAction(
  id: string,
  delta: number
): Promise<{ success?: boolean; newQuantity?: number; error?: string }> {
  const supabase = await createClient();
  const { data: current, error: fetchErr } = await supabase
    .from('finished_goods')
    .select('quantity')
    .eq('id', id)
    .single();

  if (fetchErr || !current) return { error: fetchErr?.message || 'Item not found on rack' };

  const newQuantity = Math.max(0, (Number(current.quantity) || 0) + delta);
  const { error: updateErr } = await supabase
    .from('finished_goods')
    .update({ quantity: newQuantity })
    .eq('id', id);

  if (updateErr) return { error: updateErr.message };

  revalidatePath('/stock');
  return { success: true, newQuantity };
}

export async function deleteStockGarmentAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('finished_goods')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/stock');
  return { success: true };
}

export interface ProcessSaleItem {
  goodId: string;
  quantity: number;
  priceAtSale: number;
  name: string;
  size: string;
}

export interface ProcessSaleOptions {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discountAmount?: number;
  notes?: string;
}

export async function processSaleAction(
  shopId: string, 
  items: ProcessSaleItem[], 
  paymentMethod: string, 
  cashierId: string,
  options?: ProcessSaleOptions
): Promise<{ success?: boolean; orderId?: string; totalAmount?: number; error?: string }> {
  if (!shopId) return { error: 'Shop ID is required' };
  if (!items || items.length === 0) return { error: 'No items in cart to sell' };

  const supabase = await createClient();
  
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.priceAtSale), 0);
  const discount = Math.max(0, options?.discountAmount || 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const details = items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(', ');

  let customerId = options?.customerId || null;
  let customerName = options?.customerName?.trim() || 'Retail Walk-In';
  let customerPhone = options?.customerPhone?.trim() || '0000000001';

  // If customerId is not directly passed, look up or create client
  if (!customerId) {
    if (options?.customerName?.trim() || options?.customerPhone?.trim()) {
      const phoneSearch = options.customerPhone?.trim() || '0000000001';
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, full_name, whatsapp_number')
        .eq('shop_id', shopId)
        .eq('whatsapp_number', phoneSearch)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
        customerName = existingCust.full_name;
        customerPhone = existingCust.whatsapp_number;
      } else {
        const { data: shopInfo } = await supabase.from('shops').select('org_id').eq('id', shopId).single();
        if (shopInfo) {
          const { data: createdCust } = await supabase.from('customers').insert({
            shop_id: shopId,
            org_id: shopInfo.org_id,
            full_name: customerName,
            whatsapp_number: customerPhone,
            gender: 'female'
          }).select('id').single();
          customerId = createdCust?.id || null;
        }
      }
    } else {
      // Default anonymous Retail Walk-In
      let { data: retailCust } = await supabase.from('customers')
        .select('id').eq('shop_id', shopId).eq('whatsapp_number', '0000000001').eq('full_name', 'Retail Walk-In').maybeSingle();
        
      if (!retailCust) {
        const { data: shopInfo } = await supabase.from('shops').select('org_id').eq('id', shopId).single();
        if (shopInfo) {
          const { data: newCust } = await supabase.from('customers').insert({
            shop_id: shopId,
            org_id: shopInfo.org_id,
            full_name: 'Retail Walk-In',
            whatsapp_number: '0000000001',
            gender: 'female'
          }).select('id').single();
          retailCust = newCust;
        }
      }
      customerId = retailCust?.id || null;
    }
  }

  const orderNote = [
    discount > 0 ? `Discount: -${discount}` : null,
    options?.notes?.trim() || null
  ].filter(Boolean).join(' • ');

  const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
    shop_id: shopId,
    customer_id: customerId,
    customer_name: customerName,
    order_details: `POS Sale: ${details}${orderNote ? ` (${orderNote})` : ''}`,
    total_bill: totalAmount,
    deposit_paid: totalAmount,
    status: 'Delivered',
    is_internal_batch: false,
    payments: [{
      amount: totalAmount,
      method: paymentMethod,
      date: new Date().toISOString()
    }]
  }).select('id').single();
  
  if (orderError) return { error: orderError.message };
  
  // Deduct from stock
  for (const item of items) {
    const { data: existing } = await supabase.from('finished_goods').select('quantity').eq('id', item.goodId).single();
    if (existing) {
      await supabase.from('finished_goods').update({ quantity: Math.max(0, existing.quantity - item.quantity) }).eq('id', item.goodId);
    }
  }
  
  revalidatePath('/stock');
  return { success: true, orderId: newOrder?.id, totalAmount };
}
