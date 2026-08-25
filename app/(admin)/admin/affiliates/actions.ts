'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';

/** Server Actions are independently callable endpoints regardless of
 *  which UI links to them — requireAdmin() here is the actual boundary,
 *  not the fact that only /admin pages render a link to this action. */
export async function createAffiliate(name: string, code: string): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmedName = name.trim();
  const normalizedCode = code.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!trimmedName) return { error: 'Name is required' };
  if (!normalizedCode) return { error: 'Code must contain letters, numbers, or hyphens' };

  const admin = createAdminClient();
  const { error } = await admin.from('affiliates').insert({ name: trimmedName, code: normalizedCode });
  if (error) {
    return { error: error.code === '23505' ? 'That code is already in use' : error.message };
  }

  revalidatePath('/admin/affiliates');
  return {};
}

export async function toggleAffiliateActive(id: string, active: boolean): Promise<{ error?: string }> {
  await requireAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from('affiliates').update({ active }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/affiliates');
  return {};
}

export async function renameAffiliate(id: string, name: string): Promise<{ error?: string }> {
  await requireAdmin();

  const trimmed = name.trim();
  if (!trimmed) return { error: 'Name is required' };

  const admin = createAdminClient();
  const { error } = await admin.from('affiliates').update({ name: trimmed }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/affiliates');
  revalidatePath('/admin');
  return {};
}
