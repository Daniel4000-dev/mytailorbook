import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Request-scoped server client — used in Server Actions and Server Components.
 * Reads the logged-in user's session from cookies, so every query runs AS
 * that user: Row Level Security policies apply automatically (Postgres's
 * `auth.uid()` resolves to whoever is actually logged in for this request).
 * This is different from the admin client, which intentionally ignores RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !key) {
    throw new Error('Missing Supabase public environment variables');
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies — safe to
            // ignore as long as session refresh also happens in middleware
            // (not needed yet at our current scale/session lifetime).
          }
        },
      },
    }
  );
}
