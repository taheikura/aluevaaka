#!/usr/bin/env tsx
/**
 * Standalone validation script — reads data/generated/ and checks quality
 * without re-fetching. Useful after manual edits or to verify a previous run.
 *
 * Run: pnpm --filter @aluevaaka/scripts validate
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MunicipalityBase, MunicipalityMetrics } from '@aluevaaka/data-model';
import { log } from './lib/logger.js';
import {
  buildReport,
  checkMinimumRecordCount,
  checkMissingValueRate,
  checkNoDuplicateIds,
  checkNumericRange,
  checkValidCoordinates,
} from './lib/quality.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(__dirname, '../../data/generated');

async function validate(): Promise<void> {
  log.info('validate_start', { dir: DATA_DIR });

  const [municipalities, metrics] = await Promise.all([
    readFile(join(DATA_DIR, 'municipalities.json'), 'utf-8').then(
      (s) => JSON.parse(s) as MunicipalityBase[],
    ),
    readFile(join(DATA_DIR, 'metrics.json'), 'utf-8').then(
      (s) => JSON.parse(s) as MunicipalityMetrics[],
    ),
  ]);

  const results = [
    checkMinimumRecordCount(municipalities.length, 200, 'municipalities'),
    checkNoDuplicateIds(
      municipalities.map((m) => m.id),
      'municipalities',
    ),
    checkValidCoordinates(municipalities.map((m) => ({ ...m.coordinates, id: m.id }))),
    checkNumericRange(
      metrics.map((m) => m.unemploymentRatePercent),
      0,
      50,
      'unemploymentRatePercent',
    ),
    checkMissingValueRate(
      metrics.map((m) => m.housingPricePerM2),
      0.6,
      'housingPricePerM2',
    ),
    checkMissingValueRate(
      metrics.map((m) => m.unemploymentRatePercent),
      0.1,
      'unemploymentRatePercent',
    ),
  ];

  const report = buildReport(results);

  for (const w of report.warnings) log.warn('quality_warning', { message: w });
  for (const e of report.errors) log.error('quality_error', { message: e });

  if (!report.passed) {
    log.error('validate_failed', { errors: report.errors.length });
    process.exit(1);
  }

  log.info('validate_passed', {
    municipalities: municipalities.length,
    warnings: report.warnings.length,
  });
}

validate().catch((err) => {
  console.error(JSON.stringify({ level: 'ERROR', msg: 'validate_failed', error: String(err) }));
  process.exit(1);
});
