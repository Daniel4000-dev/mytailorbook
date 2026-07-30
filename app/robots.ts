import type { MetadataRoute } from 'next';
import { APP_CONFIG } from '@/lib/config';

/** This app has no public marketing homepage ("/" just redirects to
 *  "/login") — the only content worth crawling is each shop's public
 *  portfolio, the privacy policy, and the marketing blog. Everything else
 *  is either auth-gated (crawlers can't get past login anyway) or a
 *  private-by-link customer page (tracking/receipt) that must never show
 *  up in search results. Default to disallowing everything, then
 *  explicitly allow the few paths that should be indexed — safer than
 *  trying to enumerate every private route. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/studio/', '/privacy', '/blog'],
      disallow: '/',
    },
    sitemap: `https://${APP_CONFIG.domain}/sitemap.xml`,
  };
}
