'use server';

import { createClient } from '@/lib/supabase/server';
import {
  FinishedGood,
  PosSale,
  AddStockGarmentInput,
  PaymentMethod,
  PublicShowroomPayload,
  PublicShowroomItem,
  PublicShowroomAccessory
} from '@/lib/types';
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
      imageUrl: input.imageUrl?.trim() || undefined,
      pairedAccessoryIds: Array.isArray(input.pairedAccessoryIds) ? input.pairedAccessoryIds : undefined,
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
): Promise<{
  success?: boolean;
  orderId?: string;
  totalAmount?: number;
  customerName?: string;
  customerPhone?: string;
  error?: string
}> {
  if (!shopId) return { error: 'Shop ID is required' };
  if (!items || items.length === 0) return { error: 'No items in cart to sell' };

  const supabase = await createClient();

  // Validate and consolidate duplicate cart items
  const consolidatedMap = new Map<string, ProcessSaleItem>();
  for (const item of items) {
    if (!item.goodId || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return { error: `Invalid quantity for item "${item.name || item.goodId}"` };
    }
    if (typeof item.priceAtSale !== 'number' || item.priceAtSale < 0) {
      return { error: `Invalid price for item "${item.name || item.goodId}"` };
    }
    const existing = consolidatedMap.get(item.goodId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      consolidatedMap.set(item.goodId, { ...item });
    }
  }
  const consolidatedItems = Array.from(consolidatedMap.values());

  // Verify rack inventory availability against consolidated quantities
  for (const item of consolidatedItems) {
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

  const subtotal = Math.round(items.reduce((sum, item) => sum + (item.quantity * item.priceAtSale), 0));
  const discount = Math.min(subtotal, Math.max(0, Math.round(options?.discountAmount || 0)));
  const totalAmount = Math.max(0, subtotal - discount);
  const details = items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(', ');

  let customerId = options?.customerId || null;
  let customerName = options?.customerName?.trim() || 'Retail Walk-In';
  let customerPhone = options?.customerPhone?.trim() || '';

  // If customerId is directly passed, populate customer details if needed
  if (customerId && (!customerPhone || customerName === 'Retail Walk-In')) {
    const { data: directCust } = await supabase
      .from('customers')
      .select('id, full_name, whatsapp_number')
      .eq('id', customerId)
      .maybeSingle();
    if (directCust) {
      customerName = directCust.full_name;
      customerPhone = directCust.whatsapp_number;
    }
  }

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

  if (!customerId) {
    return { error: 'Unable to assign customer to this showroom order. Please verify your shop settings.' };
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
    payments: paymentRecords,
    metadata: {
      channel: 'pos_counter',
      sales_channel: 'pos_counter',
      order_type: 'rtw_counter_sale',
      items: consolidatedItems.map(i => ({
        goodId: i.goodId,
        name: i.name,
        size: i.size,
        quantity: i.quantity,
        priceAtSale: i.priceAtSale
      })),
      discountAmount: discount
    }
  }).select('id').single();

  if (orderError) return { error: orderError.message };

  // Deduct from stock
  for (const item of consolidatedItems) {
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
  return {
    success: true,
    orderId: newOrder?.id,
    totalAmount,
    customerName,
    customerPhone
  };
}

export interface ShowroomFinancials {
  totalPieces: number;
  retailValuation: number;
  costValuation: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  ordersCount: number;
  turnoverRate: number;
  topStyles: Array<{ name: string; units: number; revenue: number }>;
}

export async function getShowroomFinancialsAction(
  shopId: string,
  days = 30
): Promise<{ data?: ShowroomFinancials; error?: string }> {
  try {
    const supabase = await createClient();
    if (supabase.auth?.getUser) {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) return { error: 'Not authenticated' };
    }

    // 1. Fetch current stock
    const { data: stockItems, error: stockError } = await supabase
      .from('finished_goods')
      .select('id, name, size, quantity, price, metadata')
      .eq('shop_id', shopId);

    if (stockError) return { error: stockError.message };

    const items = stockItems || [];
    let totalPieces = 0;
    let retailValuation = 0;
    let costValuation = 0;
    const costPriceMap = new Map<string, number>();

    for (const item of items) {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      const c = Number(item.metadata?.costPrice) || 0;
      totalPieces += q;
      retailValuation += p * q;
      costValuation += c * q;
      if (c > 0) {
        costPriceMap.set(item.id, c);
        costPriceMap.set(item.name.toLowerCase(), c);
      }
    }

    // 2. Fetch showroom orders in the period
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: posOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total_bill, deposit_paid, metadata, created_at')
      .eq('shop_id', shopId)
      .gte('created_at', fromDate);

    if (ordersError) return { error: ordersError.message };

    let unitsSold = 0;
    let revenue = 0;
    let cogs = 0;
    let ordersCount = 0;
    const styleVolumeMap = new Map<string, { units: number; revenue: number }>();

    for (const ord of (posOrders || [])) {
      const isPos =
        ord.metadata?.channel === 'pos_counter' ||
        ord.metadata?.sales_channel === 'pos_counter' ||
        ord.metadata?.order_type === 'rtw_counter_sale';

      if (!isPos) continue;

      ordersCount += 1;
      revenue += Number(ord.total_bill) || Number(ord.deposit_paid) || 0;

      const orderItems = Array.isArray(ord.metadata?.items) ? ord.metadata.items : [];
      for (const it of orderItems) {
        const itemQty = Number(it.quantity) || 1;
        const itemPrice = Number(it.priceAtSale) || 0;
        unitsSold += itemQty;

        const unitCost = costPriceMap.get(it.goodId) || costPriceMap.get((it.name || '').toLowerCase()) || 0;
        cogs += unitCost * itemQty;

        const styleName = it.name || 'Showroom Garment';
        const existing = styleVolumeMap.get(styleName) || { units: 0, revenue: 0 };
        existing.units += itemQty;
        existing.revenue += itemPrice * itemQty;
        styleVolumeMap.set(styleName, existing);
      }
    }

    const grossProfit = Math.max(0, revenue - cogs);
    const grossMarginPercent = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
    const totalInventoryHandled = totalPieces + unitsSold;
    const turnoverRate = totalInventoryHandled > 0 ? Number((unitsSold / totalInventoryHandled).toFixed(2)) : 0;

    const topStyles = Array.from(styleVolumeMap.entries())
      .map(([name, data]) => ({ name, units: data.units, revenue: data.revenue }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return {
      data: {
        totalPieces,
        retailValuation,
        costValuation,
        unitsSold,
        revenue,
        cogs,
        grossProfit,
        grossMarginPercent,
        ordersCount,
        turnoverRate,
        topStyles,
      }
    };
  } catch (err: any) {
    console.error('getShowroomFinancialsAction error:', err);
    return { error: err.message || 'Failed to fetch showroom financials' };
  }
}

export async function getPublicShowroomStockAction(
  slugOrShopId: string
): Promise<PublicShowroomPayload | { error: string }> {
  try {
    if (!slugOrShopId || !slugOrShopId.trim()) {
      return { error: 'Shop slug or identifier is required' };
    }

    const cleanParam = slugOrShopId.trim();
    const supabase = await createClient();

    // Query shop by slug or ID
    const { data: shopRow, error: shopErr } = await supabase
      .from('shops')
      .select('id, name, slug, logo_url, phone, currency, address')
      .or(`slug.eq.${cleanParam},id.eq.${cleanParam}`)
      .maybeSingle();

    if (shopErr || !shopRow) {
      return { error: 'Shop not found' };
    }

    // Fetch active showroom inventory
    const { data: rawStock, error: stockErr } = await supabase
      .from('finished_goods')
      .select('*')
      .eq('shop_id', shopRow.id)
      .order('name', { ascending: true });

    if (stockErr) {
      return { error: stockErr.message };
    }

    const stockRows = rawStock || [];

    const ACCESSORY_KEYWORDS = [
      'accessory',
      'accessories',
      'cap',
      'fila',
      'aso-oke',
      'cufflink',
      'bead',
      'stick',
      'shoe',
      'slide',
      'sandal',
      'pocket square',
      'brooch'
    ];

    const isAccessoryItem = (category?: string, name?: string) => {
      const cat = (category || '').toLowerCase();
      const n = (name || '').toLowerCase();
      return ACCESSORY_KEYWORDS.some(k => cat.includes(k) || n.includes(k));
    };

    // Group styles by name
    const styleGroups = new Map<string, {
      id: string;
      name: string;
      category: string;
      price: number;
      color?: string;
      fabric?: string;
      rackLocation?: string;
      imageUrl?: string;
      totalQuantity: number;
      sizes: Array<{ id: string; size: string; quantity: number }>;
      isAccessory: boolean;
      pairedAccessoryIds?: string[];
    }>();

    for (const row of stockRows) {
      const cleanName = (row.name || '').trim();
      const key = cleanName.toLowerCase();
      const rowPrice = Number(row.price) || 0;
      const rowQty = Number(row.quantity) || 0;
      const meta = row.metadata || {};
      const cat = meta.category || (isAccessoryItem(meta.category, cleanName) ? 'Accessory' : 'Showroom Piece');
      const isAcc = isAccessoryItem(cat, cleanName);

      const existing = styleGroups.get(key);
      if (existing) {
        existing.totalQuantity += Math.max(0, rowQty);
        existing.sizes.push({
          id: row.id,
          size: row.size || 'Free Size',
          quantity: Math.max(0, rowQty)
        });
        if (!existing.imageUrl && meta.imageUrl) {
          existing.imageUrl = meta.imageUrl;
        }
      } else {
        styleGroups.set(key, {
          id: row.id,
          name: cleanName,
          category: cat,
          price: rowPrice,
          color: meta.color || undefined,
          fabric: meta.fabric || undefined,
          rackLocation: meta.rackLocation || undefined,
          imageUrl: meta.imageUrl || undefined,
          totalQuantity: Math.max(0, rowQty),
          sizes: [{
            id: row.id,
            size: row.size || 'Free Size',
            quantity: Math.max(0, rowQty)
          }],
          isAccessory: isAcc,
          pairedAccessoryIds: Array.isArray(meta.pairedAccessoryIds) ? meta.pairedAccessoryIds : undefined
        });
      }
    }

    // Separate apparel styles and standalone accessories
    const allStyles = Array.from(styleGroups.values());
    const accessories: PublicShowroomAccessory[] = allStyles
      .filter(s => s.isAccessory)
      .map(acc => ({
        id: acc.id,
        name: acc.name,
        price: acc.price,
        imageUrl: acc.imageUrl,
        quantity: acc.totalQuantity,
        color: acc.color
      }));

    const apparelItems: PublicShowroomItem[] = allStyles
      .filter(s => !s.isAccessory)
      .map(item => {
        let paired: PublicShowroomAccessory[] = [];
        if (item.pairedAccessoryIds && item.pairedAccessoryIds.length > 0) {
          paired = accessories.filter(a => item.pairedAccessoryIds!.includes(a.id));
        }
        if (paired.length === 0 && accessories.length > 0) {
          paired = accessories.slice(0, 3);
        }

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          color: item.color,
          fabric: item.fabric,
          rackLocation: item.rackLocation,
          imageUrl: item.imageUrl,
          totalQuantity: item.totalQuantity,
          sizes: item.sizes,
          isAccessory: false,
          pairedAccessories: paired
        };
      });

    return {
      shop: {
        id: shopRow.id,
        name: shopRow.name,
        slug: shopRow.slug,
        logoUrl: shopRow.logo_url,
        phone: shopRow.phone,
        currency: shopRow.currency || 'NGN',
        address: shopRow.address
      },
      items: apparelItems,
      accessories
    };
  } catch (err: any) {
    console.error('getPublicShowroomStockAction error:', err);
    return { error: err.message || 'Failed to fetch public showroom stock' };
  }
}
