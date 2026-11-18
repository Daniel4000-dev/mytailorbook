import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CATALOGUE_PHOTO_PURGE_GRACE_DAYS } from '@/lib/subscription';

const PENDING_EXPIRY_DAYS = 10;

/**
 * 1. Deletes any style-gallery photo submission still `pending` after 10 days.
 * 2. Purges catalogue photos for shops whose subscription pause ended and have been on Free
 *    past the 14-day catalogue grace window (freeing server storage, while preserving album titles/metadata).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - PENDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 1. Pending gallery photo submissions cleanup
  let deletedGallery = 0;
  const { data: expired, error: selectError } = await admin
    .from('style_photo_submissions')
    .select('id, storage_path')
    .eq('status', 'pending')
    .lt('created_at', cutoff);

  if (!selectError && expired && expired.length > 0) {
    const paths = expired.map((row) => row.storage_path);
    await admin.storage.from('style-photos').remove(paths);
    await admin
      .from('style_photo_submissions')
      .delete()
      .in('id', expired.map((row) => row.id));
    deletedGallery = expired.length;
  }

  // 2. Catalogue photos purge for Free shops past the 14-day purge grace window
  let purgedCataloguePhotos = 0;
  const purgeCutoff = new Date(Date.now() - CATALOGUE_PHOTO_PURGE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: shopsToPurge } = await admin
    .from('shops')
    .select('id')
    .eq('subscription_status', 'free')
    .not('catalogue_photos_purge_warning_sent_at', 'is', null)
    .lte('catalogue_photos_purge_warning_sent_at', purgeCutoff)
    .is('catalogue_photos_purged_at', null);

  if (shopsToPurge && shopsToPurge.length > 0) {
    for (const shop of shopsToPurge) {
      const { data: catalogues } = await admin
        .from('style_catalogues')
        .select('id')
        .eq('shop_id', shop.id);

      if (catalogues && catalogues.length > 0) {
        const catIds = catalogues.map((c) => c.id);
        const { data: photos } = await admin
          .from('style_catalogue_photos')
          .select('id, image_url')
          .in('catalogue_id', catIds);

        if (photos && photos.length > 0) {
          const storagePaths: string[] = [];
          for (const p of photos) {
            try {
              const urlParts = p.image_url.split('/portfolio-photos/');
              if (urlParts.length > 1) {
                storagePaths.push(decodeURIComponent(urlParts[1]));
              }
            } catch (e) {
              console.warn('Path extract error:', e);
            }
          }

          if (storagePaths.length > 0) {
            await admin.storage.from('portfolio-photos').remove(storagePaths);
          }

          await admin
            .from('style_catalogue_photos')
            .delete()
            .in('id', photos.map((p) => p.id));

          purgedCataloguePhotos += photos.length;
        }
      }

      await admin
        .from('shops')
        .update({ catalogue_photos_purged_at: new Date().toISOString() })
        .eq('id', shop.id);
    }
  }

  return NextResponse.json({
    ok: true,
    deletedGallery,
    purgedCataloguePhotos,
    shopsPurged: shopsToPurge?.length ?? 0,
  });
}
