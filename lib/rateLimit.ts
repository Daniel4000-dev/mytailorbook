import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/** Best-effort caller IP for rate-limiting public, unauthenticated routes.
 *  Vercel sets x-forwarded-for; falls back to a fixed key locally so dev
 *  never crashes, just shares one bucket. */
export async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return 'unknown';
}

/** Sliding-window check backed by the rate_limit_hits table — counts hits
 *  for this key within the last `windowSeconds`, records this attempt if
 *  under `limit`. Opportunistically deletes this key's own stale rows
 *  first so the table never accumulates unbounded history. */
export async function checkRateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number }
): Promise<{ allowed: boolean }> {
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  await admin.from('rate_limit_hits').delete().eq('key', key).lt('created_at', windowStart);

  const { count } = await admin
    .from('rate_limit_hits')
    .select('id', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart);

  if ((count ?? 0) >= limit) return { allowed: false };

  await admin.from('rate_limit_hits').insert({ key });
  return { allowed: true };
}
