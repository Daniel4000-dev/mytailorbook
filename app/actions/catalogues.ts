'use server';

import { createClient } from '@/lib/supabase/server';
import { StyleCatalogue, StyleCataloguePhoto } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function getCataloguesAction(shopId: string): Promise<StyleCatalogue[]> {
  const supabase = await createClient();

  const { data: catRows, error: catError } = await supabase
    .from('style_catalogues')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true });

  if (catError) throw new Error(catError.message);
  if (!catRows || catRows.length === 0) return [];

  const catIds = catRows.map(c => c.id);

  const { data: photoRows, error: photoError } = await supabase
    .from('style_catalogue_photos')
    .select('*')
    .in('catalogue_id', catIds)
    .order('created_at', { ascending: false });

  if (photoError) throw new Error(photoError.message);

  const photosByCat = new Map<string, StyleCataloguePhoto[]>();
  for (const row of photoRows || []) {
    const list = photosByCat.get(row.catalogue_id) ?? [];
    list.push({
      id: row.id,
      catalogueId: row.catalogue_id,
      imageUrl: row.image_url,
      createdAt: row.created_at,
    });
    photosByCat.set(row.catalogue_id, list);
  }

  return catRows.map(row => ({
    id: row.id,
    shopId: row.shop_id,
    title: row.title,
    createdAt: row.created_at,
    photos: photosByCat.get(row.id) ?? [],
  }));
}

export async function createCatalogueAction(shopId: string, title: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('style_catalogues')
    .insert({ shop_id: shopId, title: title.trim() })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteCatalogueAction(catalogueId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('style_catalogues')
    .delete()
    .eq('id', catalogueId);
  if (error) throw new Error(error.message);
}

export async function addCataloguePhotoAction(catalogueId: string, imageUrl: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('style_catalogue_photos')
    .insert({ catalogue_id: catalogueId, image_url: imageUrl });
  if (error) throw new Error(error.message);
}

export async function deleteCataloguePhotoAction(photoId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('style_catalogue_photos')
    .delete()
    .eq('id', photoId);
  if (error) throw new Error(error.message);
}

export async function getPublicCataloguesAction(slug: string): Promise<StyleCatalogue[]> {
  const supabase = await createClient();
  const { data: shopRow, error: shopErr } = await supabase
    .from('shops')
    .select('id')
    .eq('slug', slug)
    .single();
    
  if (shopErr || !shopRow) return [];
  
  return getCataloguesAction(shopRow.id);
}
