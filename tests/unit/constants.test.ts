import { describe, it, expect } from 'vitest';
import {
  getNextStatus,
  getPreviousStatus,
  buildCustomStyleSpec,
  STYLE_MEASUREMENTS,
  FULL_BODY_MEASUREMENTS,
} from '@/lib/constants';

// getNextStatus/getPreviousStatus drive every "advance" / "revert" button
// on the production board — a bug here either strands an order at a stage
// or lets it skip one entirely.
describe('getNextStatus', () => {
  it('advances through the full pipeline in order', () => {
    expect(getNextStatus('Documented')).toBe('Cutting');
    expect(getNextStatus('Cutting')).toBe('Sewing');
    expect(getNextStatus('Sewing')).toBe('Ready');
    expect(getNextStatus('Ready')).toBe('Completed');
  });

  it('returns null once the order is Completed — nothing comes after delivery', () => {
    expect(getNextStatus('Completed')).toBeNull();
  });
});

describe('getPreviousStatus', () => {
  it('steps back through the pipeline in order', () => {
    expect(getPreviousStatus('Completed')).toBe('Ready');
    expect(getPreviousStatus('Ready')).toBe('Sewing');
    expect(getPreviousStatus('Sewing')).toBe('Cutting');
    expect(getPreviousStatus('Cutting')).toBe('Documented');
  });

  it('returns null at the first stage — nothing comes before Documented', () => {
    expect(getPreviousStatus('Documented')).toBeNull();
  });
});

// buildCustomStyleSpec turns a shop's saved (or session-only) measurement
// fields into the spec StyleMeasureForm renders — used both for fully
// custom garment styles and for the ad-hoc "Add a measurement" picker's
// results merged onto a built-in style.
describe('buildCustomStyleSpec', () => {
  it('never renders a body-diagram guide, since custom fields have no real pin placement', () => {
    const spec = buildCustomStyleSpec([{ id: 'flareWidth', label: 'Flare Width' }]);
    expect(spec.hasDiagram).toBe(false);
  });

  it('carries each field through as a point with its id and label', () => {
    const spec = buildCustomStyleSpec([
      { id: 'flareWidth', label: 'Flare Width' },
      { id: 'cuffCircumference', label: 'Cuff Circumference' },
    ]);
    expect(spec.points).toEqual([
      { key: 'flareWidth', label: 'Flare Width', hint: '', gx: 0, gy: 0 },
      { key: 'cuffCircumference', label: 'Cuff Circumference', hint: '', gx: 0, gy: 0 },
    ]);
  });

  it('handles an empty field list without throwing', () => {
    const spec = buildCustomStyleSpec([]);
    expect(spec.points).toEqual([]);
  });
});

// Every StyleMeasureSpec's points are keyed by `key` and rendered/updated
// by that key alone — two points sharing a key in the same spec means one
// silently shadows the other's input, an easy mistake to make by hand in
// a catalog this size (and exactly the class of bug the new full-body
// specs and any future garment entry could introduce).
function duplicateKeys(points: { key: string }[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const p of points) {
    if (seen.has(p.key)) dupes.add(p.key);
    seen.add(p.key);
  }
  return [...dupes];
}

describe('measurement spec catalogs have no duplicate point keys', () => {
  it('every built-in garment style in STYLE_MEASUREMENTS', () => {
    for (const [styleName, spec] of Object.entries(STYLE_MEASUREMENTS)) {
      expect(duplicateKeys(spec.points), `duplicate keys in "${styleName}"`).toEqual([]);
    }
  });

  it('the full-body catalog for both genders', () => {
    expect(duplicateKeys(FULL_BODY_MEASUREMENTS.male.points), 'duplicate keys in male body spec').toEqual([]);
    expect(duplicateKeys(FULL_BODY_MEASUREMENTS.female.points), 'duplicate keys in female body spec').toEqual([]);
  });
});
