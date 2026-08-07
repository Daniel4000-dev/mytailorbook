import { describe, it, expect } from "vitest";
import { formatCurrency, getCurrencySymbol } from '../../lib/formatters';

describe('currency formatter', () => {
  it('formats NGN by default', () => {
    expect(formatCurrency(1500)).toBe('₦1,500');
  });
  
  it('formats USD correctly', () => {
    expect(formatCurrency(1500, 'USD')).toBe('$1,500');
  });

  it('gets correct symbols', () => {
    expect(getCurrencySymbol('NGN')).toBe('₦');
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('GBP')).toBe('£');
  });
});
