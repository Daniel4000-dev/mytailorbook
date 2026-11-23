import { describe, it, expect } from 'vitest';
import { isValidAnatomy, getMeasurementFingerprint } from '@/lib/validations/anatomy';

describe('Anatomical Sanity Engine', () => {
  it('approves realistic human adult measurements in inches', () => {
    const measurements = {
      neck: 16.5,
      shoulder: 18.5,
      chest: 42,
      waist: 34,
      sleeveLength: 25,
      shirtLength: 32,
    };
    const result = isValidAnatomy(measurements);
    expect(result.valid).toBe(true);
  });

  it('approves realistic measurements in centimeters', () => {
    const measurements = {
      neck: 42,
      shoulder: 48,
      chest: 106,
      waist: 86,
      shirtLength: 80,
    };
    const result = isValidAnatomy(measurements);
    expect(result.valid).toBe(true);
  });

  it('rejects spam where 3+ fields have identical values (No Natural Variance)', () => {
    const fakeMeasurements = {
      neck: 36,
      shoulder: 36,
      chest: 36,
      waist: 34,
    };
    const result = isValidAnatomy(fakeMeasurements);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('no_natural_variance');
  });

  it('rejects physically impossible proportions (Shoulder >= Chest)', () => {
    const impossibleMeasurements = {
      shoulder: 45,
      chest: 38,
      waist: 32,
    };
    const result = isValidAnatomy(impossibleMeasurements);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('shoulder_exceeds_chest');
  });

  it('rejects values outside realistic human bounds', () => {
    const absurdMeasurements = {
      shoulder: 18,
      chest: 150, // Absurdly large in inches
      waist: 32,
    };
    const result = isValidAnatomy(absurdMeasurements);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('out_of_human_bounds');
  });

  it('rejects sets with less than 2 valid points', () => {
    const sparse = { chest: 40 };
    const result = isValidAnatomy(sparse);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('insufficient_measurements');
  });

  it('generates consistent fingerprints for identical sets regardless of key insertion order', () => {
    const m1 = { chest: 42, shoulder: 18, waist: 34 };
    const m2 = { waist: 34, chest: 42, shoulder: 18 };
    expect(getMeasurementFingerprint(m1)).toBe(getMeasurementFingerprint(m2));
    expect(getMeasurementFingerprint(m1)).toBe('chest:42|shoulder:18|waist:34');
  });

  it('approves measurements parsed from tailor fraction inputs', () => {
    const measurements = {
      neck: 16.5,
      shoulder: 18.75,
      chest: 42.25,
      waist: 34.5,
    };
    const result = isValidAnatomy(measurements);
    expect(result.valid).toBe(true);
  });
});
