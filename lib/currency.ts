/**
 * Centralized currency and country intelligence for MyTailorBook.
 * Auto-detects country and currency from international phone numbers and shop profiles,
 * while allowing artisans full flexibility to override and select any currency.
 */

import { COUNTRIES } from '@/components/ui/PhoneInput/countries';

export const COUNTRY_CODE_TO_CURRENCY: Record<string, string> = {
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  ZA: 'ZAR',
  GB: 'GBP',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  TZ: 'TZS',
  UG: 'UGX',
  RW: 'RWF',
  CM: 'XAF',
  CI: 'XOF',
  SN: 'XOF',
  ML: 'XOF',
  EG: 'EGP',
  MA: 'MAD',
  ZM: 'ZMW',
  ZW: 'ZWL',
  AE: 'AED',
  SA: 'SAR',
  IN: 'INR',
  CN: 'CNY',
  JP: 'JPY',
  BR: 'BRL',
  MX: 'MXN',
};

// Sorted by dial code length descending so longer codes (e.g. +234, +233, +254) match before shorter ones (+1, +44)
export const DIAL_CODE_TO_COUNTRY_CODE: Array<{ dialCode: string; countryCode: string }> = [
  { dialCode: '234', countryCode: 'NG' },
  { dialCode: '233', countryCode: 'GH' },
  { dialCode: '254', countryCode: 'KE' },
  { dialCode: '255', countryCode: 'TZ' },
  { dialCode: '256', countryCode: 'UG' },
  { dialCode: '250', countryCode: 'RW' },
  { dialCode: '237', countryCode: 'CM' },
  { dialCode: '225', countryCode: 'CI' },
  { dialCode: '221', countryCode: 'SN' },
  { dialCode: '223', countryCode: 'ML' },
  { dialCode: '212', countryCode: 'MA' },
  { dialCode: '260', countryCode: 'ZM' },
  { dialCode: '263', countryCode: 'ZW' },
  { dialCode: '971', countryCode: 'AE' },
  { dialCode: '966', countryCode: 'SA' },
  { dialCode: '44', countryCode: 'GB' },
  { dialCode: '49', countryCode: 'DE' },
  { dialCode: '33', countryCode: 'FR' },
  { dialCode: '39', countryCode: 'IT' },
  { dialCode: '34', countryCode: 'ES' },
  { dialCode: '91', countryCode: 'IN' },
  { dialCode: '86', countryCode: 'CN' },
  { dialCode: '81', countryCode: 'JP' },
  { dialCode: '61', countryCode: 'AU' },
  { dialCode: '55', countryCode: 'BR' },
  { dialCode: '52', countryCode: 'MX' },
  { dialCode: '27', countryCode: 'ZA' },
  { dialCode: '20', countryCode: 'EG' },
  { dialCode: '1', countryCode: 'US' }, // Shared with CA; defaults to US/USD
];

/**
 * Detects country name, country code, and currency from a phone number string.
 * Example: "+447911123456" -> { countryCode: 'GB', countryName: 'United Kingdom', currency: 'GBP' }
 */
export function detectCountryAndCurrencyFromPhone(phone?: string | null): {
  countryCode?: string;
  countryName?: string;
  currency?: string;
} {
  if (!phone) return {};
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return {};

  for (const { dialCode, countryCode } of DIAL_CODE_TO_COUNTRY_CODE) {
    if (cleaned.startsWith(dialCode)) {
      const countryObj = COUNTRIES.find((c) => c.code === countryCode);
      const currency = COUNTRY_CODE_TO_CURRENCY[countryCode] || 'NGN';
      return {
        countryCode,
        countryName: countryObj?.name,
        currency,
      };
    }
  }

  return {};
}

/**
 * Resolves a currency code from a country name or ISO country code.
 * Example: "United Kingdom" -> "GBP", "GH" -> "GHS"
 */
export function getCurrencyForCountry(countryOrCode?: string | null): string {
  if (!countryOrCode) return 'NGN';
  const clean = countryOrCode.trim();

  // Check direct 2-letter code
  const upperCode = clean.toUpperCase();
  if (COUNTRY_CODE_TO_CURRENCY[upperCode]) {
    return COUNTRY_CODE_TO_CURRENCY[upperCode];
  }

  // Check by matching country name
  const matched = COUNTRIES.find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (matched && COUNTRY_CODE_TO_CURRENCY[matched.code]) {
    return COUNTRY_CODE_TO_CURRENCY[matched.code];
  }

  return 'NGN';
}

/**
 * Robust shop currency resolver.
 * Priority cascade:
 * 1. Explicit shop.currency if !== 'NGN'.
 * 2. If shop.currency is 'NGN' (or empty):
 *    - Check if shop.country or shop.countryCode or shop.phone explicitly indicates a non-Nigerian shop.
 *    - If so, return that country's currency.
 * 3. Fallback: 'NGN'.
 */
export function getShopCurrency(
  shop?: {
    currency?: string | null;
    country?: string | null;
    countryCode?: string | null;
    country_code?: string | null;
    phone?: string | null;
  } | null
): string {
  if (!shop) return 'NGN';

  // If user explicitly chose a non-NGN currency (e.g. USD, GBP, GHS, EUR), always respect it
  if (shop.currency && shop.currency !== 'NGN') {
    return shop.currency;
  }

  // If currency is 'NGN' or unset, check if the shop is located outside Nigeria
  const countryParam = shop.countryCode || shop.country_code || shop.country;
  if (countryParam) {
    const derived = getCurrencyForCountry(countryParam);
    if (derived && derived !== 'NGN') {
      return derived;
    }
  }

  // If country is still unset/ambiguous, check the phone prefix
  if (shop.phone) {
    const detected = detectCountryAndCurrencyFromPhone(shop.phone);
    if (detected.currency && detected.currency !== 'NGN') {
      return detected.currency;
    }
  }

  return shop.currency || 'NGN';
}
