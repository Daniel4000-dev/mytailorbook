import { describe, it, expect } from 'vitest';
import { validatePhoneNumber } from '@/lib/phoneValidation';

describe('validatePhoneNumber', () => {
  describe('Nigerian phone numbers', () => {
    it('accepts valid 11-digit local Nigerian numbers starting with 0', () => {
      expect(validatePhoneNumber('08031234567').isValid).toBe(true);
      expect(validatePhoneNumber('07012345678').isValid).toBe(true);
      expect(validatePhoneNumber('09012345678').isValid).toBe(true);
      expect(validatePhoneNumber('08123456789').isValid).toBe(true);
      expect(validatePhoneNumber('09123456789').isValid).toBe(true);
    });

    it('rejects incomplete local Nigerian numbers (less than 11 digits)', () => {
      const res = validatePhoneNumber('0803123456'); // 10 digits
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Nigerian numbers starting with 0 must have 11 digits');
    });

    it('rejects overly long local Nigerian numbers (more than 11 digits)', () => {
      const res = validatePhoneNumber('080312345678'); // 12 digits
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Nigerian numbers starting with 0 must have 11 digits');
    });

    it('accepts valid international Nigerian numbers (+234 with 10 digits)', () => {
      const res = validatePhoneNumber('+2348031234567');
      expect(res.isValid).toBe(true);
      expect(res.countryCode).toBe('NG');
    });

    it('rejects incomplete international Nigerian numbers (+234 with less than 10 digits)', () => {
      const res = validatePhoneNumber('+234803123456'); // 9 digits after 234
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('10 digits required after +234');
    });

    it('rejects overly long international Nigerian numbers (+234 with more than 10 digits)', () => {
      const res = validatePhoneNumber('+23480312345678'); // 11 digits after 234
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('10 digits required after +234');
    });

    it('accepts 10-digit national subscriber numbers starting with 7, 8, 9', () => {
      expect(validatePhoneNumber('8031234567').isValid).toBe(true);
      expect(validatePhoneNumber('7012345678').isValid).toBe(true);
      expect(validatePhoneNumber('9012345678').isValid).toBe(true);
    });
  });

  describe('Other countries', () => {
    it('validates US and Canada numbers (+1 followed by 10 digits)', () => {
      expect(validatePhoneNumber('+12025550123').isValid).toBe(true);

      const tooShort = validatePhoneNumber('+1202555012'); // 9 digits
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.error).toContain('10 digits required after +1');

      const tooLong = validatePhoneNumber('+120255501234'); // 11 digits
      expect(tooLong.isValid).toBe(false);
      expect(tooLong.error).toContain('too many digits');
    });

    it('validates UK numbers (+44 followed by 10 digits)', () => {
      expect(validatePhoneNumber('+447700900000').isValid).toBe(true);

      const tooShort = validatePhoneNumber('+44770090000'); // 9 digits
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.error).toContain('10 digits required after +44');
    });

    it('validates Ghana numbers (+233 followed by 9 digits)', () => {
      expect(validatePhoneNumber('+233241234567').isValid).toBe(true);

      const tooShort = validatePhoneNumber('+23324123456'); // 8 digits
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.error).toContain('9 digits required after +233');
    });

    it('validates Kenya numbers (+254 followed by 9 digits)', () => {
      expect(validatePhoneNumber('+254712345678').isValid).toBe(true);

      const tooShort = validatePhoneNumber('+25471234567'); // 8 digits
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.error).toContain('9 digits required after +254');
    });

    it('validates South Africa numbers (+27 followed by 9 digits)', () => {
      expect(validatePhoneNumber('+27821234567').isValid).toBe(true);

      const tooShort = validatePhoneNumber('+2782123456'); // 8 digits
      expect(tooShort.isValid).toBe(false);
      expect(tooShort.error).toContain('9 digits required after +27');
    });
  });

  describe('Invalid inputs', () => {
    it('rejects empty or whitespace phone numbers', () => {
      expect(validatePhoneNumber('').isValid).toBe(false);
      expect(validatePhoneNumber('   ').isValid).toBe(false);
    });

    it('rejects phone numbers with letters', () => {
      const res = validatePhoneNumber('08031234abc');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('invalid characters');
    });

    it('rejects numbers shorter than minimum length', () => {
      const res = validatePhoneNumber('12345');
      expect(res.isValid).toBe(false);
    });

    it('rejects numbers longer than 15 digits', () => {
      const res = validatePhoneNumber('+1234567890123456');
      expect(res.isValid).toBe(false);
    });
  });
});

