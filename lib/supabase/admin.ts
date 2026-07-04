import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin client — SERVER-SIDE ONLY. Uses the service_role key, which bypasses
 * every Row Level Security policy. Only ever call this from server actions,
 * and only for operations a normal user isn't allowed to do themselves
 * (e.g. creating a brand-new shop, or an Owner provisioning a staff account).
 *
 * The `server-only` import makes it a build error to accidentally import
 * this file from a client component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
