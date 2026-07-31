import { describe, expect, it } from 'vitest';
import { columnRange, normalizeHigherIsBetter, normalizeLowerIsBetter } from '../normalize.js';

describe('normalizeHigherIsBetter', () => {
  it('returns 1 for max value', () => {
    expect(normalizeHigherIsBetter(100, 0, 100)).toBe(1);
  });

  it('returns 0 for min value', () => {
    expect(normalizeHigherIsBetter(0, 0, 100)).toBe(0);
  });

  it('returns 0.5 for midpoint', () => {
    expect(normalizeHigherIsBetter(50, 0, 100)).toBe(0.5);
  });

  it('clamps values above max to 1', () => {
    expect(normalizeHigherIsBetter(150, 0, 100)).toBe(1);
  });

  it('returns undefined for undefined input', () => {
    expect(normalizeHigherIsBetter(undefined, 0, 100)).toBeUndefined();
  });

  it('returns 0.5 when min === max', () => {
    expect(normalizeHigherIsBetter(50, 50, 50)).toBe(0.5);
  });
});

describe('normalizeLowerIsBetter', () => {
  it('returns 1 for min value', () => {
    expect(normalizeLowerIsBetter(0, 0, 100)).toBe(1);
  });

  it('returns 0 for max value', () => {
    expect(normalizeLowerIsBetter(100, 0, 100)).toBe(0);
  });

  it('returns 0.5 for midpoint', () => {
    expect(normalizeLowerIsBetter(50, 0, 100)).toBe(0.5);
  });

  it('returns undefined for undefined input', () => {
    expect(normalizeLowerIsBetter(undefined, 0, 100)).toBeUndefined();
  });
});

describe('columnRange', () => {
  it('computes min and max from a column', () => {
    expect(columnRange([1, 5, 3, 9, 2])).toEqual({ min: 1, max: 9 });
  });

  it('ignores undefined values', () => {
    expect(columnRange([undefined, 5, undefined, 9])).toEqual({ min: 5, max: 9 });
  });

  it('returns undefined when fewer than 2 valid values', () => {
    expect(columnRange([undefined, 5, undefined])).toBeUndefined();
    expect(columnRange([])).toBeUndefined();
  });
});
