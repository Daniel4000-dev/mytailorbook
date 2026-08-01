import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/privacy', '/robots.txt', '/sitemap.xml', '/blog', '/features', '/pricing', '/portfolio-examples', '/about', '/offline'];
const PUBLIC_PREFIXES = ['/track/', '/receipt/', '/studio/', '/auth/', '/blog/'];

// The (marketing) route group's own pages — a logged-in visitor here gets
// bounced to /dashboard instead of a sales pitch for a product they
// already use. /blog and /privacy stay outside this list on purpose: they
// should stay readable while logged in, not redirect away.
const MARKETING_PATHS = ['/', '/features', '/pricing', '/about', '/portfolio-examples'];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Runs on every request before it reaches a page. This is the real
 * authentication gate — previously, an unauthenticated visitor could
 * still load /dashboard because the only check was a client-side
 * redirect (which runs after the page has already rendered once).
 */
export async function proxy(request: NextRequest) {
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
  const { pathname } = request.nextUrl;

  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(pathname);

  if (!user && !isPublicPath(pathname) && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && (isAuthPage || MARKETING_PATHS.includes(pathname))) {
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
