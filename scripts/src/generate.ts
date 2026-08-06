/**
 * Merges data from all source adapters into the generated dataset files.
 *
 * Output files match the structure expected by services/recommendation/src/dataset.ts:
 *   data/generated/municipalities.json   — MunicipalityBase[]
 *   data/generated/metrics.json          — MunicipalityMetrics[]
 *   data/generated/dataset-manifest.json — DatasetManifest
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatasetManifest, MunicipalityBase, MunicipalityMetrics } from '@aluevaaka/data-model';
import { calculateGridMetrics, generateGridCells } from './grid.js';
import { log } from './lib/logger.js';
import {
  buildReport,
  checkDatasetShrinkage,
  checkMinimumRecordCount,
  checkMissingValueRate,
  checkNoDuplicateIds,
  checkNumericRange,
  checkValidCoordinates,
  checkValidPolygons,
} from './lib/quality.js';
import { fetchCapitalAreas } from './sources/capital-areas.js';
import { fetchPointsOfInterest } from './sources/points-of-interest.js';
import { fetchPostalHousingPrices } from './sources/postal-housing.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = join(__dirname, '../../data/generated');

export async function generate(): Promise<void> {
  log.info('pipeline_start');

  // -------------------------------------------------------------------------
  // 1. Fetch all sources in parallel where safe to do so
  // -------------------------------------------------------------------------
  const [areaResult, housingResult, pointsResult] = await Promise.all([
    fetchCapitalAreas(),
    fetchPostalHousingPrices(),
    fetchPointsOfInterest(),
  ]);

  const provenances = [areaResult.provenance, housingResult.provenance, pointsResult.provenance];

  // -------------------------------------------------------------------------
  // 2. Build lookup maps for efficient merge
  // -------------------------------------------------------------------------
  const housingByPostalCode = new Map(housingResult.records.map((r) => [r.postalCode, r]));
  const housingForArea = (area: MunicipalityBase) =>
    housingByPostalCode.get(area.postalCode ?? area.id);

  // -------------------------------------------------------------------------
  // 3. Merge into typed structures
  // -------------------------------------------------------------------------
  const gridCells = generateGridCells(areaResult.municipalities);
  log.info('grid_generation_complete', {
    resolution: 9,
    cellCount: gridCells.length,
  });

  const postalMetrics: MunicipalityMetrics[] = gridCells.map((m) => ({
    id: m.id,
    housingPricePerM2: housingForArea(m)?.housingPricePerM2,
    housingTransactionCount: housingForArea(m)?.transactionCount,
    housingDataYear: housingForArea(m)?.dataYear,
    // Fields from future adapters (healthcare, transport, nature) will go here.
    // Until those adapters are built, the fields remain undefined.
    // The scoring engine handles missing data gracefully.
  }));
  const distanceMetrics = calculateGridMetrics(gridCells, pointsResult.points);
  const municipalities: MunicipalityBase[] = gridCells;
  const metrics: MunicipalityMetrics[] = postalMetrics.map((metric) => ({
    ...metric,
    ...(distanceMetrics.find((distance) => distance.id === metric.id) ?? {}),
  }));

  // -------------------------------------------------------------------------
  // 4. Quality checks
  // -------------------------------------------------------------------------
  const qualityResults = [
    checkMinimumRecordCount(municipalities.length, 100, 'capital-area postal areas'),
    checkNoDuplicateIds(
      municipalities.map((m) => m.id),
      'municipalities',
    ),
    checkValidCoordinates(municipalities.map((m) => ({ ...m.coordinates, id: m.id }))),
    checkValidPolygons(municipalities),
    checkNumericRange(
      metrics.map((m) => m.housingPricePerM2),
      100,
      20000,
      'housingPricePerM2',
    ),
    checkMissingValueRate(
      metrics.map((m) => m.housingPricePerM2),
      0.6, // up to 60% missing is acceptable — small municipalities have no market data
      'housingPricePerM2',
    ),
  ];

  // Check shrinkage against previous dataset if it exists
  const manifestPath = join(OUTPUT_DIR, 'dataset-manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(await readFile(manifestPath, 'utf-8')) as DatasetManifest;
      qualityResults.push(
        checkDatasetShrinkage(
          municipalities.length,
          prev.municipalityCount,
          0.05,
          9,
          prev.gridResolution,
        ),
      );
    } catch {
      log.warn('could_not_read_previous_manifest');
    }
  }

  const report = buildReport(qualityResults);

  if (pointsResult.failedKinds.length > 0) {
    report.warnings.push(
      `OpenStreetMap POI data was unavailable for: ${pointsResult.failedKinds.join(', ')}.`,
    );
  }
  if (pointsResult.failedTiles.length > 0) {
    report.warnings.push(
      `OpenStreetMap POI data was unavailable for tiles: ${pointsResult.failedTiles.join(', ')}.`,
    );
  }

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
    areaCount: municipalities.length,
    gridResolution: 9,
    metricCoverage: {
      housingPricePerM2: coverage(metrics, 'housingPricePerM2'),
      distanceToHealthcareKm: coverage(metrics, 'distanceToHealthcareKm'),
      distanceToTransitKm: coverage(metrics, 'distanceToTransitKm'),
      distanceToGroceryKm: coverage(metrics, 'distanceToGroceryKm'),
      distanceToParkKm: coverage(metrics, 'distanceToParkKm'),
      distanceToSchoolKm: coverage(metrics, 'distanceToSchoolKm'),
      distanceToLibraryKm: coverage(metrics, 'distanceToLibraryKm'),
    },
    sources: provenances,
    qualityWarnings: report.warnings,
  };

  const mapIndex = municipalities.map((municipality, index) => ({
    municipality,
    metrics: metrics[index],
  }));
  const mapPartitions = new Map<number, typeof mapIndex>();
  for (const record of mapIndex) {
    const bucket = Math.max(
      0,
      Math.min(7, Math.floor((record.municipality.coordinates.lat - 60.05) / 0.05)),
    );
    const partition = mapPartitions.get(bucket) ?? [];
    partition.push(record);
    mapPartitions.set(bucket, partition);
  }

  await Promise.all([
    writeFile(join(OUTPUT_DIR, 'municipalities.json'), JSON.stringify(municipalities, null, 2)),
    writeFile(join(OUTPUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2)),
    writeFile(join(OUTPUT_DIR, 'map-index.json'), JSON.stringify(mapIndex)),
    writeFile(
      join(OUTPUT_DIR, 'map-manifest.json'),
      JSON.stringify({ version, resolution: 9, recordCount: municipalities.length }),
    ),
    writeFile(join(OUTPUT_DIR, 'dataset-manifest.json'), JSON.stringify(manifest, null, 2)),
    ...[...mapPartitions.entries()].map(([partition, records]) => {
      const path = join(OUTPUT_DIR, 'map', 'resolution-9', `latitude-${partition}.json`);
      return mkdir(join(OUTPUT_DIR, 'map', 'resolution-9'), { recursive: true }).then(() =>
        writeFile(path, JSON.stringify(records)),
      );
    }),
  ]);

  log.info('pipeline_complete', {
    version,
    municipalityCount: municipalities.length,
    outputDir: OUTPUT_DIR,
    warnings: report.warnings.length,
  });
}

function coverage(metrics: MunicipalityMetrics[], key: keyof MunicipalityMetrics): number {
  if (metrics.length === 0) return 0;
  return metrics.filter((metric) => metric[key] !== undefined).length / metrics.length;
}
