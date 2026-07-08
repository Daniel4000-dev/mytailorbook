/* ============================================================
   MyTailorBook Formatters
   ============================================================
   Utility functions for formatting display values.
   ============================================================ */

import { PHONE_PREFIX } from './constants';
import type { OrderStatus } from './types';

/**
 * Formats a number as Nigerian Naira with commas.
 * Example: 1500000 → "₦1,500,000"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = PHONE_PREFIX + cleaned.slice(1);
  } else if (!cleaned.startsWith(PHONE_PREFIX)) {
    cleaned = PHONE_PREFIX + cleaned;
  }
  return cleaned;
}

/**
 * Formats a phone number for display.
 * Example: "2348012345678" → "+234 801 234 5678"
 */
export function formatPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length < 13) return `+${normalized}`;
  return `+${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`;
}

/**
 * Validates that a phone number has the correct Nigerian format.
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return normalized.length === 13 && normalized.startsWith(PHONE_PREFIX);
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
 * The stage-specific WhatsApp update a tailor sends a customer from the
 * order detail sheet — worded around whatever stage the order is actually
 * in right now, always closing with the tracking link.
 */
export function getOrderProgressMessage(params: {
  customerName: string;
  shopName: string;
  status: OrderStatus;
  trackingUrl: string;
}): string {
  const { customerName, shopName, status, trackingUrl } = params;
  const firstName = customerName.trim().split(' ')[0] || customerName;

  const stageMessages: Record<OrderStatus, string> = {
    Documented: `Hi ${firstName}, thank you for choosing ${shopName}! We've logged your order and it's queued up to begin production soon.`,
    Cutting: `Hi ${firstName}, good news from ${shopName}! We've started working on your outfit — it's currently in the cutting stage.`,
    Sewing: `Hi ${firstName}, quick update from ${shopName} — your outfit is now being sewn together.`,
    Ready: `Hi ${firstName}, exciting news from ${shopName}! Your outfit is ready, just some final touches away from being set for you.`,
    Completed: `Hi ${firstName}, your outfit is complete and ready for you from ${shopName}! Thank you for your patience.`,
  };

  return `${stageMessages[status]} You can monitor its progress anytime here: ${trackingUrl}`;
}

/** A birthday WhatsApp message, pre-filled the same way order updates are. */
export function getBirthdayMessage(customerName: string, shopName: string): string {
  const firstName = customerName.trim().split(' ')[0] || customerName;
  return `Happy birthday, ${firstName}! 🎉 Wishing you a wonderful day from all of us at ${shopName}. Thank you for being a valued customer!`;
}

/** A "come back" nudge for a customer who hasn't ordered in a while. */
export function getReEngagementMessage(customerName: string, shopName: string): string {
  const firstName = customerName.trim().split(' ')[0] || customerName;
  return `Hi ${firstName}, it's been a while! We'd love to see you again at ${shopName} for your next outfit — let us know if there's anything we can help with.`;
}

export type LoyaltyTier = 'new' | 'regular' | 'vip';

/** Purely a recognition nudge for the tailor — not shown to the customer. */
export function getLoyaltyTier(orderCount: number): { label: string; tier: LoyaltyTier } {
  if (orderCount >= 5) return { label: 'VIP Customer', tier: 'vip' };
  if (orderCount >= 2) return { label: 'Regular Customer', tier: 'regular' };
  return { label: 'New Customer', tier: 'new' };
}

/**
 * Days from today until the next occurrence of this date's month/day
 * (handles the year wraparound — e.g. today is December, birthday is
 * January). Returns null if the date string is invalid.
 */
export function getDaysUntilAnnualDate(dateString: string): number | null {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  next.setHours(0, 0, 0, 0);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Whole days elapsed since the given date string (always >= 0). */
export function getDaysSince(dateString: string): number {
  const then = new Date(dateString);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)));
}

/** camelCase measurement key -> readable label, e.g. "shoulderToBustPoint" -> "Shoulder To Bust Point" */
export function formatMeasurementLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
