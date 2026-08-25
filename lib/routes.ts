/**
 * Single source of truth for every route path in the app. Anything that
 * needs to link to, redirect to, or classify a route should import from
 * here instead of writing the path as a string literal.
 *
 * This file exists because the same route lists used to be hand-copied in
 * three different places (proxy.ts, app/sitemap.ts, app/robots.ts) with
 * three different sets of subtle rules, plus ~90 more `href`/`router.push`
 * string literals scattered across app/ and components/. That duplication
 * is exactly what caused real incidents: a stale robots.txt copy blocking
 * Google from indexing the whole site, and a portfolio page URL almost
 * colliding with the marketing /portfolio-examples page. See the "Blast
 * radius" notes below before changing which list a route belongs to.
 *
 * ---- Blast radius — what each list actually controls ----
 *
 * ROUTES            — the actual path strings / dynamic-path builders.
 *                      Consumed everywhere. Renaming a value here changes
 *                      every link/redirect that uses it in one place — but
 *                      also means the on-disk route (the folder under
 *                      app/) must be renamed to match, or every consumer
 *                      404s.
 *
 * PUBLIC_PATHS       — proxy.ts: pages an unauthenticated visitor may load
 * PUBLIC_PREFIXES      without being bounced to /login. Missing a route
 *                      from here that doesn't need auth = visitors get
 *                      wrongly redirected to /login. Adding a route here
 *                      that DOES need auth = it leaks to logged-out users.
 *
 * MARKETING_PATHS    — proxy.ts: pages a *logged-in* visitor gets bounced
 *                      away from (to /dashboard) since they're sales pitch
 *                      pages for a product that visitor already uses.
 *                      /blog, /privacy, /terms are deliberately NOT in this
 *                      list — they should stay readable while logged in.
 *
 * AUTH_PAGES         — proxy.ts + app.<domain> split: the auth flow pages.
 *                      Public (no session required) but still count as
 *                      "app-side" for the marketing/app domain split, and
 *                      as the "bounce logged-in users away" set alongside
 *                      MARKETING_PATHS.
 *
 * APP_PREFIXES       — proxy.ts: which paths belong on app.<domain> rather
 *                      than the bare marketing domain. A route missing
 *                      from here that's actually part of the authenticated
 *                      app = it gets redirected OFF the app domain and
 *                      back to marketing, breaking navigation. A marketing
 *                      route wrongly added here = visitors get redirected
 *                      to app.<domain> for a page that should stay on the
 *                      main domain.
 *
 * SEARCH_DISALLOW    — app/robots.ts: tells search/AI crawlers not to
 *                      index a path. This is an SEO/privacy concern,
 *                      distinct from auth-gating — e.g. /track/ and
 *                      /receipt/ are public-by-link (no login needed) but
 *                      still excluded here since they're per-customer
 *                      pages that shouldn't show up in search results.
 *                      Wrongly adding a real public page here silently
 *                      hides it from Google — this exact mistake cost this
 *                      project real indexing time in August 2026.
 *
 * When adding a brand-new page: add its path to ROUTES first, then decide
 * deliberately which of the lists above it belongs in — don't assume; a
 * page can be public without being marketing, or app-side without needing
 * the APP_PREFIXES redirect (auth pages are the example of that).
 */

export const ROUTES = {
  // ---- Marketing / public (bare domain) ----
  home: '/',
  features: '/features',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',
  blog: '/blog',
  blogPost: (slug: string) => `/blog/${slug}`,
  portfolioExamples: '/portfolio-examples',
  privacy: '/privacy',
  terms: '/terms',
  offline: '/offline',

  // ---- Auth flow (app.<domain>, but unauthenticated) ----
  login: '/login',
  loginWithDeletedNotice: () => '/login?deleted=1',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  /** Server route handler — email links AND the Google OAuth redirect both
   *  land here (see app/auth/confirm/route.ts). */
  authConfirm: (next?: string) => (next ? `/auth/confirm?next=${next}` : '/auth/confirm'),

  // ---- Authenticated app (app.<domain>) ----
  dashboard: '/dashboard',
  customers: '/customers',
  customerNew: '/customers/new',
  customerDetail: (id: string) => `/customers/${id}`,
  orderNew: '/orders/new',
  orderNewForCustomer: (customerId: string) => `/orders/new?customer=${customerId}`,
  /** No bare /orders page exists — this is a prefix-only entry (used by
   *  APP_PREFIXES below) so /orders/new and any future /orders/[id] stay
   *  grouped as one auth/domain rule in proxy.ts. */
  ordersPrefix: '/orders',
  production: '/production',
  productionOrder: (orderId: string) => `/production/${orderId}`,
  /** Was missing from every classification list below until this refactor
   *  found it (proxy.ts's default-protect-everything-not-public behavior
   *  meant it was still auth-gated, but it stayed on the marketing domain
   *  instead of moving to app.<domain>, and was crawlable/indexable since
   *  robots.ts never knew it existed). Exactly the class of bug this file
   *  exists to prevent — see the blast-radius notes at the top. */
  fabrics: '/fabrics',
  onboarding: '/onboarding',
  notifications: '/notifications',
  styles: '/styles',
  styleDetail: (styleName: string) => `/styles/${encodeURIComponent(styleName)}`,
  /** The owner's private styling view — distinct from the public
   *  /portfolio-examples marketing page. Do not let this collide with
   *  that one when prefix-matching (see APP_PREFIXES below). */
  portfolio: '/portfolio',
  settings: '/settings',
  settingsWithPlansSheet: () => '/settings?sheet=plans',
  settingsAccount: '/settings/account',
  settingsActivity: '/settings/activity',
  settingsBilling: '/settings/billing',
  settingsMessages: '/settings/messages',
  settingsPortfolio: '/settings/portfolio',
  settingsReports: '/settings/reports',
  settingsStaff: '/settings/staff',
  settingsStudio: '/settings/studio',
  settingsStyles: '/settings/styles',

  // ---- Internal admin (app.<domain>, platform-admin only — see
  //      lib/admin/requireAdmin.ts; not a shop-tenant route) ----
  admin: '/admin',

  // ---- Public-by-link (bare domain, not indexed) ----
  track: (orderId: string) => `/track/${orderId}`,
  receipt: (orderId: string) => `/receipt/${orderId}`,

  // ---- Public tenant content (bare domain, indexed) ----
  studio: (slug: string) => `/studio/${slug}`,

  // ---- Well-known files ----
  robotsTxt: '/robots.txt',
  sitemapXml: '/sitemap.xml',
  llmsTxt: '/llms.txt',
} as const;

// ---------------------------------------------------------------------
// Classification lists — used by proxy.ts for auth gating and the
// marketing/app domain split. Kept as exact string values (not derived
// via a shared prefix-matching helper) so this refactor changes *where*
// these lists live, not how they match — zero behavior change.
// ---------------------------------------------------------------------

export const AUTH_PAGES = [ROUTES.login, ROUTES.signup, ROUTES.forgotPassword, ROUTES.resetPassword];

export const MARKETING_PATHS = [ROUTES.home, ROUTES.features, ROUTES.pricing, ROUTES.about, ROUTES.portfolioExamples];

export const PUBLIC_PATHS = [
  ...AUTH_PAGES,
  ROUTES.privacy,
  ROUTES.terms,
  ROUTES.robotsTxt,
  ROUTES.sitemapXml,
  ROUTES.llmsTxt,
  ROUTES.blog,
  ROUTES.features,
  ROUTES.pricing,
  ROUTES.portfolioExamples,
  ROUTES.about,
  ROUTES.contact,
  ROUTES.offline,
];

export const PUBLIC_PREFIXES = ['/track/', '/receipt/', '/studio/', '/auth/', '/blog/'];

export function isPublicPath(pathname: string) {
  if ((PUBLIC_PATHS as readonly string[]).includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** The "app" (as opposed to marketing/public) side of the product — this is
 *  what lives at app.<domain> once the two are split by hostname. Auth
 *  pages count as app-side even though they're unauthenticated, since
 *  they're part of getting into the app, not marketing content. */
export const APP_PREFIXES = [ROUTES.dashboard, ROUTES.customers, ROUTES.ordersPrefix, ROUTES.production, ROUTES.settings, ROUTES.styles, ROUTES.notifications, ROUTES.onboarding, ROUTES.portfolio, ROUTES.fabrics, ROUTES.admin, '/auth'];

export function isAppPath(pathname: string) {
  if ((AUTH_PAGES as readonly string[]).includes(pathname)) return true;
  return APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// ---------------------------------------------------------------------
// robots.txt disallow list — an SEO/privacy concern, deliberately
// separate from the auth-gating lists above. Trailing slashes are
// intentional and NOT a typo: paths with a real bare page (dashboard,
// customers, settings, ...) use the bare prefix so both the page itself
// and its children are blocked. Paths with no bare page of their own
// (track, receipt, auth) use a trailing slash so the match only ever
// catches their children, never an unrelated future route that happens
// to share the same string prefix.
// ---------------------------------------------------------------------

export const SEARCH_DISALLOW = [
  ROUTES.dashboard,
  ROUTES.customers,
  ROUTES.ordersPrefix,
  ROUTES.production,
  ROUTES.settings,
  ROUTES.styles,
  ROUTES.notifications,
  ROUTES.onboarding,
  ROUTES.fabrics,
  ROUTES.admin,
  ROUTES.login,
  ROUTES.signup,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.offline,
  '/track/',
  '/receipt/',
  '/auth/',
];
