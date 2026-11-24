/**
 * Comprehensive phone number validation by country and ITU-T E.164 standards.
 * Ensures Nigerian numbers have the full required 11 digits (or +234 with 10 digits),
 * and validates international country requirements to catch input errors before save.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  countryCode?: string;
  countryName?: string;
  normalized?: string;
}

/**
 * Validates a phone number based on its dial code and national length specifications.
 *
 * Requirements:
 * - Nigeria:
 *   - Local format (starts with 0): exactly 11 digits (e.g. 0803 123 4567)
 *   - International (+234 / 234): exactly 13 digits (e.g. +234 803 123 4567)
 *   - National subscriber (starts with 7, 8, 9): exactly 10 digits
 * - United States / Canada (+1): exactly 11 digits (1 + 10 digits)
 * - United Kingdom (+44): exactly 12 digits (44 + 10 digits)
 * - Ghana (+233): exactly 12 digits (233 + 9 digits)
 * - Kenya (+254): exactly 12 digits (254 + 9 digits)
 * - South Africa (+27): exactly 11 digits (27 + 9 digits)
 * - Other international (+X): 8 to 15 digits (ITU-T E.164)
 */
export function validatePhoneNumber(rawPhone: string): PhoneValidationResult {
  const phone = rawPhone ? rawPhone.trim() : '';
  if (!phone) {
    return { isValid: false, error: 'Phone number is required.' };
  }

  // Reject strings containing letters or invalid non-dial characters
  if (/[^\d+\s\-().]/.test(phone)) {
    return { isValid: false, error: 'Phone number contains invalid characters.' };
  }

  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return { isValid: false, error: 'Phone number has no digits.' };
  }

  const hasPlus = phone.startsWith('+');

  // 1. Explicit Nigerian Country Code with '+' (+234)
  if (hasPlus && digits.startsWith('234')) {
    const subscriber = digits.slice(3);
    if (subscriber.length < 10) {
      return {
        isValid: false,
        error: `Incomplete Nigerian phone number: 10 digits required after +234 (currently has ${subscriber.length}).`,
      };
    }
    if (subscriber.length > 10) {
      return {
        isValid: false,
        error: `Nigerian phone number with +234 has too many digits (10 digits required after +234, currently has ${subscriber.length}).`,
      };
    }
    return { isValid: true, countryCode: 'NG', countryName: 'Nigeria', normalized: digits };
  }

  // 2. Local Nigerian format starting with 0 (e.g. 0803..., 070..., 090..., 081..., 091...)
  if (digits.startsWith('0')) {
    if (digits.length < 11) {
      return {
        isValid: false,
        error: `Incomplete phone number: Nigerian numbers starting with 0 must have 11 digits (currently has ${digits.length}).`,
      };
    }
    if (digits.length > 11) {
      return {
        isValid: false,
        error: `Phone number has too many digits: Nigerian numbers starting with 0 must have 11 digits (currently has ${digits.length}).`,
      };
    }
    return { isValid: true, countryCode: 'NG', countryName: 'Nigeria', normalized: `234${digits.slice(1)}` };
  }

  // 3. Nigerian country code '234' without '+'
  if (digits.startsWith('234') && digits.length >= 12) {
    const subscriber = digits.slice(3);
    if (subscriber.length < 10) {
      return {
        isValid: false,
        error: `Incomplete Nigerian phone number: 10 digits required after 234 (currently has ${subscriber.length}).`,
      };
    }
    if (subscriber.length > 10) {
      return {
        isValid: false,
        error: `Nigerian phone number with 234 has too many digits (10 digits required after 234, currently has ${subscriber.length}).`,
      };
    }
    return { isValid: true, countryCode: 'NG', countryName: 'Nigeria', normalized: digits };
  }

  // 4. US / Canada (+1)
  if (hasPlus && digits.startsWith('1')) {
    const subscriber = digits.slice(1);
    if (subscriber.length < 10) {
      return {
        isValid: false,
        error: `Incomplete US/Canada phone number: 10 digits required after +1 (currently has ${subscriber.length}).`,
      };
    }
    if (subscriber.length > 10) {
      return {
        isValid: false,
        error: `US/Canada phone number has too many digits (10 digits required after +1).`,
      };
    }
    return { isValid: true, countryCode: 'US', countryName: 'United States', normalized: digits };
  }

  // 5. United Kingdom (+44)
  if (hasPlus && digits.startsWith('44')) {
    const subscriber = digits.slice(2);
    if (subscriber.length < 10) {
      return {
        isValid: false,
        error: `Incomplete UK phone number: 10 digits required after +44 (currently has ${subscriber.length}).`,
      };
    }
    if (subscriber.length > 10) {
      return {
        isValid: false,
        error: `UK phone number has too many digits (10 digits required after +44).`,
      };
    }
    return { isValid: true, countryCode: 'GB', countryName: 'United Kingdom', normalized: digits };
  }

  // 6. Ghana (+233)
  if (hasPlus && digits.startsWith('233')) {
    const subscriber = digits.slice(3);
    if (subscriber.length < 9) {
      return {
        isValid: false,
        error: `Incomplete Ghana phone number: 9 digits required after +233 (currently has ${subscriber.length}).`,
      };
    }
    if (subscriber.length > 9) {
      return {
        isValid: false,
        error: `Ghana phone number has too many digits (9 digits required after +233).`,
      };
    }
    return { isValid: true, countryCode: 'GH', countryName: 'Ghana', normalized: digits };
  }

  // 7. Kenya (+254)
  if (hasPlus && digits.startsWith('254')) {
    const subscriber = digits.slice(3);
    if (subscriber.length < 9) {
      return {
        isValid: false,
        error: `Incomplete Kenya phone number: 9 digits required after +254 (currently has ${subscriber.length}).`,
      };
    }
    if (subscriber.length > 9) {
      return {
        isValid: false,
        error: `Kenya phone number has too many digits (9 digits required after +254).`,
      };
    }
    return { isValid: true, countryCode: 'KE', countryName: 'Kenya', normalized: digits };
  }

  // 8. South Africa (+27)
  if (hasPlus && digits.startsWith('27')) {
    const subscriber = digits.slice(2);
    if (subscriber.length < 9) {
      return {
        isValid: false,
        error: `Incomplete South Africa phone number: 9 digits required after +27 (currently has ${subscriber.length}).`,
      };
    }
    if (subscriber.length > 9) {
      return {
        isValid: false,
        error: `South Africa phone number has too many digits (9 digits required after +27).`,
      };
    }
    return { isValid: true, countryCode: 'ZA', countryName: 'South Africa', normalized: digits };
  }

  // 9. Standard 10-digit Nigerian national subscriber without leading 0 (e.g. 8031234567)
  if (!hasPlus && digits.length === 10 && /^[789]/.test(digits)) {
    return { isValid: true, countryCode: 'NG', countryName: 'Nigeria', normalized: `234${digits}` };
  }

  // 10. General International (+ followed by other dial codes)
  if (hasPlus) {
    if (digits.length < 8) {
      return {
        isValid: false,
        error: `Incomplete international phone number (minimum 8 digits required, currently has ${digits.length}).`,
      };
    }
    if (digits.length > 15) {
      return {
        isValid: false,
        error: `International phone number has too many digits (maximum 15 digits allowed).`,
      };
    }
    return { isValid: true, normalized: digits };
  }

  // 11. No country code and does not start with 0
  if (digits.length < 10) {
    return {
      isValid: false,
      error: `Incomplete phone number: Nigerian numbers require 11 digits (e.g. 0803 123 4567), or include international code (e.g. +44...).`,
    };
  }

  if (digits.length === 11) {
    return { isValid: true, countryCode: 'NG', countryName: 'Nigeria', normalized: `234${digits.slice(1)}` };
  }

  if (digits.length > 15) {
    return {
      isValid: false,
      error: `Phone number has too many digits (maximum 15 digits).`,
    };
  }

  return { isValid: true, normalized: digits };
}

