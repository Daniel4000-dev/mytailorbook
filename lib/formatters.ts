/* ============================================================
   MyStitchBook Formatters
   ============================================================
   Utility functions for formatting display values.
   ============================================================ */

import { PHONE_PREFIX } from './constants';
import { APP_CONFIG } from './config';
import type { OrderStatus, Order, Customer } from './types';

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
 * Generates a clean tel: URI for phone dialers.
 * Guarantees a single leading '+' and country code normalization.
 */
export function getTelLink(phone: string): string {
  if (!phone) return '#';
  const normalized = normalizePhone(phone);
  return `tel:+${normalized}`;
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

export const DEFAULT_EVENT_PHOTO_MESSAGE = `Hi {name}, we hope you had a wonderful time at your event! We would love to feature your look in the {shop} lookbook. Kindly share a few photos of you in your outfit, and feel free to tag us on Instagram ({instagram}).`;

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
  orderId?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
}): string {
  const {
    customerName,
    shopName,
    status,
    trackingUrl,
    customTemplate,
    includeTrackingLink = true,
    orderId,
    instagram,
    tiktok,
    website,
    bankDetails,
  } = params;
  const firstName = customerName.trim().split(' ')[0] || customerName;
  let template = customTemplate || DEFAULT_STAGE_MESSAGES[status];

  if (!includeTrackingLink && !customTemplate) {
    template = template.replace(/\s*You can monitor its progress anytime here: \{link\}/i, '');
  }

  const formattedBank = bankDetails && (bankDetails.bankName || bankDetails.accountNumber)
    ? [
      bankDetails.bankName ? `Bank: ${bankDetails.bankName}` : '',
      bankDetails.accountNumber ? `Account: ${bankDetails.accountNumber}` : '',
      bankDetails.accountName ? `Name: ${bankDetails.accountName}` : '',
    ].filter(Boolean).join('\n')
    : '';

  const cleanIg = instagram ? (instagram.startsWith('@') ? instagram : `@${instagram}`) : '';
  const cleanTiktok = tiktok ? (tiktok.startsWith('@') ? tiktok : `@${tiktok}`) : '';

  return template
    .replace(/\{name\}/g, firstName)
    .replace(/\{shop\}/g, shopName)
    .replace(/\{link\}/g, includeTrackingLink ? trackingUrl : '')
    .replace(/\{orderId\}/g, orderId || '')
    .replace(/\{instagram\}/g, cleanIg)
    .replace(/\{handle\}/g, cleanIg)
    .replace(/\{tiktok\}/g, cleanTiktok)
    .replace(/\{website\}/g, website || '')
    .replace(/\{bank_details\}/g, formattedBank);
}

/**
 * Parses measurement inputs entered by tailors into numeric values.
 * Handles decimals ("15.5", "38.25"), common fractions ("15 1/2", "38 1/4", "15-1/2"),
 * inch symbols ("15.5\""), and returns null for empty or non-numeric inputs.
 */
export function parseMeasurementValue(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const clean = String(val).trim().replace(/["”]/g, '').trim();
  if (!clean || clean === '--') return null;

  // Fraction format e.g. "15 1/2", "15-1/2", "1/2"
  const fractionMatch = clean.match(/^(\d+)?(?:\s+|-)?(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const num = parseFloat(fractionMatch[2]);
    const denom = parseFloat(fractionMatch[3]);
    if (denom !== 0) {
      return Number((whole + num / denom).toFixed(3));
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Formats a customer's measurements and notes into a clean, ready-to-share
 * WhatsApp or clipboard text snippet for apprentices, cutters, or clients.
 */
export function formatMeasurementsSummary(params: {
  customerName: string;
  gender?: 'male' | 'female';
  measurements?: Record<string, number | string | undefined>;
  notes?: string;
  labels?: Record<string, string>;
}): string {
  const { customerName, gender, measurements = {}, notes, labels = {} } = params;
  const lines: string[] = [
    `*Measurements: ${customerName}*`,
  ];
  if (gender) {
    lines.push(`Gender: ${gender.charAt(0).toUpperCase() + gender.slice(1)}`);
  }

  const entries = Object.entries(measurements)
    .filter(([_, val]) => val !== undefined && val !== null && val !== '')
    .map(([key, val]) => {
      const label = labels[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      return `• ${label}: ${val}"`;
    });

  lines.push('');
  if (entries.length > 0) {
    lines.push('*Measurements:*');
    lines.push(...entries);
  } else {
    lines.push('_No measurements recorded yet_');
  }

  if (notes && notes.trim()) {
    lines.push('');
    lines.push(`*Notes:* ${notes.trim()}`);
  }

  lines.push('');
  lines.push(`— via ${APP_CONFIG.name}`);

  return lines.join('\n');
}

/**
 * Formats a digital receipt for standalone walk-in measurement consultations.
 */
export function formatMeasurementConsultationReceipt(consultation: {
  customerName: string;
  fee: number;
  currency?: string;
  shopName: string;
}): string {
  const { customerName, fee, currency = 'NGN', shopName } = consultation;
  return (
    `*Measurement Consultation Receipt*\n` +
    `Client: ${customerName}\n` +
    `Fee: ${formatCurrency(fee, currency)}\n` +
    `Status: Paid\n\n` +
    `Professional anatomical profile recorded for personal/diaspora tailoring.\n\n` +
    `— ${shopName} via ${APP_CONFIG.name}`
  );
}

/**
 * Calculates net piece-rate earnings for an artisan based on completed garments and deductions.
 */
export function calculateArtisanPayout(
  orders: Order[],
  staffId: string,
  ratePerGarment: number,
  advancesDeducted: number = 0
): { completedCount: number; grossEarnings: number; advancesDeducted: number; netPayout: number } {
  const completedCount = orders.filter(
    (o) =>
      (o.assignedTo === staffId || o.artisanAssignments?.some((a) => a.staffId === staffId)) &&
      (o.status === 'Ready' || o.status === 'Delivered')
  ).length;
  const grossEarnings = completedCount * ratePerGarment;
  const netPayout = Math.max(0, grossEarnings - advancesDeducted);
  return { completedCount, grossEarnings, advancesDeducted, netPayout };
}

/**
 * Generates an automated WhatsApp invitation for live video-fittings.
 */
export function getVideoFittingMessage(customerName: string, garmentTitle: string, trackingUrl: string): string {
  return (
    `Good day ${customerName}! Your ${garmentTitle} is prepared on our atelier dress form for your virtual video fitting.\n\n` +
    `View live progress: ${trackingUrl}\n` +
    `Please let us know your availability for a 5-minute video call to confirm the drape before final closure.`
  );
}

/**
 * Compiles a running financial statement of account for high-volume or VIP clients.
 */
export function generateCustomerStatement(customer: Customer, orders: Order[], currency: string = 'NGN'): string {
  const customerOrders = orders.filter((o) => o.customerId === customer.id);
  const totalBilled = customerOrders.reduce((sum, o) => sum + (o.totalBill || 0), 0);
  const totalPaid = customerOrders.reduce((sum, o) => sum + (o.depositPaid || 0), 0);
  const balanceOwed = totalBilled - totalPaid;

  const lines = [
    `*Statement of Account: ${customer.fullName}*`,
    `Total Orders: ${customerOrders.length}`,
    `Total Billed: ${formatCurrency(totalBilled, currency)}`,
    `Total Paid: ${formatCurrency(totalPaid, currency)}`,
    `Outstanding Balance: ${formatCurrency(balanceOwed, currency)}`,
    '',
    '*Order Summary:*',
    ...customerOrders.map(
      (o, idx) =>
        `${idx + 1}. ${o.orderDetails} (${o.status}) - ${formatCurrency(o.totalBill, currency)} [Balance: ${formatCurrency(o.totalBill - o.depositPaid, currency)}]`
    ),
    '',
    `— Sent from ${APP_CONFIG.name}`,
  ];
  return lines.join('\n');
}

/**
 * Generates garment identification bag tags for batch group orders (e.g. Aso Ebi, Wedding parties).
 */
export function generateBatchGarmentTags(
  batchOrders: { customerName: string; role?: string; styleName: string; accessories?: string[] }[]
): string[] {
  return batchOrders.map((item, idx) => {
    const roleStr = item.role ? ` [${item.role}]` : '';
    const accStr = item.accessories && item.accessories.length > 0 ? `\nAccessories: ${item.accessories.join(', ')}` : '';
    return `Tag #${idx + 1}: ${item.customerName}${roleStr}\nStyle: ${item.styleName}${accStr}`;
  });
}

/**
 * Generates a personalized birthday styling message.
 */
export function getBirthdayGreeting(customerName: string, discountPercent: number = 10): string {
  return (
    `Happy Birthday ${customerName.split(' ')[0]}! The team at our atelier wishes you joy, health, and elegance on your special day.\n\n` +
    `As our gift to you, enjoy ${discountPercent}% off workmanship on your next bespoke order this month!`
  );
}

/**
 * Formats a WhatsApp order inquiry message for ready-to-wear showroom pieces with optional accessories.
 */
export function formatShowroomWhatsAppOrderMessage(params: {
  shopName: string;
  styleName: string;
  size: string;
  price: number;
  currency?: string;
  accessories?: Array<{ name: string; price: number }>;
  publicUrl?: string;
}): string {
  const currencyCode = params.currency || 'NGN';
  const formatAmt = (val: number) => formatCurrency(val, currencyCode);

  let total = params.price;
  const lines: string[] = [
    `Hello ${params.shopName}, I am browsing your showroom rack!`,
    '',
    `I would like to reserve:`,
    `* ${params.styleName} (Size: ${params.size}) - ${formatAmt(params.price)}`,
  ];

  if (params.accessories && params.accessories.length > 0) {
    lines.push('', `Style With Accessories:`);
    for (const acc of params.accessories) {
      total += acc.price;
      lines.push(`+ ${acc.name} - ${formatAmt(acc.price)}`);
    }
  }

  lines.push('', `Ensemble Total: ${formatAmt(total)}`);

  if (params.publicUrl) {
    lines.push(`Reference: ${params.publicUrl}`);
  }

  lines.push('', `Is this ensemble currently available for pickup or delivery?`);

  return lines.join('\n');
}


