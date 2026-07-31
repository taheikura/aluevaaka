#!/usr/bin/env tsx
/**
 * Writes a small sample dataset to data/generated/ for local development
 * and CI without needing real API access.
 *
 * Run: pnpm --filter @aluevaaka/scripts seed:sample
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MunicipalityBase, MunicipalityMetrics, DatasetManifest } from '@aluevaaka/data-model';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = join(__dirname, '../../data/generated');

const municipalities: MunicipalityBase[] = [
  { id: '091', nameFi: 'Helsinki', nameSv: 'Helsingfors', region: 'Uusimaa', coordinates: { lat: 60.1699, lng: 24.9384 }, population: 660000, areaKm2: 715 },
  { id: '837', nameFi: 'Tampere', nameSv: 'Tammerfors', region: 'Pirkanmaa', coordinates: { lat: 61.4978, lng: 23.7610 }, population: 240000, areaKm2: 689 },
  { id: '853', nameFi: 'Turku', nameSv: 'Åbo', region: 'Varsinais-Suomi', coordinates: { lat: 60.4518, lng: 22.2666 }, population: 200000, areaKm2: 306 },
  { id: '564', nameFi: 'Oulu', nameSv: 'Uleåborg', region: 'Pohjois-Pohjanmaa', coordinates: { lat: 65.0121, lng: 25.4651 }, population: 215000, areaKm2: 3371 },
  { id: '179', nameFi: 'Jyväskylä', region: 'Keski-Suomi', coordinates: { lat: 62.2426, lng: 25.7473 }, population: 145000, areaKm2: 1466 },
  { id: '049', nameFi: 'Espoo', nameSv: 'Esbo', region: 'Uusimaa', coordinates: { lat: 60.2052, lng: 24.6522 }, population: 300000, areaKm2: 528 },
  { id: '297', nameFi: 'Kuopio', region: 'Pohjois-Savo', coordinates: { lat: 62.8980, lng: 27.6782 }, population: 120000, areaKm2: 4327 },
  { id: '245', nameFi: 'Kerava', region: 'Uusimaa', coordinates: { lat: 60.4042, lng: 25.1012 }, population: 37000, areaKm2: 31 },
  { id: '398', nameFi: 'Lahti', region: 'Päijät-Häme', coordinates: { lat: 60.9827, lng: 25.6612 }, population: 120000, areaKm2: 135 },
  { id: '272', nameFi: 'Kouvola', region: 'Kymenlaakso', coordinates: { lat: 60.8678, lng: 26.7042 }, population: 80000, areaKm2: 2565 },
];

const metrics: MunicipalityMetrics[] = [
  { id: '091', housingPricePerM2: 5200, avgMonthlyRent2r: 1750, distanceToHealthcareCentreKm: 1.2, distanceToRailKm: 0.4, broadbandAvailabilityPercent: 99, forestCoverPercent: 18, distanceToWaterKm: 0.8, unemploymentRatePercent: 8.1, netMigrationPer1000: 4.2, medianHouseholdIncomeEur: 39000 },
  { id: '837', housingPricePerM2: 2400, avgMonthlyRent2r: 920, distanceToHealthcareCentreKm: 2.1, distanceToRailKm: 0.9, broadbandAvailabilityPercent: 97, forestCoverPercent: 38, distanceToWaterKm: 1.5, unemploymentRatePercent: 9.4, netMigrationPer1000: 3.1, medianHouseholdIncomeEur: 33000 },
  { id: '853', housingPricePerM2: 2900, avgMonthlyRent2r: 1050, distanceToHealthcareCentreKm: 1.8, distanceToRailKm: 0.7, broadbandAvailabilityPercent: 98, forestCoverPercent: 22, distanceToWaterKm: 0.5, unemploymentRatePercent: 10.2, netMigrationPer1000: 1.8, medianHouseholdIncomeEur: 31000 },
  { id: '564', housingPricePerM2: 1800, avgMonthlyRent2r: 780, distanceToHealthcareCentreKm: 3.5, distanceToRailKm: 1.2, broadbandAvailabilityPercent: 95, forestCoverPercent: 52, distanceToWaterKm: 2.1, unemploymentRatePercent: 11.5, netMigrationPer1000: 2.4, medianHouseholdIncomeEur: 30000 },
  { id: '179', housingPricePerM2: 2100, avgMonthlyRent2r: 840, distanceToHealthcareCentreKm: 2.8, distanceToRailKm: 1.5, broadbandAvailabilityPercent: 94, forestCoverPercent: 48, distanceToWaterKm: 1.2, unemploymentRatePercent: 10.8, netMigrationPer1000: 2.0, medianHouseholdIncomeEur: 31500 },
  { id: '049', housingPricePerM2: 3800, avgMonthlyRent2r: 1400, distanceToHealthcareCentreKm: 1.5, distanceToRailKm: 0.6, broadbandAvailabilityPercent: 99, forestCoverPercent: 35, distanceToWaterKm: 1.0, unemploymentRatePercent: 7.2, netMigrationPer1000: 5.8, medianHouseholdIncomeEur: 42000 },
  { id: '297', housingPricePerM2: 1700, avgMonthlyRent2r: 720, distanceToHealthcareCentreKm: 3.2, distanceToRailKm: 2.1, broadbandAvailabilityPercent: 92, forestCoverPercent: 65, distanceToWaterKm: 0.9, unemploymentRatePercent: 12.1, netMigrationPer1000: 0.5, medianHouseholdIncomeEur: 28000 },
  { id: '245', housingPricePerM2: 3100, avgMonthlyRent2r: 1100, distanceToHealthcareCentreKm: 1.4, distanceToRailKm: 0.3, broadbandAvailabilityPercent: 98, forestCoverPercent: 30, distanceToWaterKm: 1.8, unemploymentRatePercent: 7.8, netMigrationPer1000: 6.2, medianHouseholdIncomeEur: 37000 },
  { id: '398', housingPricePerM2: 1900, avgMonthlyRent2r: 810, distanceToHealthcareCentreKm: 2.0, distanceToRailKm: 1.1, broadbandAvailabilityPercent: 96, forestCoverPercent: 42, distanceToWaterKm: 1.3, unemploymentRatePercent: 11.0, netMigrationPer1000: 0.8, medianHouseholdIncomeEur: 29000 },
  { id: '272', housingPricePerM2: 1400, avgMonthlyRent2r: 650, distanceToHealthcareCentreKm: 4.1, distanceToRailKm: 1.8, broadbandAvailabilityPercent: 88, forestCoverPercent: 58, distanceToWaterKm: 2.5, unemploymentRatePercent: 13.2, netMigrationPer1000: -1.2, medianHouseholdIncomeEur: 26000 },
];

const manifest: DatasetManifest = {
  version: new Date().toISOString().slice(0, 10),
  generatedAt: new Date().toISOString(),
  municipalityCount: municipalities.length,
  sources: [
    {
      name: 'Sample data (not real)',
      url: 'local',
      license: 'N/A',
      fetchedAt: new Date().toISOString().slice(0, 10),
      transformVersion: '1',
    },
  ],
  qualityWarnings: ['This is sample data for local development only. Do not deploy.'],
};

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(join(OUTPUT_DIR, 'municipalities.json'), JSON.stringify(municipalities, null, 2)),
  writeFile(join(OUTPUT_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2)),
  writeFile(join(OUTPUT_DIR, 'dataset-manifest.json'), JSON.stringify(manifest, null, 2)),
]);

console.log(`Sample dataset written to ${OUTPUT_DIR} (${municipalities.length} municipalities)`);
