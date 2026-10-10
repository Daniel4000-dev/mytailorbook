'use server';

import { createClient } from '@/lib/supabase/server';
import type { Payment, PaymentMethod } from '@/lib/types';
import { isOwnerLikeRole } from '@/lib/types';

export async function addPayment(orderId: string, amount: number, method: PaymentMethod, referenceNote?: string) {
  const supabase = await createClient();

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase.from('profiles').select('org_id, shop_id').eq('id', userData.user.id).single();
  if (!profile?.shop_id) return { error: 'No active shop context' };

  const { data, error } = await supabase
    .from('payments')
    .insert({
      shop_id: profile.shop_id,
      order_id: orderId,
      amount,
      method,
      reference_note: referenceNote || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding payment:', error);
    return { error: 'Failed to record payment' };
  }
  
  // Update the orders table to sync amount_paid for backwards compatibility/simplicity
  const { data: orderData } = await supabase.from('orders').select('amount_paid').eq('id', orderId).single();
  const currentPaid = orderData?.amount_paid || 0;
  
  await supabase
    .from('orders')
    .update({ amount_paid: currentPaid + amount })
    .eq('id', orderId);

  return { data };
}

export async function getOrderPayments(orderId: string): Promise<{ data: Payment[] | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return { data: null, error: 'Failed to fetch payments' };
  }

  return { data };
}

export async function getPaymentsByDate(shopId: string, date: string): Promise<{ data: Payment[] | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (!isOwnerLikeRole(profile.role) && profile.role !== 'Accountant')) {
      throw new Error('Not authorized to view shop financials');
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('shop_id', shopId)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getPaymentsByDate error:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Payment[] };
  } catch (err: any) {
    console.error('getPaymentsByDate error:', err);
    return { data: null, error: err.message };
  }
}
