import { describe, it, expect, vi } from 'vitest';
import { getWorkshopCrestDataUrl, loadShopLogoAsDataUrl, formatReceiptTimestamp } from '@/lib/receipt';

describe('Bespoke Receipt & OPay Styling Suite', () => {
  describe('Workshop Crest Monogram Generation (Fallback & Reliability)', () => {
    it('generates rich initials and valid SVG Data URL for multi-word workshop names', () => {
      const dataUrl = getWorkshopCrestDataUrl('Daniel Bespoke');
      expect(dataUrl).toContain('data:image/svg+xml;utf8,');
      expect(dataUrl).toContain('DB');
      expect(dataUrl).toContain('BESPOKE');
    });

    it('generates single-word or short shop initials for sparse shop data', () => {
      const dataUrl = getWorkshopCrestDataUrl('Olu');
      expect(dataUrl).toContain('data:image/svg+xml;utf8,');
      expect(dataUrl).toContain('OL');
    });

    it('handles edge-case and corrupted inputs gracefully without throwing', () => {
      expect(getWorkshopCrestDataUrl(null)).toContain('data:image/svg+xml;utf8,');
      expect(getWorkshopCrestDataUrl(undefined)).toContain('data:image/svg+xml;utf8,');
      expect(getWorkshopCrestDataUrl('')).toContain('data:image/svg+xml;utf8,');
      expect(getWorkshopCrestDataUrl('   ')).toContain('data:image/svg+xml;utf8,');
      expect(getWorkshopCrestDataUrl('Z')).toContain('data:image/svg+xml;utf8,');
    });
  });

  describe('OPay-Style Timestamp Formatting', () => {
    it('formats a rich Date into exact OPay receipt format with seconds', () => {
      const testDate = new Date('2026-11-24T12:22:23Z');
      const formatted = formatReceiptTimestamp(testDate);
      expect(formatted).toMatch(/Nov 24th, 2026/);
    });

    it('handles sparse inputs by defaulting to current time', () => {
      const formatted = formatReceiptTimestamp(null);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('handles edge-case corrupted date strings gracefully', () => {
      const formatted = formatReceiptTimestamp('invalid-date-string');
      expect(formatted).toBe('');
    });
  });

  describe('Shop Logo Data URL Preloading', () => {
    it('returns data URL immediately when logo is already base64', async () => {
      const input = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const output = await loadShopLogoAsDataUrl(input);
      expect(output).toBe(input);
    });

    it('handles empty logo URLs by returning empty string', async () => {
      const output = await loadShopLogoAsDataUrl('');
      expect(output).toBe('');
    });
  });
});
