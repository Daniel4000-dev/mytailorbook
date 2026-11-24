import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES, isPublicPath, isAppPath, MARKETING_PATHS } from '@/lib/routes';

const CONFIG_ROOT_DOMAIN = APP_CONFIG.domain.replace(/^(dev\.app\.|app\.|dev\.)/, '');

// Keeps app.<domain> and the bare marketing domain each showing only their
// own half of the site. Dynamically adapts to whichever production domain
// is assigned in Vercel (e.g. mystitchbooks.com or mystitchbook.com) while
// leaving dev.app.* (staging) and localhost/preview deployments untouched.
function crossDomainRedirect(request: NextRequest): NextResponse | null {
  const rawHost = request.headers.get('host');
  const { pathname, search } = request.nextUrl;

  if (!rawHost) return null;
  const host = rawHost.replace(/:\d+$/, '');

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('dev.') ||
    host.startsWith('staging.') ||
    host.endsWith('.vercel.app')
  ) {
    return null;
  }

  // Derive the root and app domains directly from the incoming Vercel production host
  // (or fall back to CONFIG_ROOT_DOMAIN if needed).
  const rootDomain = host.replace(/^app\./, '') || CONFIG_ROOT_DOMAIN;
  const appDomain = `app.${rootDomain}`;

  if (host === rootDomain && isAppPath(pathname)) {
    return NextResponse.redirect(new URL(`https://${appDomain}${pathname}${search}`), 308);
  }
  if (host === appDomain && !isAppPath(pathname)) {
    return NextResponse.redirect(new URL(`https://${rootDomain}${pathname}${search}`), 308);
  }
  return null;
}

// Supabase's SSR client names its session cookie(s) `sb-<project-ref>-auth-token`
// (sometimes chunked into `.0`, `.1`, ...). No such cookie can only mean no
// session, full stop — so on a page that's public either way (nothing to
// protect, and nothing to redirect a logged-in visitor away from unless they
// actually have one), skip the network round-trip to Supabase's Auth API
// entirely rather than paying for a `getUser()` call whose answer is already
// known. This is the common case: first-time visitors, search/social
// traffic, and shared tracking/portfolio links almost never carry the
// cookie, and they're the overwhelming majority of marketing-page traffic.
function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
}

/**
 * Runs on every request before it reaches a page. This is the real
 * authentication gate — previously, an unauthenticated visitor could
 * still load /dashboard because the only check was a client-side
 * redirect (which runs after the page has already rendered once).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const domainRedirect = crossDomainRedirect(request);
  if (domainRedirect) return domainRedirect;

  const isPublic = isPublicPath(pathname) || pathname === ROUTES.home;

  if (isPublic && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Set a permanent parent-domain device marker cookie (`mtb_staff_device`, 10-year maxAge, never cleared on logout)
  // whenever a tailor or staff member uses the app on this device. This guarantees the same device is recognized
  // as a workshop device even if the tailor/staff logs out before opening a `/track/...` link.
  if (user) {
    const rawHost = request.headers.get('host')?.replace(/:\d+$/, '') || '';
    const isLocal = rawHost === 'localhost' || rawHost === '127.0.0.1';
    const rootDomain = rawHost.replace(/^(dev\.app\.|app\.|dev\.|staging\.)/, '');
    const domainOpt = isLocal || rawHost.endsWith('.vercel.app') ? {} : { domain: `.${rootDomain}` };
    const tenYears = 60 * 60 * 24 * 365 * 10;

    response.cookies.set('mtb_tailor_uid', user.id, {
      path: '/',
      maxAge: tenYears,
      sameSite: 'lax',
      ...domainOpt,
    });
    response.cookies.set('mtb_staff_device', '1', {
      path: '/',
      maxAge: tenYears,
      sameSite: 'lax',
      ...domainOpt,
    });
  }

  // Deliberately excludes /reset-password — a logged-in user following a
  // password-reset link should still be able to reset it, not get bounced
  // to /dashboard before they can.
  const isAuthPage = ([ROUTES.login, ROUTES.signup, ROUTES.forgotPassword] as readonly string[]).includes(pathname);

  if (!user && !isPublicPath(pathname) && pathname !== ROUTES.home) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.search = ''; // Clear query params (like OAuth codes) so they don't leak into the URL
    const redirectResponse = NextResponse.redirect(url);
    // Crucial: preserve any refreshed session cookies on the redirect
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        redirectResponse.headers.append('set-cookie', value);
      }
    });
    return redirectResponse;
  }

  if (user && (isAuthPage || (MARKETING_PATHS as readonly string[]).includes(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.dashboard;
    url.search = ''; // Clear query params (like OAuth codes) so they don't leak into the URL
    const redirectResponse = NextResponse.redirect(url);
    // Crucial: preserve any refreshed session cookies on the redirect
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        redirectResponse.headers.append('set-cookie', value);
      }
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon, manifest, images/icons folders, apple-touch-icon
     * - app-icon-light.ico / app-icon-dark.ico (the actual favicon files
     *   this app serves — named app-icon-*, not favicon.ico, so they need
     *   their own exclusion; without it, a logged-out browser's favicon
     *   request gets 307-redirected to /login instead of the icon, and
     *   Chrome silently falls back to whatever it last cached)
     * - api/ (API routes handle their own auth — e.g. the cron keep-alive
     *   endpoint is called by Vercel's scheduler with no browser session,
     *   and would otherwise get redirected to /login before it ever ran)
     * - google*.html (Search Console site-verification files in public/ —
     *   Googlebot has no session cookie and must see the raw file, not a
     *   /login redirect)
     */
    '/((?!_next/static|_next/image|favicon.ico|app-icon-light.ico|app-icon-dark.ico|apple-touch-icon.png|images/|icons/|models/|manifest.webmanifest|api/|google[a-z0-9]+\\.html).*)',
  ],
};
