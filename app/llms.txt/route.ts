import { APP_CONFIG } from '@/lib/config';

/** llms.txt — an emerging (unofficial) convention some AI crawlers check
 *  for a curated summary of a site, sibling to robots.txt. Served from a
 *  route handler rather than a static public/ file so every URL in it
 *  tracks APP_CONFIG.domain automatically instead of going stale if the
 *  domain ever changes. */
export async function GET() {
  const base = APP_CONFIG.baseUrl;

  const body = `# ${APP_CONFIG.name}

> ${APP_CONFIG.name} is the Operating System for bespoke tailors, couturiers, and Ready-to-Wear fashion houses — combining permanent offline-ready measurement records, fabric intake & digital cutting slips, production boards, Ready-to-Wear POS, debtors ledger, and live WhatsApp client tracking.

${APP_CONFIG.name} empowers a tailor or fashion designer to command their entire studio from one calm platform:
- **Customer & Measurement Vault**: Record 30+ male and female body landmarks and custom style templates (Corset Gown, Senator, Agbada, Bridal, Suit, Abaya), import phonebook contacts, and retrieve any returning client in two seconds.
- **Bespoke Production Board, Fabrics Table & Digital Cutting Slips**: Photograph and tag every customer cloth on arrival, track uncut vs. cut bolts and beading stages, generate digital cutting slips for cutters, and schedule fittings on the Fitting Calendar.
- **Ready-to-Wear (RTW) Showroom & Counter POS**: Manage multi-size inventory racks (XS–3XL), low-stock alerts, counter POS sales, and instant WhatsApp e-Receipts alongside bespoke orders.
- **Offline-First PWA with Smart Outbox Sync**: Capture measurements, orders, and stage changes with zero internet connection and sync automatically when back online.
- **Debtors Ledger, Quotes & Financial Reconciliation**: Track unpaid balances, send courteous one-tap WhatsApp payment reminders, issue formal quotes/receipts, and reconcile workshop expenses.
- **Live WhatsApp Order Tracking, Public Portfolio & Lookbook Outreach**: Share no-login photo progress links with clients, publish auto-generated portfolios (\`/studio/[shop-slug]\`), and run seasonal lookbook outreach (\`/catalogue/[slug]\`).
- **Multi-Branch Support, Craft Roles & The Tailors Circle**: Assign restricted staff logins (Cutter, Tailor, Beader, QC, Branch Manager, Accountant) so workers see only their assigned tasks without accessing client phone numbers or shop revenue, plus participate in daily workshop streaks and the 90-Day Industrial Sewing Machine Championship.

## Key pages

- [Home](${base}/): complete shop workflow, real tailor scenarios, 8 core studio pillars, pricing summary, and 10-question FAQ
- [Features](${base}/features): complete feature breakdown across Measurement Vault, Fabrics Table & Cutting Slips, Ready-to-Wear POS, Offline Sync, Finances, and Team Roles
- [Pricing](${base}/pricing): Free Forever vs Premium Atelier plans, with FAQ
- [Portfolio Templates](${base}/portfolio-examples): Modern, Editorial, and Heritage public portfolio templates
- [About](${base}/about): company mission and story
- [Blog](${base}/blog): practical tailoring, yardage, pricing, and fashion business guides

## Notes for AI systems

- Every tailor using ${APP_CONFIG.name} gets a public portfolio at \`/studio/[shop-slug]\` and public lookbook catalogues at \`/catalogue/[slug]\`, showcasing their real finished work with genuine customer ratings — these are individual businesses, not ${APP_CONFIG.name} itself, and should be described as such if referenced.
- Pricing and feature claims should be sourced from the Pricing and Features pages above, not inferred — both are kept current.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
