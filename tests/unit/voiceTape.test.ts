import { describe, it, expect } from 'vitest';
import { parseSpokenNumber, parseVoiceTapeSpeech } from '@/lib/voiceTape';

describe('Voice Tape Parser (Nigerian Market Terminology)', () => {
  describe('parseSpokenNumber', () => {
    it('parses direct digits', () => {
      expect(parseSpokenNumber('42')).toBe(42);
      expect(parseSpokenNumber('42.5')).toBe(42.5);
      expect(parseSpokenNumber('36,5')).toBe(36.5);
    });

    it('parses full word numbers', () => {
      expect(parseSpokenNumber('forty two')).toBe(42);
      expect(parseSpokenNumber('thirty six')).toBe(36);
      expect(parseSpokenNumber('sixteen')).toBe(16);
    });

    it('parses fractions (half, quarter, point five)', () => {
      expect(parseSpokenNumber('forty two and half')).toBe(42.5);
      expect(parseSpokenNumber('thirty six point five')).toBe(36.5);
      expect(parseSpokenNumber('twenty four and a quarter')).toBe(24.25);
      expect(parseSpokenNumber('forty and three quarter')).toBe(40.75);
    });

    it('returns null for gibberish or empty string', () => {
      expect(parseSpokenNumber('')).toBeNull();
      expect(parseSpokenNumber('bring the scissors')).toBeNull();
    });
  });

  describe('parseVoiceTapeSpeech', () => {
    it('parses standard tailor points', () => {
      const res = parseVoiceTapeSpeech('neck 16');
      expect(res).toEqual({
        matchedKey: 'neck',
        value: '16',
        rawText: 'neck 16',
      });
    });

    it('parses Nigerian tailor local terms: lap -> thigh', () => {
      const res = parseVoiceTapeSpeech('lap 25 and half');
      expect(res).toEqual({
        matchedKey: 'thigh',
        value: '25.5',
        rawText: 'lap 25 and half',
      });
    });

    it('parses Nigerian tailor local terms: boss/burst -> chest/bust', () => {
      const res = parseVoiceTapeSpeech('boss 42', ['chest', 'shoulder', 'neck']);
      expect(res).toEqual({
        matchedKey: 'chest',
        value: '42',
        rawText: 'boss 42',
      });
    });

    it('parses Nigerian tailor local terms: hand / hand length -> sleeveLength', () => {
      const res = parseVoiceTapeSpeech('hand length 26 point 5');
      expect(res).toEqual({
        matchedKey: 'sleeveLength',
        value: '26.5',
        rawText: 'hand length 26 point 5',
      });
    });

    it('parses Nigerian tailor local terms: tommy / belly -> waist', () => {
      const res = parseVoiceTapeSpeech('tommy thirty four');
      expect(res).toEqual({
        matchedKey: 'waist',
        value: '34',
        rawText: 'tommy thirty four',
      });
    });

    it('parses stand-alone numbers when active on a field', () => {
      const res = parseVoiceTapeSpeech('38.5');
      expect(res).toEqual({
        value: '38.5',
        rawText: '38.5',
      });
    });

    it('routes unmapped custom fitting observations to notes', () => {
      const res = parseVoiceTapeSpeech('dropped left shoulder 2 inches');
      expect(res?.isCustomNote).toBe(true);
      expect(res?.value).toBe('dropped left shoulder 2 inches');
    });

    it('safely filters out ambient shop chatter with no numbers', () => {
      const res = parseVoiceTapeSpeech('Chinedu where is my tailor chalk');
      expect(res).toBeNull();
    });
  });
});

