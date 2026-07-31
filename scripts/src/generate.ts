/**
 * Merges data from all source adapters into the generated dataset files.
 *
 * Output files match the structure expected by services/recommendation/src/dataset.ts:
 *   data/generated/municipalities.json   — MunicipalityBase[]
 *   data/generated/metrics.json          — MunicipalityMetrics[]
 *   data/generated/dataset-manifest.json — DatasetManifest
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MunicipalityBase, MunicipalityMetrics, DatasetManifest } from '@aluevaaka/data-model';
import { fetchMunicipalities } from './sources/municipalities.js';
import { fetchPopulation, fetchMedianIncome, fetchUnemploymentRate, fetchNetMigration } from './sources/statistics.js';
import { fetchHousingPrices } from './sources/housing.js';
import {
  buildReport,
  checkMinimumRecordCount,
  checkNoDuplicateIds,
  checkValidCoordinates,
  checkNumericRange,
  checkMissingValueRate,
  checkDatasetShrinkage,
} from './lib/quality.js';
import { log } from './lib/logger.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = join(__dirname, '../../data/generated');
const TRANSFORM_VERSION = '1';

export async function generate(): Promise<void> {
  log.info('pipeline_start');

  // -------------------------------------------------------------------------
  // 1. Fetch all sources in parallel where safe to do so
  // -------------------------------------------------------------------------
  const [
    municipalityResult,
    populationResult,
    incomeResult,
    unemploymentResult,
    migrationResult,
    housingResult,
  ] = await Promise.all([
    fetchMunicipalities(),
    fetchPopulation(),
    fetchMedianIncome(),
    fetchUnemploymentRate(),
    fetchNetMigration(),
    fetchHousingPrices(),
  ]);

  const provenances = [
    municipalityResult.provenance,
    populationResult.provenance,
    incomeResult.provenance,
    unemploymentResult.provenance,
    migrationResult.provenance,
    housingResult.provenance,
  ];

  // -------------------------------------------------------------------------
  // 2. Build lookup maps for efficient merge
  // -------------------------------------------------------------------------
  const populationById = new Map(populationResult.records.map((r) => [r.municipalityId, r.population]));
  const incomeById = new Map(incomeResult.records.map((r) => [r.municipalityId, r.medianHouseholdIncomeEur]));
  const unemploymentById = new Map(unemploymentResult.records.map((r) => [r.municipalityId, r.unemploymentRatePercent]));
  const migrationById = new Map(migrationResult.records.map((r) => [r.municipalityId, r.netMigrationPer1000]));
  const housingById = new Map(housingResult.records.map((r) => [r.municipalityId, r.housingPricePerM2]));

  // -------------------------------------------------------------------------
  // 3. Merge into typed structures
  // -------------------------------------------------------------------------
  const municipalities: MunicipalityBase[] = municipalityResult.municipalities.map((m) => ({
    ...m,
    population: populationById.get(m.id) ?? 0,
  }));

  const metrics: MunicipalityMetrics[] = municipalities.map((m) => ({
    id: m.id,
    housingPricePerM2: housingById.get(m.id),
    medianHouseholdIncomeEur: incomeById.get(m.id),
    unemploymentRatePercent: unemploymentById.get(m.id),
    netMigrationPer1000: migrationById.get(m.id),
    // Fields from future adapters (healthcare, transport, nature) will go here.
    // Until those adapters are built, the fields remain undefined.
    // The scoring engine handles missing data gracefully.
  }));

  // -------------------------------------------------------------------------
  // 4. Quality checks
  // -------------------------------------------------------------------------
  const qualityResults = [
    checkMinimumRecordCount(municipalities.length, 200, 'municipalities'),
    checkNoDuplicateIds(municipalities.map((m) => m.id), 'municipalities'),
    checkValidCoordinates(municipalities.map((m) => ({ ...m.coordinates, id: m.id }))),
    checkNumericRange(
      metrics.map((m) => m.unemploymentRatePercent),
      0, 50,
      'unemploymentRatePercent',
    ),
    checkNumericRange(
      metrics.map((m) => m.housingPricePerM2),
      100, 20000,
      'housingPricePerM2',
    ),
    checkMissingValueRate(
      metrics.map((m) => m.housingPricePerM2),
      0.6, // up to 60% missing is acceptable — small municipalities have no market data
      'housingPricePerM2',
    ),
    checkMissingValueRate(
      metrics.map((m) => m.unemploymentRatePercent),
      0.1,
      'unemploymentRatePercent',
    ),
  ];

  // Check shrinkage against previous dataset if it exists
  const manifestPath = join(OUTPUT_DIR, 'dataset-manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(await readFile(manifestPath, 'utf-8')) as DatasetManifest;
      qualityResults.push(
        checkDatasetShrinkage(municipalities.length, prev.municipalityCount, 0.05),
      );
    } catch {
      log.warn('could_not_read_previous_manifest');
    }
  }

  const report = buildReport(qualityResults);

  for (const w of report.warnings) log.warn('quality_warning', { message: w });
  for (const e of report.errors) log.error('quality_error', { message: e });

  if (!report.passed) {
    throw new Error(`Data quality checks failed:\n${report.errors.join('\n')}`);
  }

  // -------------------------------------------------------------------------
  // 5. Write output files
  // -------------------------------------------------------------------------
  await mkdir(OUTPUT_DIR, { recursive: true });

  const version = new Date().toISOString().slice(0, 10);

  const manifest: DatasetManifest = {
    version,
    generatedAt: new Date().toISOString(),
    municipalityCount: municipalities.length,
    sources: provenances,
    qualityWarnings: report.warnings,
  };

  await Promise.all([
    writeFile(join(OUTPUT_DIR, 'municipalities.json'), JSON.stringify(municipalities, null, 2)),
    writeFile(join(OUTPUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2)),
    writeFile(join(OUTPUT_DIR, 'dataset-manifest.json'), JSON.stringify(manifest, null, 2)),
  ]);

  log.info('pipeline_complete', {
    version,
    municipalityCount: municipalities.length,
    outputDir: OUTPUT_DIR,
    warnings: report.warnings.length,
  });
}
