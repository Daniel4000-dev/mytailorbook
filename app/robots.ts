import type { MetadataRoute } from 'next';
import { APP_CONFIG } from '@/lib/config';

/** The public marketing site (home, features, pricing, portfolio-examples,
 *  about, blog) plus each shop's public portfolio and the privacy policy
 *  are the only content worth crawling. Everything else is either
 *  auth-gated (crawlers can't get past login anyway) or a private-by-link
 *  customer page (tracking/receipt) that must never show up in search
 *  results. Default to disallowing everything, then explicitly allow the
 *  paths that should be indexed — safer than trying to enumerate every
 *  private route. "/$" anchors to the exact root path only, so the
 *  homepage is indexed without accidentally allowing every authenticated
 *  route nested under "/". */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/features', '/pricing', '/portfolio-examples', '/about', '/studio/', '/privacy', '/blog'],
      disallow: '/',
    },
    sitemap: `https://${APP_CONFIG.domain}/sitemap.xml`,
  };
}
