import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser client — used in 'use client' components/contexts.
 * Reads the publishable/anon key, which is safe to expose: it can only ever do what
 * our Row Level Security policies allow for the currently logged-in user.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!url || !key) {
    throw new Error('Missing Supabase public environment variables');
  }

  return createBrowserClient(url, key);
}
