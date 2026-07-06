import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Keeps the Supabase free-tier project from auto-pausing after 7 days of
 * inactivity. Runs once a day (see vercel.json) — that's a wide safety
 * margin under the 7-day threshold, and the query itself is the cheapest
 * possible read (a single row, no joins), so it costs Supabase nothing
 * meaningful even run daily indefinitely.
 *
 * Locked to Vercel's own cron trigger via CRON_SECRET so this endpoint
 * can't be spammed by anyone who finds the URL — Vercel automatically
 * sends this as a Bearer token on scheduled invocations.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('shops').select('id').limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
}
