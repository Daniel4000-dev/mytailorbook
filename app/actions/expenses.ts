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
  revalidatePath('/dashboard');

  return {
    id: newExpense.id,
    shopId: newExpense.shop_id,
    orderId: newExpense.order_id,
    amount: newExpense.amount,
    category: newExpense.category,
    description: newExpense.description,
    date: newExpense.date,
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

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('shop_id', shopId)
    .eq('date', date)
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
    date: e.date,
    method: e.method,
    createdAt: e.created_at,
  }));
}

export async function deleteExpense(id: string, shopId: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('shop_id', shopId);

  if (error) {
    console.error('Delete expense error:', error);
    throw new Error('Failed to delete expense');
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
