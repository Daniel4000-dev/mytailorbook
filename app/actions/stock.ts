'use server';

import { createClient } from '@/lib/supabase/server';
import { FinishedGood, PosSale, AddStockGarmentInput, PaymentMethod } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { normalizePhone } from '@/lib/formatters';
import { logAudit } from '@/lib/audit';

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
  
  // Validate items and verify inventory availability before creating order
  for (const item of items) {
    if (!item.goodId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return { error: `Invalid quantity for item "${item.name || item.goodId}"` };
    }
    if (typeof item.priceAtSale !== 'number' || item.priceAtSale < 0) {
      return { error: `Invalid price for item "${item.name || item.goodId}"` };
    }
    const { data: currentStock, error: stockFetchErr } = await supabase
      .from('finished_goods')
      .select('quantity, name, size')
      .eq('id', item.goodId)
      .single();

    if (stockFetchErr || !currentStock) {
      return { error: `Garment "${item.name} (${item.size})" was not found on the rack` };
    }
    if ((Number(currentStock.quantity) || 0) < item.quantity) {
      return {
        error: `Insufficient stock for "${currentStock.name} (${currentStock.size})". Only ${currentStock.quantity} piece(s) available on rack.`
      };
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.priceAtSale), 0);
  const discount = Math.max(0, options?.discountAmount || 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const details = items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(', ');

  let customerId = options?.customerId || null;
  let customerName = options?.customerName?.trim() || 'Retail Walk-In';
  let customerPhone = options?.customerPhone?.trim() || '';

  // If customerId is not directly passed, look up or create client
  if (!customerId) {
    const rawName = options?.customerName?.trim();
    const rawPhone = options?.customerPhone?.trim();

    if (rawPhone) {
      const normalizedPhone = normalizePhone(rawPhone);
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, full_name, whatsapp_number')
        .eq('shop_id', shopId)
        .eq('whatsapp_number', normalizedPhone)
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
            full_name: rawName || 'Showroom Customer',
            whatsapp_number: normalizedPhone,
            gender: 'female'
          }).select('id').single();
          customerId = createdCust?.id || null;
          customerName = rawName || 'Showroom Customer';
          customerPhone = normalizedPhone;
        }
      }
    } else if (rawName && rawName !== 'Retail Walk-In') {
      // Customer name provided without a phone number (case-insensitive search)
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id, full_name, whatsapp_number')
        .eq('shop_id', shopId)
        .ilike('full_name', rawName)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
        customerName = existingCust.full_name;
        customerPhone = existingCust.whatsapp_number;
      } else {
        const { data: shopInfo } = await supabase.from('shops').select('org_id').eq('id', shopId).single();
        if (shopInfo) {
          // Generate unique placeholder phone so it does not collide with unique_shop_whatsapp
          const placeholderPhone = `23400${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10)}`;
          const { data: createdCust } = await supabase.from('customers').insert({
            shop_id: shopId,
            org_id: shopInfo.org_id,
            full_name: rawName,
            whatsapp_number: placeholderPhone,
            gender: 'female'
          }).select('id').single();
          customerId = createdCust?.id || null;
          customerName = rawName;
          customerPhone = placeholderPhone;
        }
      }
    } else {
      // Default anonymous Retail Walk-In
      customerName = 'Retail Walk-In';
      customerPhone = '0000000001';
      let { data: retailCust } = await supabase.from('customers')
        .select('id')
        .eq('shop_id', shopId)
        .eq('whatsapp_number', '0000000001')
        .maybeSingle();
        
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

  // Look up cashier display name
  let cashierName = 'Showroom Cashier';
  if (cashierId) {
    const { data: cashierProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', cashierId)
      .maybeSingle();
    if (cashierProfile?.full_name) {
      cashierName = cashierProfile.full_name;
    }
  }

  const orderNote = [
    discount > 0 ? `Discount: -${discount}` : null,
    options?.notes?.trim() || null
  ].filter(Boolean).join(' • ');

  const paymentId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const validPaymentMethod: PaymentMethod = (
    paymentMethod === 'pos' || paymentMethod === 'cash' || paymentMethod === 'transfer' || paymentMethod === 'store_credit'
  ) ? (paymentMethod as PaymentMethod) : (paymentMethod === 'card' ? 'pos' : 'cash');

  const paymentRecords = totalAmount > 0 ? [{
    id: paymentId,
    amount: totalAmount,
    method: validPaymentMethod,
    note: 'Showroom Counter Checkout',
    recordedBy: cashierId || 'system',
    recordedByName: cashierName,
    timestamp: nowIso,
    date: nowIso
  }] : [];

  const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
    shop_id: shopId,
    customer_id: customerId,
    customer_name: customerName,
    order_details: `POS Sale: ${details}${orderNote ? ` (${orderNote})` : ''}`,
    total_bill: totalAmount,
    deposit_paid: totalAmount,
    status: 'Delivered',
    status_history: [{
      from: 'Documented',
      to: 'Delivered',
      changedBy: cashierId || 'system',
      changedByName: cashierName,
      timestamp: nowIso
    }],
    is_internal_batch: false,
    payments: paymentRecords
  }).select('id').single();
  
  if (orderError) return { error: orderError.message };
  
  // Deduct from stock
  for (const item of items) {
    const { data: existing } = await supabase.from('finished_goods').select('quantity').eq('id', item.goodId).single();
    if (existing) {
      await supabase.from('finished_goods').update({ quantity: Math.max(0, existing.quantity - item.quantity) }).eq('id', item.goodId);
    }
  }

  // Insert into relational payments table for ledgers & daily registers (only when amount > 0 per db check constraint)
  if (totalAmount > 0) {
    await supabase.from('payments').insert({
      shop_id: shopId,
      order_id: newOrder.id,
      amount: totalAmount,
      method: validPaymentMethod,
      reference_note: `POS Sale: ${details}`
    });
  }

  // Best-effort audit log
  await logAudit({
    shopId,
    actorId: cashierId || null,
    actorName: cashierName,
    action: 'order.created',
    entityType: 'order',
    entityId: newOrder.id,
    diff: {
      totalBill: totalAmount,
      channel: 'pos_counter',
      itemsCount: items.reduce((s, i) => s + i.quantity, 0),
      paymentMethod: validPaymentMethod,
    }
  });
  
  revalidatePath('/stock');
  revalidatePath('/customers');
  revalidatePath('/dashboard');
  return { success: true, orderId: newOrder?.id, totalAmount };
}
