import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  normalizePhone,
  formatPhone,
  isValidPhone,
  truncateText,
  getInitials,
  getWhatsAppLink,
  getOrderProgressMessage,
  getLoyaltyTier,
  getDaysUntilAnnualDate,
  getDaysSince,
  formatMeasurementLabel,
} from '@/lib/formatters';

describe('formatCurrency', () => {
  it('formats whole naira amounts with the currency symbol and commas', () => {
    expect(formatCurrency(1500000)).toBe('₦1,500,000');
    expect(formatCurrency(0)).toBe('₦0');
  });
});

describe('formatNumber', () => {
  it('formats numbers with comma separation and no currency symbol', () => {
    expect(formatNumber(1500000)).toBe('1,500,000');
  });
});

describe('normalizePhone', () => {
  it('converts a leading 0 to the 234 prefix', () => {
    expect(normalizePhone('08012345678')).toBe('2348012345678');
  });

  it('adds the 234 prefix when missing entirely', () => {
    expect(normalizePhone('8012345678')).toBe('2348012345678');
  });

  it('leaves an already-prefixed number unchanged', () => {
    expect(normalizePhone('2348012345678')).toBe('2348012345678');
  });

  it('strips non-digit characters before normalizing', () => {
    expect(normalizePhone('+234 801 234 5678')).toBe('2348012345678');
  });
});

describe('formatPhone', () => {
  it('formats a normalized number into +234 xxx xxx xxxx groups', () => {
    expect(formatPhone('08012345678')).toBe('+234 801 234 5678');
  });
});

describe('isValidPhone', () => {
  it('accepts a valid 13-digit 234-prefixed number', () => {
    expect(isValidPhone('08012345678')).toBe(true);
  });

  it('rejects a too-short number', () => {
    expect(isValidPhone('080123')).toBe(false);
  });
});

describe('truncateText', () => {
  it('leaves short text unchanged', () => {
    expect(truncateText('Agbada', 20)).toBe('Agbada');
  });

  it('truncates long text with an ellipsis', () => {
    expect(truncateText('A very long garment description here', 10)).toBe('A very lon…');
  });
});

describe('getInitials', () => {
  it('takes the first letter of up to two words', () => {
    expect(getInitials('Adebayo Ogunlesi')).toBe('AO');
  });

  it('handles a single name', () => {
    expect(getInitials('Adebayo')).toBe('A');
  });
});

describe('getWhatsAppLink', () => {
  it('builds a bare wa.me link with no message', () => {
    expect(getWhatsAppLink('08012345678')).toBe('https://wa.me/2348012345678');
  });

  it('appends an encoded pre-filled message', () => {
    const link = getWhatsAppLink('08012345678', 'Hi there');
    expect(link).toBe('https://wa.me/2348012345678?text=Hi%20there');
  });
});

describe('getOrderProgressMessage', () => {
  it('uses the customer\'s first name and includes the tracking link', () => {
    const msg = getOrderProgressMessage({
      customerName: 'Adebayo Ogunlesi',
      shopName: 'Test Studio',
      status: 'Cutting',
      trackingUrl: 'https://example.com/track/123',
    });
    expect(msg).toContain('Adebayo');
    expect(msg).toContain('Test Studio');
    expect(msg).toContain('cutting');
    expect(msg).toContain('https://example.com/track/123');
  });
});

describe('getLoyaltyTier', () => {
  it('classifies a first-time customer as new', () => {
    expect(getLoyaltyTier(0)).toEqual({ label: 'New Customer', tier: 'new' });
    expect(getLoyaltyTier(1)).toEqual({ label: 'New Customer', tier: 'new' });
  });

  it('classifies 2-4 orders as regular', () => {
    expect(getLoyaltyTier(2)).toEqual({ label: 'Regular Customer', tier: 'regular' });
    expect(getLoyaltyTier(4)).toEqual({ label: 'Regular Customer', tier: 'regular' });
  });

  it('classifies 5+ orders as VIP', () => {
    expect(getLoyaltyTier(5)).toEqual({ label: 'VIP Customer', tier: 'vip' });
    expect(getLoyaltyTier(20)).toEqual({ label: 'VIP Customer', tier: 'vip' });
  });
});

describe('getDaysUntilAnnualDate', () => {
  it('returns 0 for a birthday that is today', () => {
    const today = new Date();
    const iso = `1990-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(getDaysUntilAnnualDate(iso)).toBe(0);
  });

  it('wraps around to next year when the date already passed this year', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // A date that already occurred this year should be ~364/365 days out, not negative.
    const iso = `1990-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const result = getDaysUntilAnnualDate(iso);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(300);
  });

  it('returns null for an invalid date string', () => {
    expect(getDaysUntilAnnualDate('not-a-date')).toBeNull();
  });
});

describe('getDaysSince', () => {
  it('returns 0 for a timestamp from today', () => {
    expect(getDaysSince(new Date().toISOString())).toBe(0);
  });

  it('never returns a negative number for a future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(getDaysSince(future.toISOString())).toBe(0);
  });

  it('counts whole days elapsed for a past date', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    expect(getDaysSince(tenDaysAgo.toISOString())).toBe(10);
  });
});

describe('formatMeasurementLabel', () => {
  it('splits camelCase into title-cased words', () => {
    expect(formatMeasurementLabel('shoulderToBustPoint')).toBe('Shoulder To Bust Point');
    expect(formatMeasurementLabel('chest')).toBe('Chest');
  });
});
