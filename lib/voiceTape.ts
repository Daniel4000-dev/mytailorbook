/**
 * Nigerian Bespoke Voice-to-Tape Measurement Parser.
 *
 * Designed for market stalls and busy workshops where tailors hold the tape
 * measure with both hands and speak measurements using local Nigerian tailor
 * terminology (e.g. "lap", "boss/burst", "hand", "tommy/belly", "half length").
 *
 * Implements strict numeric safety gating to ensure background market noise
 * or passing chatter never corrupts fabric cutting numbers.
 */

export const TAILOR_TERM_MAP: Record<string, string[]> = {
  neck: ['neck', 'collar', 'neckline', 'throat'],
  shoulder: ['shoulder', 'shoulders', 'back', 'across back', 'cross back', 'shoulder bone'],
  chest: ['chest', 'breast', 'boss', 'burst', 'body'],
  bust: ['bust', 'boss', 'burst', 'front bust', 'full bust'],
  underBust: ['under bust', 'underbust', 'under boss', 'under burst', 'under breast'],
  waist: ['waist', 'tommy', 'tummy', 'belly', 'stomach', 'navel'],
  hips: ['hip', 'hips', 'seat', 'bum', 'yansh', 'buttocks'],
  thigh: ['thigh', 'thighs', 'lap', 'laps', 'upper leg'],
  knee: ['knee', 'knees', 'round knee'],
  ankle: ['ankle', 'ankles', 'leg', 'pencil', 'base', 'cuff', 'leg opening', 'foot'],
  sleeveLength: ['sleeve', 'sleeve length', 'sleeves', 'hand', 'hand length', 'arm', 'arm length', 'full hand', 'short hand'],
  armHole: ['arm hole', 'armhole', 'round arm', 'round hand', 'muscle', 'bicep', 'armpit'],
  wrist: ['wrist', 'wrists', 'round wrist', 'cuff size'],
  shirtLength: ['top length', 'shirt length', 'top', 'shirt', 'jacket length', 'jacket', 'buba length', 'buba', 'inner top', 'kaftan length', 'senator top'],
  gownLength: ['gown length', 'gown', 'dress length', 'dress', 'boubou length', 'boubou', 'agbada length', 'agbada', 'babariga length', 'babariga', 'robe length', 'full length'],
  trouserLength: ['trouser length', 'trouser', 'trousers', 'pant length', 'pant', 'pants', 'bottom length'],
  crotch: ['crotch', 'rise', 'flap', 'seat depth'],
  halfLength: ['half length', 'front half', 'shoulder to waist', 'blouse length', 'peplum length'],
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

/**
 * Parses spoken number words (e.g. "forty two and half", "thirty six point five", "42 1/2")
 * into a standard clean decimal string (e.g. "42.5").
 */
export function parseSpokenNumber(text: string): number | null {
  const clean = text.toLowerCase().trim();
  if (!clean) return null;

  // Direct numeric match: e.g. "42", "42.5", "42,5"
  const directMatch = clean.match(/^(\d+(?:[.,]\d+)?)$/);
  if (directMatch) {
    const val = parseFloat(directMatch[1].replace(',', '.'));
    return isFinite(val) ? val : null;
  }

  // Fraction words evaluation (check multi-word fractions first before single "quarter")
  let fractionBonus = 0;
  let baseText = clean;

  if (/\b(?:and\s+three\s+quarters?|three\s+quarters?|point\s+seven\s+five|\.75)\b/.test(baseText)) {
    fractionBonus = 0.75;
    baseText = baseText.replace(/\b(?:and\s+three\s+quarters?|three\s+quarters?|point\s+seven\s+five|\.75)\b/g, '');
  } else if (/\b(?:and\s+a\s+quarter|and\s+quarter|quarter|point\s+two\s+five|\.25)\b/.test(baseText)) {
    fractionBonus = 0.25;
    baseText = baseText.replace(/\b(?:and\s+a\s+quarter|and\s+quarter|quarter|point\s+two\s+five|\.25)\b/g, '');
  } else if (/\b(?:and\s+a\s+half|and\s+half|half|point\s+five|point\s+5|dot\s+five|\.5)\b/.test(baseText)) {
    fractionBonus = 0.5;
    baseText = baseText.replace(/\b(?:and\s+a\s+half|and\s+half|half|point\s+five|point\s+5|dot\s+five|\.5)\b/g, '');
  } else if (/\b(?:and\s+an?\s+eighth|one\s+eighth|eighth|\.125)\b/.test(baseText)) {
    fractionBonus = 0.125;
    baseText = baseText.replace(/\b(?:and\s+an?\s+eighth|one\s+eighth|eighth|\.125)\b/g, '');
  }

  // Check if remaining baseText has numeric digits: e.g. "42" left over
  const leftoverDigits = baseText.match(/\b\d+\b/);
  if (leftoverDigits) {
    return parseInt(leftoverDigits[0], 10) + fractionBonus;
  }

  // Evaluate word tokens: e.g. "forty two"
  const tokens = baseText.split(/[\s-]+/).filter(Boolean);
  let wholeTotal = 0;
  let currentGroup = 0;
  let hasValidToken = false;

  for (const token of tokens) {
    if (NUMBER_WORDS[token] !== undefined) {
      hasValidToken = true;
      const num = NUMBER_WORDS[token];
      if (num === 100) {
        currentGroup = (currentGroup || 1) * 100;
      } else if (num >= 20) {
        currentGroup += num;
      } else {
        currentGroup += num;
      }
    }
  }

  wholeTotal += currentGroup;

  if (hasValidToken || fractionBonus > 0) {
    const total = wholeTotal + fractionBonus;
    return total > 0 ? total : null;
  }

  return null;
}

export interface VoiceTapeParseResult {
  matchedKey?: string;
  matchedLabel?: string;
  value?: string;
  isCustomNote?: boolean;
  rawText: string;
}

/**
 * Scans an input speech string and extracts either:
 * 1. A recognized measurement point with numeric value
 * 2. An unmapped custom fitting note (e.g. "dropped left shoulder 2 inches")
 * 3. Null if it was background noise or non-measurement chatter
 */
export function parseVoiceTapeSpeech(
  spokenPhrase: string,
  allowedKeys?: string[]
): VoiceTapeParseResult | null {
  const trimmed = spokenPhrase.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // Find candidate measurement key
  let matchedKey: string | undefined;
  let matchedTerm = '';

  for (const [key, aliases] of Object.entries(TAILOR_TERM_MAP)) {
    // If specific keys are allowed, prioritize or restrict to them
    if (allowedKeys && allowedKeys.length > 0 && !allowedKeys.includes(key)) {
      // If style has 'chest' instead of 'bust', swap appropriately
      if (key === 'bust' && allowedKeys.includes('chest')) {
        // treat as chest
      } else if (key === 'chest' && allowedKeys.includes('bust')) {
        // treat as bust
      } else {
        continue;
      }
    }

    for (const alias of aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'i');
      if (regex.test(lower)) {
        if (alias.length > matchedTerm.length) {
          matchedKey = key;
          matchedTerm = alias;
        }
      }
    }
  }

  // If style doesn't have bust, map bust aliases to chest
  if (matchedKey === 'bust' && allowedKeys && !allowedKeys.includes('bust') && allowedKeys.includes('chest')) {
    matchedKey = 'chest';
  } else if (matchedKey === 'chest' && allowedKeys && !allowedKeys.includes('chest') && allowedKeys.includes('bust')) {
    matchedKey = 'bust';
  }

  // If we matched a key, extract the number from the remaining text
  if (matchedKey) {
    const numberText = lower.replace(new RegExp(`\\b${matchedTerm}\\b`, 'i'), '').trim();
    const num = parseSpokenNumber(numberText);

    // Human garments in inches generally range from 8" (wrist/ankle) to 85" (full length robe)
    if (num !== null && num >= 5 && num <= 90) {
      return {
        matchedKey,
        value: String(num % 1 === 0 ? num : Number(num.toFixed(2))),
        rawText: trimmed,
      };
    }
  }

  // Check if tailor just said a number by itself (e.g., when focused on an active field)
  const standAloneNumber = parseSpokenNumber(lower);
  if (standAloneNumber !== null && standAloneNumber >= 5 && standAloneNumber <= 90) {
    return {
      value: String(standAloneNumber % 1 === 0 ? standAloneNumber : Number(standAloneNumber.toFixed(2))),
      rawText: trimmed,
    };
  }

  // Check if it's an unmapped custom posture / fitting note:
  // (contains words like "shoulder", "pocket", "knee", "slit", "collar", "drop", "tight", "loose", "lining", "allowance", "inch")
  const fittingKeywords = ['shoulder', 'pocket', 'knee', 'slit', 'collar', 'drop', 'tight', 'loose', 'lining', 'allowance', 'elbow', 'flap', 'side', 'armhole'];
  const hasFittingKeyword = fittingKeywords.some((w) => lower.includes(w));
  const hasAnyNumber = /\d+/.test(lower) || Object.keys(NUMBER_WORDS).some((w) => lower.includes(w));

  if (hasFittingKeyword || (hasAnyNumber && trimmed.length > 3)) {
    return {
      isCustomNote: true,
      value: trimmed,
      rawText: trimmed,
    };
  }

  // Unrelated chatter or unparseable noise -> safely ignore
  return null;
}
