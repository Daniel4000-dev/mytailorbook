import { APP_CONFIG } from './config';

/** Builds a schema.org BreadcrumbList for a page's position in the site
 *  hierarchy. `path` is root-relative (e.g. "/blog", "/blog/my-post"). */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${APP_CONFIG.baseUrl}${item.path}`,
    })),
  };
}
