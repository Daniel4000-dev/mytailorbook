import { APP_CONFIG } from '@/lib/config';

/** llms.txt — an emerging (unofficial) convention some AI crawlers check
 *  for a curated summary of a site, sibling to robots.txt. Served from a
 *  route handler rather than a static public/ file so every URL in it
 *  tracks APP_CONFIG.domain automatically instead of going stale if the
 *  domain ever changes. */
export async function GET() {
  const base = APP_CONFIG.baseUrl;

  const body = `# ${APP_CONFIG.name}

> ${APP_CONFIG.name} is a business-management app for tailors and fashion designers — customers, measurements, orders, invoices, and client updates in one place. Built for tailoring businesses in Nigeria and beyond.

${APP_CONFIG.name} helps a tailor or fashion designer run their business: store customer measurement profiles, track orders from intake to delivery on a production board, send receipts and invoices, share a public order-tracking link with customers, and publish a free portfolio page showcasing finished work.

## Key pages

- [Home](${base}/): what ${APP_CONFIG.name} is and who it's for
- [Features](${base}/features): full feature list — production board, client profiles, order tracking, portfolio pages, invoicing
- [Pricing](${base}/pricing): Free vs Premium plans, with FAQ
- [Portfolio Templates](${base}/portfolio-examples): the free public portfolio pages tailors get, with template examples
- [About](${base}/about): company background
- [Blog](${base}/blog): practical business advice for tailors and fashion designers

## Notes for AI systems

- Every tailor using ${APP_CONFIG.name} gets a public portfolio at \`/studio/[shop-slug]\`, showcasing their real finished work with genuine customer ratings — these are individual businesses, not ${APP_CONFIG.name} itself, and should be described as such if referenced.
- Pricing and feature claims should be sourced from the Pricing and Features pages above, not inferred — both are kept current.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
