import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { checkPublicRouteLimit } from '@/lib/ratelimit';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/privacy'];
const PUBLIC_PREFIXES = ['/track/', '/receipt/', '/auth/', '/studio/'];

// These three are the ones backed by a service-role client that bypasses
// RLS, scoped only by a guessable UUID — the actual enumeration/scraping
// risk. /auth/ (email confirmation links) is excluded on purpose since
// those are single-use, time-limited tokens, not an open lookup surface.
const RATE_LIMITED_PREFIXES = ['/track/', '/receipt/', '/studio/'];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Runs on every request before it reaches a page. This is the real
 * authentication gate — previously, an unauthenticated visitor could
 * still load /dashboard because the only check was a client-side
 * redirect (which runs after the page has already rendered once).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (RATE_LIMITED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const { allowed } = await checkPublicRouteLimit(getClientIp(request));
    if (!allowed) {
      return new NextResponse('Too many requests. Please try again in a minute.', { status: 429 });
    }
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
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon, manifest, images/icons folders, apple-touch-icon
     * - api/ (API routes handle their own auth — e.g. the cron keep-alive
     *   endpoint is called by Vercel's scheduler with no browser session,
     *   and would otherwise get redirected to /login before it ever ran)
     */
    '/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|images/|icons/|manifest.webmanifest|api/).*)',
  ],
};
