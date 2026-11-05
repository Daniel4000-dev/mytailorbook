import type { Customer, Order, StyleCatalogue } from './types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMPACT_UUID_TAIL_REGEX = /-([0-9a-f]{32})$/i;
const SHORT_HEX_TAIL_REGEX = /-([0-9a-f]{4,12})$/i;

/**
 * Converts a human-readable string (e.g. customer name, style name, catalogue title)
 * into a clean URL-safe slug segment.
 */
export function slugifyText(input?: string | null, maxLength = 36): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

/**
 * Encodes a canonical UUID by removing dashes (32 hex chars) or returns raw ID if non-UUID.
 */
export function compactId(id: string): string {
  if (UUID_REGEX.test(id)) {
    return id.replace(/-/g, '').toLowerCase();
  }
  return id;
}

/**
 * Restores a 32-char hex string back to a canonical 36-char UUID.
 */
export function expandCompactUuid(hex32: string): string {
  const clean = hex32.toLowerCase();
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
}

/**
 * Extracts a canonical UUID or raw ID from a URL param that may be:
 * - A raw UUID: `550e8400-e29b-41d4-a716-446655440000`
 * - A human slug + compact UUID: `chief-adebayo-senator-550e8400e29b41d4a716446655440000`
 * - A mock ID or short slug: `mock-cust-1` or `chief-adebayo-8f3a9c`
 */
export function extractCanonicalId(param: string): string {
  if (!param) return param;
  const decoded = decodeURIComponent(param).trim();
  if (UUID_REGEX.test(decoded)) return decoded;

  const compactMatch = decoded.match(COMPACT_UUID_TAIL_REGEX);
  if (compactMatch) {
    return expandCompactUuid(compactMatch[1]);
  }

  if (/^[0-9a-f]{32}$/i.test(decoded)) {
    return expandCompactUuid(decoded);
  }

  return decoded;
}

/**
 * Builds a clean, human-readable slug for an Order:
 * - For in-app routes (`/production/...`): uses a short 6-char hex code (`adebayo-senator-suit-550e84`)
 *   since the full order list is in memory and matched cleanly.
 * - For public unauthenticated routes (`/track/...`, `/receipt/...`): embeds the compact token
 *   after the readable slug (`adebayo-senator-suit-550e8400...`) so unauthenticated server lookups
 *   remain 100% unguessable and instant while putting the client & garment name first.
 */
export function toOrderSlug(
  orderOrId:
    | string
    | Pick<Order, 'id'> & {
        customerName?: string | null;
        styleName?: string | null;
        orderDetails?: string | null;
      },
  options?: { publicToken?: boolean }
): string {
  if (typeof orderOrId === 'string') {
    return orderOrId;
  }

  const id = orderOrId.id;
  const namePart = slugifyText(orderOrId.customerName, 18);
  const stylePart = slugifyText(orderOrId.styleName || orderOrId.orderDetails, 22);
  const prefix = [namePart, stylePart].filter(Boolean).join('-') || 'order';

  if (options?.publicToken) {
    return `${prefix}-${compactId(id)}`;
  }

  const shortCode = UUID_REGEX.test(id) ? id.replace(/-/g, '').slice(0, 6).toLowerCase() : id;
  return `${prefix}-${shortCode}`;
}

/**
 * Builds a clean, human-readable slug for a Customer (`/customers/chief-adebayo-9b1deb`).
 */
export function toCustomerSlug(
  customerOrId: string | (Pick<Customer, 'id'> & { fullName?: string | null })
): string {
  if (typeof customerOrId === 'string') {
    return customerOrId;
  }

  const id = customerOrId.id;
  const namePart = slugifyText(customerOrId.fullName, 28) || 'client';
  const shortCode = UUID_REGEX.test(id) ? id.replace(/-/g, '').slice(0, 6).toLowerCase() : id;
  return `${namePart}-${shortCode}`;
}

/**
 * Builds a clean, human-readable slug for a Style Catalogue (`/catalogues/eid-collection-7c9e66`).
 */
export function toCatalogueSlug(
  catalogueOrId: string | (Pick<StyleCatalogue, 'id'> & { title?: string | null })
): string {
  if (typeof catalogueOrId === 'string') {
    return catalogueOrId;
  }

  const id = catalogueOrId.id;
  const titlePart = slugifyText(catalogueOrId.title, 32) || 'lookbook';
  const shortCode = UUID_REGEX.test(id) ? id.replace(/-/g, '').slice(0, 6).toLowerCase() : id;
  return `${titlePart}-${shortCode}`;
}

/**
 * Matches an item from an in-memory list (orders, customers, catalogues) against a URL param
 * whether the URL param is:
 * 1. An exact ID match (`item.id === param`)
 * 2. A full slug with compact UUID (`adebayo-550e8400e29b41d4a716446655440000`)
 * 3. A human-readable slug with short 4-12 char hex suffix (`chief-adebayo-9b1deb`)
 * 4. A pure title/name slug (`eid-2026-collection`)
 */
export function findByIdOrSlug<T extends { id: string }>(
  items: T[],
  param: string | undefined | null,
  getLabel?: (item: T) => string | undefined | null
): T | undefined {
  if (!param || !items || items.length === 0) return undefined;
  const decoded = decodeURIComponent(param).trim();
  const canonical = extractCanonicalId(decoded);

  // 1. Direct ID or canonical UUID match
  const exact = items.find((item) => item.id === decoded || item.id === canonical);
  if (exact) return exact;

  // 2. Short hex code suffix match (e.g. `chief-adebayo-9b1deb` -> `9b1deb` matches start of compact UUID)
  const shortMatch = decoded.match(SHORT_HEX_TAIL_REGEX);
  if (shortMatch) {
    const shortHex = shortMatch[1].toLowerCase();
    const matchedByHex = items.find((item) =>
      item.id.replace(/-/g, '').toLowerCase().startsWith(shortHex)
    );
    if (matchedByHex) return matchedByHex;
  }

  // 3. Pure label slug match if getLabel is provided
  if (getLabel) {
    const targetSlug = slugifyText(decoded, 48);
    if (targetSlug) {
      const matchedByLabel = items.find((item) => slugifyText(getLabel(item), 48) === targetSlug);
      if (matchedByLabel) return matchedByLabel;
    }
  }

  return undefined;
}

