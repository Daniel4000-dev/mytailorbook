'use server';

import { createClient } from '@/lib/supabase/server';
import { SizeChart } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function getSizeChartsAction(shopId: string): Promise<SizeChart[] | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('size_charts').select('*').eq('shop_id', shopId).order('name', { ascending: true });
  if (error) return { error: error.message };
  return data.map(row => ({
    id: row.id,
    shopId: row.shop_id,
    name: row.name,
    measurements: row.measurements,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function createSizeChartAction(shopId: string, name: string, measurements: Record<string, string>): Promise<{ id?: string, error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('size_charts').insert({
    shop_id: shopId,
    name,
    measurements
  }).select('id').single();
  if (error) return { error: error.message };
  revalidatePath('/settings/size-charts');
  return { id: data.id };
}

export async function updateSizeChartAction(id: string, name: string, measurements: Record<string, string>): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('size_charts').update({
    name,
    measurements,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/settings/size-charts');
  return {};
}

export async function deleteSizeChartAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('size_charts').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/settings/size-charts');
  return {};
}
