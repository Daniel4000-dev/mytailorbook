import 'server-only';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

  if (!admin) notFound();

  return { userId: user.id, name: admin.name as string | null, email: user.email ?? null };
}
