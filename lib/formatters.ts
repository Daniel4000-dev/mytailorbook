/* ============================================================
   MyStitchBook Formatters
   ============================================================
   Utility functions for formatting display values.
   ============================================================ */

import { PHONE_PREFIX } from './constants';
import type { OrderStatus } from './types';

/**
 * Formats a number as currency with commas.
 * Example: 1500000 → "₦1,500,000" (if NGN)
 */
export function formatCurrency(amount: number, currencyCode: string = 'NGN'): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Extracts the raw currency symbol for a given currency code.
 * Example: 'NGN' → '₦', 'USD' → '$'
 */
export function getCurrencySymbol(currencyCode: string = 'NGN'): string {
  const parts = new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value || currencyCode;
}

/**
 * Formats a number with comma separation (no currency symbol).
 * Example: 1500000 → "1,500,000"
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Normalizes a phone number to always have the 234 prefix.
 * Strips leading 0 or +234 and re-adds 234.
 * Example: "08012345678" → "2348012345678"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const isExplicitInternational = phone.startsWith('+');
  let cleaned = phone.replace(/\D/g, '');
  
  if (isExplicitInternational) {
    return cleaned;
  }

  if (cleaned.startsWith('0')) {
    cleaned = PHONE_PREFIX + cleaned.slice(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith(PHONE_PREFIX)) {
    cleaned = PHONE_PREFIX + cleaned;
  }
  return cleaned;
}

/**
 * Formats a phone number for display.
 * Example: "2348012345678" → "+234 801 234 5678"
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const normalized = normalizePhone(phone);
  
  if (normalized.startsWith('234') && normalized.length === 13) {
    return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
  }
  
  // Generic international fallback format
  return `+${normalized}`;
}

/**
 * Validates that a phone number has the correct Nigerian format.
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return normalized.length >= 7 && normalized.length <= 15;
}

/**
 * Truncates text to a max length with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Generates initials from a full name (max 2 characters).
 * Example: "Adebayo Ogunlesi" → "AO"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

/**
 * Formats a date string to a relative or readable format.
 * Example: "2025-06-21T10:00:00Z" → "Today, 10:00 AM" or "Jun 21"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)}h ago`;
  }
  if (diffHours < 48) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

/**
 * Formats a date as "Month Year" — used for "added on" / "customer since"
 * style displays where the exact day doesn't matter.
 * Example: "2024-03-15T14:30:00Z" → "March 2024"
 */
export function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

/**
 * Compact "Mon YYYY" form for tight spaces like table rows.
 * Example: "2024-03-15T14:30:00Z" → "Mar 2024"
 */
export function formatShortMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });
}

/**
 * Generates a WhatsApp link for a phone number. When `message` is given, it's
 * pre-filled into the chat's text box via wa.me's `text` param — the customer
 * still has to hit send themselves, this just saves the tailor from typing
 * the same update out by hand for every order.
 */
export function getWhatsAppLink(phone: string, message?: string): string {
  const normalized = normalizePhone(phone);
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Built-in per-stage wording, each ending with a `{link}` placeholder for
 * the tracking URL — shown as the pre-filled default in Settings' Order
 * Update Messages screen, and used as-is for any shop that never
 * customizes a given stage.
 */
export const DEFAULT_STAGE_MESSAGES: Record<OrderStatus, string> = {
  Documented: `Hi {name}, thank you for choosing {shop}! We've logged your order and it's queued up to begin production soon. You can monitor its progress anytime here: {link}`,
  Cutting: `Hi {name}, good news from {shop}! We've started working on your outfit — it's currently in the cutting stage. You can monitor its progress anytime here: {link}`,
  Sewing: `Hi {name}, quick update from {shop} — your outfit is now being sewn together. You can monitor its progress anytime here: {link}`,
  Ready: `Hi {name}, exciting news from {shop}! Your outfit is ready, just some final touches away from being set for you. You can monitor its progress anytime here: {link}`,
  Delivered: `Hi {name}, your outfit is complete and ready for you from {shop}! Thank you for your patience. You can monitor its progress anytime here: {link}`,
};

/**
 * The stage-specific WhatsApp update a tailor sends a customer from the
 * order detail sheet — worded around whatever stage the order is actually
 * in right now, always closing with the tracking link. Uses the shop's own
 * customized wording for that stage when set (see Settings > Order Update
 * Messages), otherwise the built-in default above.
 */
export function getOrderProgressMessage(params: {
  customerName: string;
  shopName: string;
  status: OrderStatus;
  trackingUrl: string;
  customTemplate?: string;
  /** Defaults to true. When false, the built-in closing sentence that
   *  points at {link} is dropped entirely rather than left with a dangling
   *  "here: " and nothing after it. A shop's own custom template (which
   *  may phrase its closing differently) just has its {link} token blanked
   *  instead, since we can't know how they worded it. */
  includeTrackingLink?: boolean;
}): string {
  const { customerName, shopName, status, trackingUrl, customTemplate, includeTrackingLink = true } = params;
  const firstName = customerName.trim().split(' ')[0] || customerName;
  let template = customTemplate || DEFAULT_STAGE_MESSAGES[status];

  if (!includeTrackingLink && !customTemplate) {
    template = template.replace(/\s*You can monitor its progress anytime here: \{link\}/i, '');
  }

  return template
    .replace(/\{name\}/g, firstName)
    .replace(/\{shop\}/g, shopName)
    .replace(/\{link\}/g, includeTrackingLink ? trackingUrl : '');
}
