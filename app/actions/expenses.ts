'use server';

import { createClient } from '@/lib/supabase/server';
import { Expense } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function addExpense(data: Omit<Expense, 'id' | 'createdAt'>) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not authenticated');

  const { data: newExpense, error } = await supabase
    .from('expenses')
    .insert([
      {
        shop_id: data.shopId,
        order_id: data.orderId || null,
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: data.date,
        method: data.method,
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Add expense error:', error);
    throw new Error('Failed to add expense');
  }
  
  if (data.orderId) {
    revalidatePath(`/production/${data.orderId}`);
  }
  revalidatePath('/reconciliation');
  revalidatePath('/reports');
  revalidatePath('/dashboard');

  return {
    id: newExpense.id,
    shopId: newExpense.shop_id,
    orderId: newExpense.order_id,
    amount: newExpense.amount,
    category: newExpense.category,
    description: newExpense.description,
    date: newExpense.date,
    method: newExpense.method || data.method || 'cash',
    createdAt: newExpense.created_at,
  };
}

export async function getOrderExpenses(orderId: string): Promise<Expense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('order_id', orderId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Fetch expenses error:', error);
    return [];
  }

  return data.map(d => ({
    id: d.id,
    shopId: d.shop_id,
    orderId: d.order_id,
    amount: d.amount,
    category: d.category,
    description: d.description,
    date: d.date,
    createdAt: d.created_at,
  }));
}

export async function getExpensesByDate(shopId: string, date: string): Promise<Expense[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Match either exact date string or full timestamp range within the day
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59.999999`;

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('shop_id', shopId)
    .gte('date', startOfDay)
    .lte('date', endOfDay)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch expenses by date error:', error);
    return [];
  }
  return data.map((e: any) => ({
    id: e.id,
    shopId: e.shop_id,
    orderId: e.order_id,
    amount: e.amount,
    category: e.category,
    description: e.description,
    date: e.date ? (typeof e.date === 'string' && e.date.includes('T') ? e.date.split('T')[0] : e.date) : date,
    method: e.method || 'cash',
    createdAt: e.created_at,
  }));
}

export async function deleteExpense(id: string, shopId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not authenticated');

  const { data: deleted, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('shop_id', shopId)
    .select('order_id')
    .maybeSingle();

  if (error) {
    console.error('Delete expense error:', error);
    throw new Error('Failed to delete expense');
  }

  if (deleted?.order_id) {
    revalidatePath(`/production/${deleted.order_id}`);
  }
  revalidatePath('/reconciliation');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateExpense(id: string, shopId: string, data: Partial<Expense>) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not authenticated');

  const updatePayload: any = {};
  if (data.amount !== undefined) updatePayload.amount = data.amount;
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.date !== undefined) updatePayload.date = data.date;
  if (data.method !== undefined) updatePayload.method = data.method;
  if (data.orderId !== undefined) updatePayload.order_id = data.orderId || null;

  const { data: updated, error } = await supabase
    .from('expenses')
    .update(updatePayload)
    .eq('id', id)
    .eq('shop_id', shopId)
    .select()
    .single();

  if (error) {
    console.error('Update expense error:', error);
    throw new Error('Failed to update expense');
  }

  if (updated?.order_id) {
    revalidatePath(`/production/${updated.order_id}`);
  }
  if (data.orderId && data.orderId !== updated?.order_id) {
    revalidatePath(`/production/${data.orderId}`);
  }
  revalidatePath('/reconciliation');
  revalidatePath('/reports');
  revalidatePath('/dashboard');

  return {
    id: updated.id,
    shopId: updated.shop_id,
    orderId: updated.order_id,
    amount: updated.amount,
    category: updated.category,
    description: updated.description,
    date: updated.date,
    method: updated.method,
    createdAt: updated.created_at,
  };
}
