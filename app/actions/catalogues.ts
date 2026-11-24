'use server';

import { createClient } from '@/lib/supabase/server';
import { StyleCatalogue, StyleCataloguePhoto } from '@/lib/types';
import { getOrgSubscriptionStatus, isPremiumSubscription, isPausedSubscription } from '@/lib/subscription';
import { revalidatePath } from 'next/cache';

export async function getCataloguesAction(shopId: string): Promise<StyleCatalogue[]> {
  try {
    const supabase = await createClient();

    const { data: catRows, error: catError } = await supabase
      .from('style_catalogues')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });

    if (catError) {
      console.warn('style_catalogues query warning:', catError.message);
      return [];
    }
    if (!catRows || catRows.length === 0) return [];

    const catIds = catRows.map(c => c.id);

    const { data: photoRows, error: photoError } = await supabase
      .from('style_catalogue_photos')
      .select('*')
      .in('catalogue_id', catIds)
      .order('created_at', { ascending: false });

    if (photoError) {
      console.warn('style_catalogue_photos query warning:', photoError.message);
    }

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
  } catch (err: any) {
    console.warn('Failed to fetch catalogues:', err?.message);
    return [];
  }
}

export async function createCatalogueAction(shopId: string, title: string): Promise<string> {
  const supabase = await createClient();
  const subStatus = await getOrgSubscriptionStatus(supabase, shopId);

  if (isPausedSubscription(subStatus)) {
    throw new Error('Your workshop subscription is currently paused. Resume your subscription to create new albums.');
  }

  if (!isPremiumSubscription(subStatus)) {
    throw new Error('Style Catalogues and lookbooks are strictly a Premium feature. Upgrade to create curated customer albums.');
  }

  const { data, error } = await supabase
    .from('style_catalogues')
    .insert({ shop_id: shopId, title: title.trim() })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateCatalogueAction(catalogueId: string, title: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('style_catalogues')
    .update({ title: title.trim() })
    .eq('id', catalogueId);
  if (error) throw new Error(error.message);
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

  const { data: cat, error: catError } = await supabase
    .from('style_catalogues')
    .select('shop_id')
    .eq('id', catalogueId)
    .single();

  if (catError || !cat?.shop_id) {
    throw new Error('Album not found');
  }

  const subStatus = await getOrgSubscriptionStatus(supabase, cat.shop_id);

  if (isPausedSubscription(subStatus)) {
    throw new Error('Your subscription is currently paused. Resume your subscription to upload new lookbook photos.');
  }

  if (!isPremiumSubscription(subStatus)) {
    throw new Error('Uploading style photos to lookbooks requires an active Premium plan.');
  }

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
  try {
    if (!slug || !slug.trim()) return [];
    const cleanParam = slug.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam);
    const supabase = await createClient();
    const { data: shopRow, error: shopErr } = await supabase
      .from('shops')
      .select('id')
      .eq(isUuid ? 'id' : 'slug', cleanParam)
      .maybeSingle();

    if (shopErr || !shopRow) return [];

    return getCataloguesAction(shopRow.id);
  } catch (err: any) {
    console.warn('Failed to fetch public catalogues:', err?.message);
    return [];
  }
}
