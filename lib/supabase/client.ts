import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser client — used in 'use client' components/contexts.
 * Reads the ANON key, which is safe to expose: it can only ever do what
 * our Row Level Security policies allow for the currently logged-in user.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
