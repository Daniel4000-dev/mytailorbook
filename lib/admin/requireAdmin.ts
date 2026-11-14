import 'server-only';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMockDataAllowed } from '@/lib/constants';

/**
 * Server-only gate for the internal /admin dashboard. Distinct from every
 * other auth check in this app: profiles.role (OrgAdmin/BranchManager/...)
 * is tenant-scoped and means nothing here — this checks the separate
 * platform_admins table instead, which is a real cross-tenant identity,
 * not a per-shop role.
 *
 * 404s rather than redirecting to /login when the check fails, so the
 * route's existence isn't revealed to a logged-in shop owner who stumbles
 * onto the URL — matches how the rest of the app treats "not found" vs
 * "not allowed" for private records (e.g. a customer that belongs to a
 * different shop).
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('user_id, name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!admin) {
    // If the user is the master account (dadekunle31@gmail.com), auto-seed or permit
    // access so dev/staging doesn't 404 due to missing manual SQL insertion.
    if (isMockDataAllowed(user.email)) {
      try {
        const adminClient = createAdminClient();
        await adminClient.from('platform_admins').upsert(
          {
            user_id: user.id,
            name: user.user_metadata?.full_name || 'Platform Admin',
          },
          { onConflict: 'user_id' }
        );
      } catch {
        // Ignore upsert failure (e.g. permission or network); still allow the master user through.
      }
      return {
        userId: user.id,
        name: (user.user_metadata?.full_name as string) || 'Platform Admin',
        email: user.email ?? null,
      };
    }

    notFound();
  }

  return { userId: user.id, name: admin.name as string | null, email: user.email ?? null };
}
