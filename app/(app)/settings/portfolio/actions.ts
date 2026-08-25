'use server';

import { createClient } from '@/lib/supabase/server';

export type PhotoAngle = 'front' | 'back' | 'side' | 'detail';

export interface PortfolioPoolPhoto {
  id: string;
  imageUrl: string;
  source: 'auto' | 'manual';
  createdAt: string;
  /** Which outfit(s) this photo is currently used in, if any — lets the
   *  pool grid show "already used" instead of letting a tailor build two
   *  outfits from the same shot without realizing. */
  usedInOutfitIds: string[];
}

export interface PortfolioOutfitPhoto {
  photoId: string;
  imageUrl: string;
  kind: 'display' | 'story';
  angle: PhotoAngle | null;
  sortOrder: number;
}

export interface PortfolioOutfit {
  id: string;
  title: string | null;
  storyModeEnabled: boolean;
  storyCaption: string | null;
  sortOrder: number;
  createdAt: string;
  photos: PortfolioOutfitPhoto[];
}

/** Scans recent Delivered orders for this shop and adds any photo not
 *  already in the pool — source='auto', deduped on (shop_id, image_url)
 *  by the DB. Landing here is not the same as publishing: these sit
 *  unused until a tailor builds an outfit from them (see
 *  app/(app)/settings/portfolio/page.tsx's empty-pool copy). Only
 *  Delivered-stage shots qualify, not in-progress ones — a tailor who
 *  wants a making-of story adds those deliberately via story mode
 *  instead of having them appear automatically. */
export async function syncAutoPortfolioPhotosAction(shopId: string): Promise<void> {
  const supabase = await createClient();

  const { data: orderRows, error: ordersError } = await supabase
    .from('orders')
    .select('id, images')
    .eq('shop_id', shopId)
    .eq('status', 'Delivered')
    .order('created_at', { ascending: false })
    .limit(300);
  if (ordersError) throw new Error(ordersError.message);

  const rows: { shop_id: string; image_url: string; source: 'auto'; source_order_id: string }[] = [];
  for (const order of orderRows || []) {
    for (const photo of (order.images || []) as { url: string; stage: string }[]) {
      if (photo.stage !== 'Delivered') continue;
      rows.push({ shop_id: shopId, image_url: photo.url, source: 'auto', source_order_id: order.id });
    }
  }
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('portfolio_photos')
    .upsert(rows, { onConflict: 'shop_id,image_url', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function addManualPortfolioPhotoAction(shopId: string, imageUrl: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('portfolio_photos')
    .upsert({ shop_id: shopId, image_url: imageUrl, source: 'manual' }, { onConflict: 'shop_id,image_url', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function deletePortfolioPhotoAction(photoId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('portfolio_photos').delete().eq('id', photoId);
  if (error) throw new Error(error.message);
}

export async function getPortfolioPoolAction(shopId: string): Promise<PortfolioPoolPhoto[]> {
  const supabase = await createClient();
  const [{ data: photoRows, error: photosError }, { data: usageRows, error: usageError }] = await Promise.all([
    supabase.from('portfolio_photos').select('id, image_url, source, created_at').eq('shop_id', shopId).order('created_at', { ascending: false }),
    supabase
      .from('portfolio_outfit_photos')
      .select('photo_id, outfit_id, portfolio_outfits!inner(shop_id)')
      .eq('portfolio_outfits.shop_id', shopId),
  ]);
  if (photosError) throw new Error(photosError.message);
  if (usageError) throw new Error(usageError.message);

  const usageByPhoto = new Map<string, string[]>();
  for (const row of usageRows || []) {
    const list = usageByPhoto.get(row.photo_id) ?? [];
    list.push(row.outfit_id);
    usageByPhoto.set(row.photo_id, list);
  }

  return (photoRows || []).map((p) => ({
    id: p.id,
    imageUrl: p.image_url,
    source: p.source,
    createdAt: p.created_at,
    usedInOutfitIds: usageByPhoto.get(p.id) ?? [],
  }));
}

export async function getPortfolioOutfitsAction(shopId: string): Promise<PortfolioOutfit[]> {
  const supabase = await createClient();
  const { data: outfitRows, error: outfitsError } = await supabase
    .from('portfolio_outfits')
    .select('id, title, story_mode_enabled, story_caption, sort_order, created_at')
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true });
  if (outfitsError) throw new Error(outfitsError.message);
  if (!outfitRows || outfitRows.length === 0) return [];

  const outfitIds = outfitRows.map((o) => o.id);
  const { data: photoRows, error: photosError } = await supabase
    .from('portfolio_outfit_photos')
    .select('outfit_id, kind, angle, sort_order, portfolio_photos!inner(id, image_url)')
    .in('outfit_id', outfitIds)
    .order('sort_order', { ascending: true });
  if (photosError) throw new Error(photosError.message);

  const photosByOutfit = new Map<string, PortfolioOutfitPhoto[]>();
  for (const row of photoRows || []) {
    const list = photosByOutfit.get(row.outfit_id) ?? [];
    const photo = row.portfolio_photos as unknown as { id: string; image_url: string };
    list.push({ photoId: photo.id, imageUrl: photo.image_url, kind: row.kind, angle: row.angle, sortOrder: row.sort_order });
    photosByOutfit.set(row.outfit_id, list);
  }

  return outfitRows.map((o) => ({
    id: o.id,
    title: o.title,
    storyModeEnabled: o.story_mode_enabled,
    storyCaption: o.story_caption,
    sortOrder: o.sort_order,
    createdAt: o.created_at,
    photos: photosByOutfit.get(o.id) ?? [],
  }));
}

export interface OutfitPhotoInput {
  photoId: string;
  kind: 'display' | 'story';
  angle: PhotoAngle | null;
  sortOrder: number;
}

export interface SaveOutfitInput {
  shopId: string;
  title: string;
  storyModeEnabled: boolean;
  storyCaption: string;
  photos: OutfitPhotoInput[];
}

/** Creating an outfit *is* the publish action — no separate approval
 *  step, and no way for a half-built outfit to leak onto the public page
 *  since it doesn't exist as a row until this runs. */
export async function createOutfitAction(input: SaveOutfitInput): Promise<{ error?: string }> {
  if (input.photos.filter((p) => p.kind === 'display').length === 0) {
    return { error: 'Add at least one display photo' };
  }

  const supabase = await createClient();
  const { data: outfit, error: outfitError } = await supabase
    .from('portfolio_outfits')
    .insert({
      shop_id: input.shopId,
      title: input.title.trim() || null,
      story_mode_enabled: input.storyModeEnabled,
      story_caption: input.storyCaption.trim() || null,
    })
    .select('id')
    .single();
  if (outfitError || !outfit) return { error: outfitError?.message || 'Could not create outfit' };

  const { error: photosError } = await supabase.from('portfolio_outfit_photos').insert(
    input.photos.map((p) => ({
      outfit_id: outfit.id,
      photo_id: p.photoId,
      kind: p.kind,
      angle: p.kind === 'display' ? p.angle : null,
      sort_order: p.sortOrder,
    }))
  );
  if (photosError) {
    await supabase.from('portfolio_outfits').delete().eq('id', outfit.id);
    return { error: photosError.message };
  }

  return {};
}

export async function updateOutfitAction(outfitId: string, input: Omit<SaveOutfitInput, 'shopId'>): Promise<{ error?: string }> {
  if (input.photos.filter((p) => p.kind === 'display').length === 0) {
    return { error: 'Add at least one display photo' };
  }

  const supabase = await createClient();
  const { error: outfitError } = await supabase
    .from('portfolio_outfits')
    .update({
      title: input.title.trim() || null,
      story_mode_enabled: input.storyModeEnabled,
      story_caption: input.storyCaption.trim() || null,
    })
    .eq('id', outfitId);
  if (outfitError) return { error: outfitError.message };

  // Simplest correct approach for a small per-outfit photo set: replace
  // the join rows wholesale rather than diffing — an outfit rarely has
  // more than a handful of photos, so this isn't a real cost, and it
  // avoids a whole class of "stale leftover row" bugs from a partial diff.
  const { error: deleteError } = await supabase.from('portfolio_outfit_photos').delete().eq('outfit_id', outfitId);
  if (deleteError) return { error: deleteError.message };

  const { error: photosError } = await supabase.from('portfolio_outfit_photos').insert(
    input.photos.map((p) => ({
      outfit_id: outfitId,
      photo_id: p.photoId,
      kind: p.kind,
      angle: p.kind === 'display' ? p.angle : null,
      sort_order: p.sortOrder,
    }))
  );
  if (photosError) return { error: photosError.message };

  return {};
}

export async function deleteOutfitAction(outfitId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('portfolio_outfits').delete().eq('id', outfitId);
  if (error) throw new Error(error.message);
}
