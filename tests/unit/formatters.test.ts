import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  normalizePhone,
  formatPhone,
  isValidPhone,
  truncateText,
  getInitials,
  formatMonthYear,
  formatShortMonthYear,
  getWhatsAppLink,
  getOrderProgressMessage,
} from '@/lib/formatters';

describe('formatCurrency', () => {
  it('formats whole naira amounts with the currency symbol and comma grouping', () => {
    expect(formatCurrency(1500000)).toBe('₦1,500,000');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₦0');
  });

  it('rounds to whole naira (no decimals)', () => {
    expect(formatCurrency(1500000.75)).toBe('₦1,500,001');
  });
});

describe('formatNumber', () => {
  it('adds comma separators with no currency symbol', () => {
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

  it('leaves an already-prefixed number untouched', () => {
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

  it('falls back to a bare +prefix for a too-short number', () => {
    expect(formatPhone('123')).toBe('+234123');
  });
});

describe('isValidPhone', () => {
  it('accepts a valid 13-digit normalized Nigerian number', () => {
    expect(isValidPhone('08012345678')).toBe(true);
  });

  it('rejects a number that is too short', () => {
    expect(isValidPhone('080123')).toBe(false);
  });

  it('rejects a number with the wrong country prefix', () => {
    expect(isValidPhone('14155552671')).toBe(false);
  });
});

describe('truncateText', () => {
  it('returns the original string when under the limit', () => {
    expect(truncateText('short', 10)).toBe('short');
  });

  it('truncates and appends an ellipsis when over the limit', () => {
    expect(truncateText('this is a long sentence', 10)).toBe('this is a…');
  });
});

describe('getInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getInitials('Adebayo Ogunlesi')).toBe('AO');
  });

  it('uppercases lowercase input', () => {
    expect(getInitials('jane doe')).toBe('JD');
  });

  it('handles a single-word name', () => {
    expect(getInitials('Cher')).toBe('C');
  });

  it('ignores extra whitespace between words', () => {
    expect(getInitials('  Ada   Lovelace  ')).toBe('AL');
  });
});

describe('formatMonthYear / formatShortMonthYear', () => {
  it('formats a full month and year', () => {
    expect(formatMonthYear('2024-03-15T14:30:00Z')).toBe('March 2024');
  });

  it('formats an abbreviated month and year', () => {
    expect(formatShortMonthYear('2024-03-15T14:30:00Z')).toBe('Mar 2024');
  });
});

describe('getWhatsAppLink', () => {
  it('builds a bare wa.me link with no message', () => {
    expect(getWhatsAppLink('08012345678')).toBe('https://wa.me/2348012345678');
  });

  it('URL-encodes a pre-filled message', () => {
    const link = getWhatsAppLink('08012345678', 'Hi there!');
    expect(link).toBe('https://wa.me/2348012345678?text=Hi%20there!');
  });
});

describe('getOrderProgressMessage', () => {
  it('substitutes name, shop, and link into the built-in default for a stage', () => {
    const message = getOrderProgressMessage({
      customerName: 'Chioma Eze',
      shopName: 'Baan Wears',
      status: 'Cutting',
      trackingUrl: 'https://sabitailors.com/track/abc123',
    });
    expect(message).toContain('Chioma');
    expect(message).toContain('Baan Wears');
    expect(message).toContain('https://sabitailors.com/track/abc123');
    expect(message).not.toContain('{name}');
    expect(message).not.toContain('{shop}');
    expect(message).not.toContain('{link}');
  });

  it('uses only the first name even when given a full name', () => {
    const message = getOrderProgressMessage({
      customerName: 'Chioma Eze',
      shopName: 'Baan Wears',
      status: 'Ready',
      trackingUrl: 'https://sabitailors.com/track/abc123',
    });
    expect(message).toContain('Chioma');
    expect(message).not.toContain('Chioma Eze');
  });

  it('prefers a custom template over the built-in default when provided', () => {
    const message = getOrderProgressMessage({
      customerName: 'Chioma Eze',
      shopName: 'Baan Wears',
      status: 'Cutting',
      trackingUrl: 'https://sabitailors.com/track/abc123',
      customTemplate: 'Hey {name}, custom update from {shop}: {link}',
    });
    expect(message).toBe('Hey Chioma, custom update from Baan Wears: https://sabitailors.com/track/abc123');
  });
});
