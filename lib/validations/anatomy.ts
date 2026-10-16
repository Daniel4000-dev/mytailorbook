/**
 * Anatomical Sanity Engine for Tailoring Measurements
 *
 * Verifies that customer measurements reflect plausible human body proportions
 * before awarding XP, blocking synthetic bot inputs and copy-paste farming.
 */

export interface AnatomyValidationResult {
  valid: boolean;
  reason?: 'insufficient_measurements' | 'no_natural_variance' | 'shoulder_exceeds_chest' | 'out_of_human_bounds';
  details?: string;
}

interface Bounds {
  min: number;
  max: number;
}

// Realistic adult human tailoring boundaries in INCHES
const BOUNDS_INCHES: Record<string, Bounds> = {
  neck: { min: 11, max: 24 },
  shoulder: { min: 12, max: 25 },
  chest: { min: 26, max: 65 },
  bust: { min: 26, max: 65 },
  underBust: { min: 22, max: 55 },
  waist: { min: 20, max: 65 },
  stomach: { min: 22, max: 65 },
  hips: { min: 26, max: 70 },
  sleeveLength: { min: 15, max: 38 },
  shirtLength: { min: 18, max: 65 },
  trouserLength: { min: 25, max: 55 },
  thigh: { min: 14, max: 40 },
  ankle: { min: 8, max: 22 },
  crotch: { min: 20, max: 45 },
};

function parseNumeric(val: unknown): number | null {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.trim());
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function isValidAnatomy(measurements?: Record<string, unknown> | null): AnatomyValidationResult {
  if (!measurements || typeof measurements !== 'object') {
    return { valid: false, reason: 'insufficient_measurements', details: 'No measurements provided' };
  }

  const numericEntries: { key: string; value: number }[] = [];

  for (const [key, rawVal] of Object.entries(measurements)) {
    const val = parseNumeric(rawVal);
    if (val !== null && val > 0) {
      numericEntries.push({ key, value: val });
    }
  }

  // Need at least 2 distinct measurement points to evaluate
  if (numericEntries.length < 2) {
    return { valid: false, reason: 'insufficient_measurements', details: 'At least 2 measurement points required' };
  }

  const values = numericEntries.map(e => e.value);

  // 1. Natural Variance Check: Humans never have 3+ identical measurements across different landmarks
  const frequencyMap = new Map<number, number>();
  for (const v of values) {
    frequencyMap.set(v, (frequencyMap.get(v) || 0) + 1);
  }
  for (const count of frequencyMap.values()) {
    if (count >= 3) {
      return {
        valid: false,
        reason: 'no_natural_variance',
        details: 'Identical values entered across 3 or more anatomical fields',
      };
    }
  }

  // 2. Unit Detection (Inches vs Centimeters)
  // If chest or bust is > 65, measurements are almost certainly in cm
  const chestVal = numericEntries.find(e => e.key === 'chest' || e.key === 'bust')?.value;
  const isCm = chestVal !== undefined && chestVal > 65;
  const unitFactor = isCm ? 2.54 : 1.0;

  // 3. Golden Proportional Law: Shoulder width must strictly be less than chest circumference
  const shoulderVal = numericEntries.find(e => e.key === 'shoulder')?.value;
  if (shoulderVal !== undefined && chestVal !== undefined) {
    if (shoulderVal >= chestVal) {
      return {
        valid: false,
        reason: 'shoulder_exceeds_chest',
        details: `Shoulder width (${shoulderVal}) cannot be greater than or equal to chest circumference (${chestVal})`,
      };
    }
  }

  // 4. Human Dimensional Bounds
  for (const { key, value } of numericEntries) {
    const bound = BOUNDS_INCHES[key];
    if (bound) {
      const min = bound.min * unitFactor;
      const max = bound.max * unitFactor;
      if (value < min || value > max) {
        return {
          valid: false,
          reason: 'out_of_human_bounds',
          details: `Field "${key}" value ${value} is outside realistic human bounds (${min}-${max})`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Generates a normalized fingerprint string of measurements
 * to detect identical sets copy-pasted across multiple clients.
 */
export function getMeasurementFingerprint(measurements?: Record<string, unknown> | null): string | null {
  if (!measurements) return null;
  const entries: string[] = [];

  for (const [key, rawVal] of Object.entries(measurements)) {
    const val = parseNumeric(rawVal);
    if (val !== null && val > 0) {
      entries.push(`${key}:${Math.round(val * 10) / 10}`);
    }
  }

  if (entries.length < 2) return null;
  entries.sort();
  return entries.join('|');
}
