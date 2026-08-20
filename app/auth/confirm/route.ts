import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Where every "click the link in your email" flow AND the Google OAuth
 * redirect land — signup confirmation, password-reset, and Google sign-in
 * all funnel through here, just with different params:
 *   - Email links carry `token_hash` + `type` (verified via verifyOtp).
 *   - Google OAuth carries `code` (verified via exchangeCodeForSession).
 *
 * Either way, on success this sets a real session cookie via our RLS-aware
 * server client — which is what lets proxy.ts's route protection recognize
 * the user on the very next request.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  let next = searchParams.get('next') ?? '/dashboard';

  const supabase = await createClient();

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Google sign-in always requests /onboarding since OAuth gives no
      // chance to ask for a shop name first — but a returning user already
      // has a profiles row, so send them straight to /dashboard instead of
      // flashing the onboarding form before the client-side guard bounces
      // them off it.
      if (next === '/onboarding' && data.user) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();
        if (profile) next = '/dashboard';
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
