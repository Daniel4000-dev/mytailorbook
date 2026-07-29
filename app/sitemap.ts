import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { APP_CONFIG } from '@/lib/config';

/** Dynamic — the only real indexable content here is each shop's public
 *  portfolio, and that's tenant data, not something a static file can list.
 *  Only shops with at least one real garment photo are included: a
 *  freshly-created shop with an empty portfolio isn't worth a search
 *  engine's time, and would just read as a thin/empty page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = `https://${APP_CONFIG.domain}`;
  const admin = createAdminClient();

  const { data: orders } = await admin.from('orders').select('shop_id, images');

  const shopLastPhoto = new Map<string, string>();
  for (const o of orders || []) {
    const images = (o.images || []) as { uploadedAt: string }[];
    if (images.length === 0) continue;
    const latest = images.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b)).uploadedAt;
    const existing = shopLastPhoto.get(o.shop_id);
    if (!existing || latest > existing) shopLastPhoto.set(o.shop_id, latest);
  }

  return [
    {
      url: `${base}/privacy`,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    ...Array.from(shopLastPhoto.entries()).map(([shopId, lastPhotoAt]) => ({
      url: `${base}/studio/${shopId}`,
      lastModified: new Date(lastPhotoAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
