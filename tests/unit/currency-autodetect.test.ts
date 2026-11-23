import { describe, it, expect } from 'vitest';
import {
  detectCountryAndCurrencyFromPhone,
  getCurrencyForCountry,
  getShopCurrency,
} from '@/lib/currency';

describe('Currency and Country Auto-Detection', () => {
  describe('detectCountryAndCurrencyFromPhone', () => {
    it('detects United Kingdom and GBP from +44 phone', () => {
      const res = detectCountryAndCurrencyFromPhone('+447911123456');
      expect(res.countryCode).toBe('GB');
      expect(res.countryName).toBe('United Kingdom');
      expect(res.currency).toBe('GBP');
    });

    it('detects Ghana and GHS from +233 phone', () => {
      const res = detectCountryAndCurrencyFromPhone('+233241234567');
      expect(res.countryCode).toBe('GH');
      expect(res.countryName).toBe('Ghana');
      expect(res.currency).toBe('GHS');
    });

    it('detects Kenya and KES from +254 phone', () => {
      const res = detectCountryAndCurrencyFromPhone('+254712345678');
      expect(res.countryCode).toBe('KE');
      expect(res.countryName).toBe('Kenya');
      expect(res.currency).toBe('KES');
    });

    it('detects United States and USD from +1 phone', () => {
      const res = detectCountryAndCurrencyFromPhone('+15551234567');
      expect(res.countryCode).toBe('US');
      expect(res.countryName).toBe('United States');
      expect(res.currency).toBe('USD');
    });

    it('detects Nigeria and NGN from +234 phone', () => {
      const res = detectCountryAndCurrencyFromPhone('+2348031234567');
      expect(res.countryCode).toBe('NG');
      expect(res.countryName).toBe('Nigeria');
      expect(res.currency).toBe('NGN');
    });

    it('handles empty or invalid phone gracefully', () => {
      expect(detectCountryAndCurrencyFromPhone('')).toEqual({});
      expect(detectCountryAndCurrencyFromPhone(null)).toEqual({});
      expect(detectCountryAndCurrencyFromPhone('abc')).toEqual({});
    });
  });

  describe('getCurrencyForCountry', () => {
    it('resolves currency from 2-letter country code', () => {
      expect(getCurrencyForCountry('GB')).toBe('GBP');
      expect(getCurrencyForCountry('gh')).toBe('GHS');
      expect(getCurrencyForCountry('KE')).toBe('KES');
      expect(getCurrencyForCountry('US')).toBe('USD');
      expect(getCurrencyForCountry('ZA')).toBe('ZAR');
      expect(getCurrencyForCountry('NG')).toBe('NGN');
      expect(getCurrencyForCountry('DE')).toBe('EUR');
    });

    it('resolves currency from full country name', () => {
      expect(getCurrencyForCountry('United Kingdom')).toBe('GBP');
      expect(getCurrencyForCountry('Ghana')).toBe('GHS');
      expect(getCurrencyForCountry('Kenya')).toBe('KES');
      expect(getCurrencyForCountry('Nigeria')).toBe('NGN');
      expect(getCurrencyForCountry('South Africa')).toBe('ZAR');
    });

    it('falls back to NGN for unknown or empty country', () => {
      expect(getCurrencyForCountry('')).toBe('NGN');
      expect(getCurrencyForCountry(null)).toBe('NGN');
      expect(getCurrencyForCountry('Atlantis')).toBe('NGN');
    });
  });

  describe('getShopCurrency', () => {
    it('respects explicitly chosen non-NGN currency even if in another country', () => {
      expect(
        getShopCurrency({
          country: 'Ghana',
          currency: 'USD',
        })
      ).toBe('USD');
    });

    it('auto-resolves country currency if currency is default NGN but country is UK', () => {
      expect(
        getShopCurrency({
          country: 'United Kingdom',
          currency: 'NGN',
        })
      ).toBe('GBP');
    });

    it('auto-resolves from phone prefix if country and currency are unset', () => {
      expect(
        getShopCurrency({
          phone: '+447911123456',
        })
      ).toBe('GBP');

      expect(
        getShopCurrency({
          phone: '+233241234567',
        })
      ).toBe('GHS');
    });

    it('defaults to NGN if shop is in Nigeria or unset', () => {
      expect(getShopCurrency(null)).toBe('NGN');
      expect(getShopCurrency({ country: 'Nigeria' })).toBe('NGN');
      expect(getShopCurrency({})).toBe('NGN');
    });
  });
});
