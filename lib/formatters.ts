/* ============================================================
   MyTailorBook Formatters
   ============================================================
   Utility functions for formatting display values.
   ============================================================ */

import { PHONE_PREFIX } from './constants';

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
 * Generates a WhatsApp link for a phone number.
 */
export function getWhatsAppLink(phone: string): string {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}`;
}
