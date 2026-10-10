'use server';

import { createClient } from '@/lib/supabase/server';
import { FinishedGood, PosSale } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function getStockAction(shopId: string): Promise<FinishedGood[] | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('finished_goods').select('*').eq('shop_id', shopId).order('name', { ascending: true });
  if (error) return { error: error.message };
  return data.map(row => ({
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    size: row.size,
    quantity: row.quantity,
    price: row.price,
    sku: row.sku || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function updateStockPriceAction(id: string, price: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('finished_goods').update({ price, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/stock');
  return {};
}

export async function updateStockQuantityAction(id: string, quantity: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('finished_goods').update({ quantity, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/stock');
  return {};
}

export async function processSaleAction(
  shopId: string, 
  items: { goodId: string; quantity: number; priceAtSale: number; name: string; size: string }[], 
  paymentMethod: string, 
  cashierId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.priceAtSale), 0);
  const details = items.map(i => `${i.quantity}x ${i.name} (${i.size})`).join(', ');

  // Get or create Retail Walk-In customer
  let { data: retailCust } = await supabase.from('customers')
    .select('id').eq('shop_id', shopId).eq('whatsapp_number', '0000000001').eq('full_name', 'Retail Walk-In').maybeSingle();
    
  if (!retailCust) {
    // We'll need the org_id to insert a customer
    const { data: shopInfo } = await supabase.from('shops').select('org_id').eq('id', shopId).single();
    if (shopInfo) {
      const { data: newCust } = await supabase.from('customers').insert({
        shop_id: shopId,
        org_id: shopInfo.org_id,
        full_name: 'Retail Walk-In',
        whatsapp_number: '0000000001',
        gender: 'female' // generic fallback
      }).select('id').single();
      retailCust = newCust;
    }
  }

  const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
    shop_id: shopId,
    customer_id: retailCust?.id || null, // Will hit NOT NULL if it failed above, but we tried
    customer_name: 'Retail Walk-In',
    order_details: `POS Sale: ${details}`,
    total_bill: totalAmount,
    deposit_paid: totalAmount,
    status: 'Delivered',
    is_internal_batch: false, // Keep false so it counts as standard completed revenue
    payments: [{
      amount: totalAmount,
      method: paymentMethod,
      date: new Date().toISOString()
    }]
  }).select().single();
  
  if (orderError) return { error: orderError.message };
  
  // Deduct from stock
  for (const item of items) {
    const { data: existing } = await supabase.from('finished_goods').select('quantity').eq('id', item.goodId).single();
    if (existing) {
      await supabase.from('finished_goods').update({ quantity: Math.max(0, existing.quantity - item.quantity) }).eq('id', item.goodId);
    }
  }
  
  revalidatePath('/stock');
  return {};
}
