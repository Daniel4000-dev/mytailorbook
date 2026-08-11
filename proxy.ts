import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/privacy', '/terms', '/robots.txt', '/sitemap.xml', '/llms.txt', '/blog', '/features', '/pricing', '/portfolio-examples', '/about', '/contact', '/offline'];
const PUBLIC_PREFIXES = ['/track/', '/receipt/', '/studio/', '/auth/', '/blog/'];

// The (marketing) route group's own pages — a logged-in visitor here gets
// bounced to /dashboard instead of a sales pitch for a product they
// already use. /blog, /privacy, and /terms stay outside this list on
// purpose: they should stay readable while logged in, not redirect away.
const MARKETING_PATHS = ['/', '/features', '/pricing', '/about', '/portfolio-examples'];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
  const isPublic = isPublicPath(pathname) || pathname === '/';

  if (isPublic && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(pathname);

  if (!user && !isPublicPath(pathname) && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
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

  if (user && (isAuthPage || MARKETING_PATHS.includes(pathname))) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
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
     */
    '/((?!_next/static|_next/image|favicon.ico|app-icon-light.ico|app-icon-dark.ico|apple-touch-icon.png|images/|icons/|manifest.webmanifest|api/).*)',
  ],
};
