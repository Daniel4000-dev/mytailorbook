import { describe, it, expect } from 'vitest';
import { ROUTES, PUBLIC_PATHS, MARKETING_PATHS, APP_PREFIXES, SEARCH_DISALLOW, isPublicPath, isAppPath } from '@/lib/routes';
import { findByIdOrSlug, toCustomerSlug, toOrderSlug, toCatalogueSlug } from '@/lib/slugs';

// This file exists because getting a route's classification wrong has
// already caused two real incidents in this project: a stale robots.txt
// blocking Google from indexing the whole site, and /fabrics silently
// missing from every list (still auth-gated by proxy.ts's default-protect
// behavior, but wrongly left on the marketing domain and crawlable). These
// tests pin down the exact failure modes described in lib/routes.ts's
// "blast radius" comments so a future edit can't reintroduce them silently.

describe('isPublicPath', () => {
  it('treats auth pages, marketing pages, and the home page as public', () => {
    expect(isPublicPath(ROUTES.login)).toBe(true);
    expect(isPublicPath(ROUTES.signup)).toBe(true);
    expect(isPublicPath(ROUTES.features)).toBe(true);
    expect(isPublicPath(ROUTES.blog)).toBe(true);
  });

  it('treats public-by-link prefixes (track/receipt/studio) as public', () => {
    expect(isPublicPath(ROUTES.track('order-123'))).toBe(true);
    expect(isPublicPath(ROUTES.receipt('order-123'))).toBe(true);
    expect(isPublicPath(ROUTES.studio('some-shop'))).toBe(true);
  });

  it('does not treat authenticated app pages as public', () => {
    expect(isPublicPath(ROUTES.dashboard)).toBe(false);
    expect(isPublicPath(ROUTES.customers)).toBe(false);
    expect(isPublicPath(ROUTES.settings)).toBe(false);
    expect(isPublicPath(ROUTES.fabrics)).toBe(false);
  });
});

describe('isAppPath', () => {
  it('treats dashboard/customers/settings/etc and their children as app paths', () => {
    expect(isAppPath(ROUTES.dashboard)).toBe(true);
    expect(isAppPath(ROUTES.customers)).toBe(true);
    expect(isAppPath(ROUTES.customerDetail('abc'))).toBe(true);
    expect(isAppPath(ROUTES.settingsBilling)).toBe(true);
    expect(isAppPath(ROUTES.orderNew)).toBe(true);
    expect(isAppPath(ROUTES.fabrics)).toBe(true);
  });

  it('treats auth pages as app paths (they belong on app.<domain>)', () => {
    expect(isAppPath(ROUTES.login)).toBe(true);
    expect(isAppPath(ROUTES.signup)).toBe(true);
    expect(isAppPath(ROUTES.resetPassword)).toBe(true);
    expect(isAppPath(ROUTES.authConfirm())).toBe(true);
  });

  it('does not treat marketing pages as app paths', () => {
    expect(isAppPath(ROUTES.home)).toBe(false);
    expect(isAppPath(ROUTES.features)).toBe(false);
    expect(isAppPath(ROUTES.pricing)).toBe(false);
    expect(isAppPath(ROUTES.about)).toBe(false);
  });

  // The exact near-miss this project hit: /portfolio (owner's private app
  // page) and /portfolio-examples (public marketing page) share a string
  // prefix. A naive `pathname.startsWith('/portfolio')` check would
  // wrongly redirect marketing visitors on /portfolio-examples to
  // app.<domain>, breaking the page entirely.
  it('does not let /portfolio swallow /portfolio-examples', () => {
    expect(isAppPath(ROUTES.portfolio)).toBe(true);
    expect(isAppPath(ROUTES.portfolioExamples)).toBe(false);
  });
});

describe('SEARCH_DISALLOW (robots.txt)', () => {
  it('blocks every authenticated app path', () => {
    for (const prefix of APP_PREFIXES) {
      // /portfolio and /auth are deliberately excluded from robots.txt
      // itself (see the comment in app/robots.ts) even though they're
      // real app prefixes — /portfolio would swallow /portfolio-examples
      // as a bare robots.txt Disallow prefix, and /auth has no bare page
      // of its own so it's covered by the '/auth/' trailing-slash entry
      // instead of the bare '/auth' prefix.
      if (prefix === ROUTES.portfolio || prefix === '/auth') continue;
      expect(SEARCH_DISALLOW).toContain(prefix);
    }
  });

  it('does not block the public marketing pages', () => {
    for (const path of MARKETING_PATHS) {
      expect(SEARCH_DISALLOW).not.toContain(path);
    }
    expect(SEARCH_DISALLOW).not.toContain(ROUTES.blog);
    expect(SEARCH_DISALLOW).not.toContain(ROUTES.portfolioExamples);
  });

  it('includes /fabrics (the gap this refactor found and fixed)', () => {
    expect(SEARCH_DISALLOW).toContain(ROUTES.fabrics);
  });
});

describe('route builders produce the expected path shape', () => {
  it('builds dynamic detail routes with both raw IDs and clean human-readable slugs', () => {
    expect(ROUTES.customerDetail('abc123')).toBe('/customers/abc123');
    expect(ROUTES.productionOrder('order-9')).toBe('/production/order-9');
    expect(ROUTES.track('order-9')).toBe('/track/order-9');
    expect(ROUTES.receipt('order-9')).toBe('/receipt/order-9');
    expect(ROUTES.studio('adire-atelier')).toBe('/studio/adire-atelier');
    expect(ROUTES.blogPost('some-post')).toBe('/blog/some-post');

    // Clean slug generation from entity objects
    expect(
      ROUTES.customerDetail({
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        fullName: 'Chief Adebayo Okafor',
      })
    ).toBe('/customers/chief-adebayo-okafor-9b1deb');

    expect(
      ROUTES.productionOrder({
        id: '550e8400-e29b-41d4-a716-446655440000',
        customerName: 'Chief Adebayo',
        styleName: 'Senator Suit',
      })
    ).toBe('/production/chief-adebayo-senator-suit-550e84');

    expect(
      ROUTES.track({
        id: '550e8400-e29b-41d4-a716-446655440000',
        customerName: 'Chief Adebayo',
        styleName: 'Senator Suit',
      })
    ).toBe('/track/chief-adebayo-senator-suit-550e8400e29b41d4a716446655440000');

    expect(
      ROUTES.catalogueDetail({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        title: 'Eid 2026 Collection',
      })
    ).toBe('/catalogues/eid-2026-collection-7c9e66');
  });

  it('URL-encodes style names with spaces/special characters', () => {
    expect(ROUTES.styleDetail('Agbada & Cap')).toBe('/styles/Agbada%20%26%20Cap');
  });

  it('builds query-carrying routes', () => {
    expect(ROUTES.loginWithDeletedNotice()).toBe('/login?deleted=1');
    expect(ROUTES.settingsWithPlansSheet()).toBe('/settings?sheet=plans');
    expect(ROUTES.orderNewForCustomer('cust-1')).toBe('/orders/new?customer=cust-1');
    expect(ROUTES.authConfirm(ROUTES.onboarding)).toBe('/auth/confirm?next=/onboarding');
    expect(ROUTES.authConfirm()).toBe('/auth/confirm');
  });
});

describe('PUBLIC_PATHS / MARKETING_PATHS sanity', () => {
  it('keeps /blog, /privacy, /terms out of MARKETING_PATHS so logged-in users can still read them', () => {
    expect(MARKETING_PATHS).not.toContain(ROUTES.blog);
    expect(MARKETING_PATHS).not.toContain(ROUTES.privacy);
    expect(MARKETING_PATHS).not.toContain(ROUTES.terms);
  });

  it('every MARKETING_PATHS entry is also public', () => {
    for (const path of MARKETING_PATHS) {
      expect(isPublicPath(path) || path === ROUTES.home).toBe(true);
    }
  });

  it('PUBLIC_PATHS has no accidental duplicate of an app path', () => {
    const appOnlyPaths = [ROUTES.dashboard, ROUTES.customers, ROUTES.settings, ROUTES.fabrics];
    for (const path of appOnlyPaths) {
      expect(PUBLIC_PATHS as readonly string[]).not.toContain(path);
    }
  });
});

describe('findByIdOrSlug resolution', () => {
  const sampleCustomers = [
    { id: 'mock-cust-01', fullName: 'Chief Adeleke Adeleke' },
    { id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', fullName: 'Chief Adebayo Okafor' },
  ];

  const sampleOrders = [
    { id: 'mock-ord-101', customerName: 'Chief Adeleke Adeleke', styleName: 'Agbada' },
    { id: '550e8400-e29b-41d4-a716-446655440000', customerName: 'Chief Adebayo', styleName: 'Senator Suit' },
  ];

  const sampleCatalogues = [
    { id: 'mock-cat-1', title: 'Eid 2026 Collection' },
    { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', title: 'Bridal Lookbook' },
  ];

  it('resolves mock customer slugs and UUID customer slugs accurately', () => {
    const mockSlug = toCustomerSlug(sampleCustomers[0]);
    expect(mockSlug).toBe('chief-adeleke-adeleke-mock-cust-01');
    expect(findByIdOrSlug(sampleCustomers, mockSlug, (c) => c.fullName)?.id).toBe('mock-cust-01');
    expect(findByIdOrSlug(sampleCustomers, 'mock-cust-01', (c) => c.fullName)?.id).toBe('mock-cust-01');

    const uuidSlug = toCustomerSlug(sampleCustomers[1]);
    expect(uuidSlug).toBe('chief-adebayo-okafor-9b1deb');
    expect(findByIdOrSlug(sampleCustomers, uuidSlug, (c) => c.fullName)?.id).toBe('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
    expect(findByIdOrSlug(sampleCustomers, '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', (c) => c.fullName)?.id).toBe('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
  });

  it('resolves mock order slugs and UUID order slugs accurately', () => {
    const mockOrderSlug = toOrderSlug(sampleOrders[0]);
    expect(findByIdOrSlug(sampleOrders, mockOrderSlug)?.id).toBe('mock-ord-101');

    const uuidOrderSlug = toOrderSlug(sampleOrders[1]);
    expect(findByIdOrSlug(sampleOrders, uuidOrderSlug)?.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('resolves mock catalogue slugs and UUID catalogue slugs accurately', () => {
    const mockCatSlug = toCatalogueSlug(sampleCatalogues[0]);
    expect(findByIdOrSlug(sampleCatalogues, mockCatSlug, (c) => c.title)?.id).toBe('mock-cat-1');

    const uuidCatSlug = toCatalogueSlug(sampleCatalogues[1]);
    expect(findByIdOrSlug(sampleCatalogues, uuidCatSlug, (c) => c.title)?.id).toBe('7c9e6679-7425-40de-944b-e07fc1f90ae7');
  });
});
