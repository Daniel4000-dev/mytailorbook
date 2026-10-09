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
