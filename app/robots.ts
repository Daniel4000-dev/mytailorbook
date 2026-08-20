import type { MetadataRoute } from 'next';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES, SEARCH_DISALLOW } from '@/lib/routes';

/** The public marketing site (home, features, pricing, portfolio-examples,
 *  about, blog) plus each shop's public portfolio and the privacy policy
 *  are the only content worth crawling. Everything else is either
 *  auth-gated (crawlers can't get past login anyway) or a private-by-link
 *  customer page (tracking/receipt) that must never show up in search
 *  results.
 *
 *  Explicitly disallow just the private paths and leave everything else
 *  implicitly allowed — the previous version did the inverse (blanket
 *  `Disallow: /` overridden by specific `Allow:` entries), which depends
 *  on "most-specific-rule-wins" precedence. That's a Google-specific
 *  extension to the robots.txt spec, not something every crawler
 *  implements — a simpler parser (several AI crawlers included) sees
 *  `Disallow: /` and stops there, ignoring the Allow lines entirely, so
 *  only whatever it fetched before consulting robots.txt (typically just
 *  the URL it was given) ever got read. This form has no such dependency:
 *  it works identically for a spec-strict parser and a naive one. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // See SEARCH_DISALLOW in lib/routes.ts for the full list and why
      // /portfolio (the owner's own private view) is deliberately absent —
      // as a bare prefix it would also match /portfolio-examples, the
      // marketing page this whole file exists to keep crawlable. It's
      // already auth-gated server-side by proxy.ts (unlike /track/ and
      // /receipt/, which are real public-by-link pages technically
      // fetchable without a session), so a crawler that ignores this file
      // entirely still can't reach anything there.
      disallow: SEARCH_DISALLOW,
    },
    sitemap: `https://${APP_CONFIG.domain}${ROUTES.sitemapXml}`,
  };
}
