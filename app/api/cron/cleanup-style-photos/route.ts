import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PENDING_EXPIRY_DAYS = 10;

/**
 * Deletes any style-gallery photo submission still `pending` (never
 * approved by the Owner) after 10 days — both the DB row and the actual
 * file in Storage, so the bucket doesn't quietly accumulate never-approved
 * uploads forever. Runs once a day (see vercel.json), same CRON_SECRET
 * gate as the keepalive job.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - PENDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error: selectError } = await admin
    .from('style_photo_submissions')
    .select('id, storage_path')
    .eq('status', 'pending')
    .lt('created_at', cutoff);

  if (selectError) {
    return NextResponse.json({ ok: false, error: selectError.message }, { status: 500 });
  }
  if (!expired || expired.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const paths = expired.map((row) => row.storage_path);
  await admin.storage.from('style-photos').remove(paths);

  const { error: deleteError } = await admin
    .from('style_photo_submissions')
    .delete()
    .in('id', expired.map((row) => row.id));

  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: expired.length });
}
