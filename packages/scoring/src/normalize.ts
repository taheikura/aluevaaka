/**
 * Metric normalization utilities.
 *
 * All normalization produces a value in [0, 1] where 1 is "best".
 * Missing values (undefined/null/NaN) always return undefined — callers
 * are responsible for deciding how to handle absent data.
 */

/** Normalize a value where higher is better (e.g. income, broadband coverage). */
export function normalizeHigherIsBetter(
  value: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Normalize a value where lower is better (e.g. housing price, distance). */
export function normalizeLowerIsBetter(
  value: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, 1 - (value - min) / (max - min)));
}

/**
 * Compute min and max from a dataset column, ignoring undefined/NaN.
 * Returns undefined if the column has fewer than 2 valid values.
 */
export function columnRange(
  values: (number | undefined)[],
): { min: number; max: number } | undefined {
  const valid = values.filter((v): v is number => v !== undefined && Number.isFinite(v));
  if (valid.length < 2) return undefined;
  return {
    min: Math.min(...valid),
    max: Math.max(...valid),
  };
}
