/**
 * Data quality checks for the pipeline.
 *
 * Each check returns a QualityResult. The pipeline accumulates results and
 * decides whether to fail hard or emit warnings based on severity.
 */

export type Severity = 'error' | 'warning';

export interface QualityResult {
  check: string;
  passed: boolean;
  severity: Severity;
  message: string;
}

export interface QualityReport {
  results: QualityResult[];
  passed: boolean;
  warnings: string[];
  errors: string[];
}

export function buildReport(results: QualityResult[]): QualityReport {
  const errors = results
    .filter((r) => !r.passed && r.severity === 'error')
    .map((r) => `[${r.check}] ${r.message}`);

  const warnings = results
    .filter((r) => !r.passed && r.severity === 'warning')
    .map((r) => `[${r.check}] ${r.message}`);

  return {
    results,
    passed: errors.length === 0,
    warnings,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

export function checkMinimumRecordCount(
  actual: number,
  minimum: number,
  label: string,
): QualityResult {
  return {
    check: 'minimum_record_count',
    passed: actual >= minimum,
    severity: 'error',
    message: `${label}: expected at least ${minimum} records, got ${actual}`,
  };
}

export function checkNoDuplicateIds(ids: string[], label: string): QualityResult {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  return {
    check: 'no_duplicate_ids',
    passed: duplicates.length === 0,
    severity: 'error',
    message: `${label}: found ${duplicates.length} duplicate IDs: ${duplicates.slice(0, 5).join(', ')}`,
  };
}

export function checkNoMissingIds(
  sourceIds: string[],
  referenceIds: string[],
  label: string,
): QualityResult {
  const refSet = new Set(referenceIds);
  const missing = sourceIds.filter((id) => !refSet.has(id));
  return {
    check: 'no_missing_ids',
    passed: missing.length === 0,
    severity: 'warning',
    message: `${label}: ${missing.length} IDs not found in reference set`,
  };
}

export function checkValidCoordinates(
  coords: Array<{ lat: number; lng: number; id: string }>,
): QualityResult {
  // Finland bounding box with a generous margin
  const FINLAND = { latMin: 59.5, latMax: 70.2, lngMin: 19.0, lngMax: 31.6 };
  const invalid = coords.filter(
    (c) =>
      c.lat < FINLAND.latMin ||
      c.lat > FINLAND.latMax ||
      c.lng < FINLAND.lngMin ||
      c.lng > FINLAND.lngMax,
  );
  return {
    check: 'valid_coordinates',
    passed: invalid.length === 0,
    severity: 'error',
    message: `${invalid.length} municipalities have coordinates outside Finland: ${invalid
      .slice(0, 3)
      .map((c) => c.id)
      .join(', ')}`,
  };
}

export function checkNumericRange(
  values: (number | undefined)[],
  min: number,
  max: number,
  fieldName: string,
): QualityResult {
  const outOfRange = values.filter(
    (v) => v !== undefined && (v < min || v > max),
  ) as number[];
  return {
    check: `numeric_range_${fieldName}`,
    passed: outOfRange.length === 0,
    severity: 'warning',
    message: `${fieldName}: ${outOfRange.length} values outside expected range [${min}, ${max}]`,
  };
}

export function checkMissingValueRate(
  values: (number | undefined)[],
  maxMissingRatio: number,
  fieldName: string,
): QualityResult {
  const total = values.length;
  const missing = values.filter((v) => v === undefined).length;
  const ratio = total > 0 ? missing / total : 1;
  return {
    check: `missing_value_rate_${fieldName}`,
    passed: ratio <= maxMissingRatio,
    severity: 'warning',
    message: `${fieldName}: ${(ratio * 100).toFixed(1)}% missing (threshold ${(maxMissingRatio * 100).toFixed(0)}%)`,
  };
}

export function checkDatasetShrinkage(
  currentCount: number,
  previousCount: number,
  maxShrinkRatio: number,
): QualityResult {
  if (previousCount === 0) {
    return {
      check: 'dataset_shrinkage',
      passed: true,
      severity: 'warning',
      message: 'No previous count to compare against',
    };
  }
  const shrinkRatio = 1 - currentCount / previousCount;
  return {
    check: 'dataset_shrinkage',
    passed: shrinkRatio <= maxShrinkRatio,
    severity: 'error',
    message: `Dataset shrank by ${(shrinkRatio * 100).toFixed(1)}% (previous: ${previousCount}, current: ${currentCount})`,
  };
}
