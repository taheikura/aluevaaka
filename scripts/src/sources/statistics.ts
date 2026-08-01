/**
 * Source adapter: Statistics Finland PxWeb API (px.stat.fi).
 *
 * Used for: population, income, unemployment, net migration.
 * License: CC BY 4.0
 *
 * The PxWeb API accepts a JSON query and returns a JSON-stat response.
 * Each call targets one table. We extract municipality-level rows only.
 *
 * API docs: https://pxdata.stat.fi/PxWeb/api/v1/fi/
 */

import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { log } from '../lib/logger.js';

const PXWEB_BASE = 'https://pxdata.stat.fi:443/PxWeb/api/v1/fi';

interface PxWebResponse {
  id: string[];
  size: number[];
  dimension: Record<string, { category: { index: Record<string, number> } }>;
  value: Array<number | null>;
}

function rows(data: PxWebResponse): Array<{ key: string[]; values: string[] }> {
  const dimensions = data.id.map((id) => {
    const index = data.dimension[id]?.category.index ?? {};
    return Object.entries(index)
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => key);
  });

  return data.value.map((value, flatIndex) => {
    let remainder = flatIndex;
    const indexes = data.size
      .map((size) => {
        const index = remainder % size;
        remainder = Math.floor(remainder / size);
        return index;
      })
      .reverse();

    return {
      key: indexes.map((index, dimension) => dimensions[dimension]?.[index] ?? ''),
      values: [value === null ? '' : String(value)],
    };
  });
}

async function queryPxWeb(
  tablePath: string,
  body: Record<string, unknown>,
): Promise<PxWebResponse> {
  const url = `${PXWEB_BASE}/${tablePath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PxWeb HTTP ${res.status} for ${url}`);
  }
  return res.json() as Promise<PxWebResponse>;
}

// ---------------------------------------------------------------------------
// Population
// ---------------------------------------------------------------------------

export interface PopulationRecord {
  municipalityId: string;
  population: number;
}

export async function fetchPopulation(): Promise<{
  records: PopulationRecord[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_population_start');
  const fetchedAt = new Date().toISOString().slice(0, 10);

  // Table: 11re -- Population by municipality and year
  // https://pxdata.stat.fi:443/PxWeb/api/v1/fi/StatFin/vaerak/statfin_vaerak_pxt_11re.px
  const data = await queryPxWeb('StatFin/vaerak/11ra.px', {
    query: [
      { code: 'timeperiod_y', selection: { filter: 'top', values: ['1'] } },
      { code: 'alue_23_20260101', selection: { filter: 'all', values: ['*'] } },
      { code: 'contentscode', selection: { filter: 'item', values: ['vaerak-vaesto'] } },
    ],
    response: { format: 'json-stat2' },
  });

  const records: PopulationRecord[] = rows(data)
    .map((row) => ({
      municipalityId: row.key[1] ?? '',
      population: parseInt(row.values[0] ?? '0', 10),
    }))
    .filter((r) => r.municipalityId && !Number.isNaN(r.population));

  log.info('fetch_population_done', { count: records.length });

  return {
    records,
    provenance: {
      name: 'Statistics Finland — Population by municipality (PxWeb)',
      url: `${PXWEB_BASE}/StatFin/vaerak/11ra.px`,
      license: 'CC BY 4.0',
      fetchedAt,
      transformVersion: '1',
    },
  };
}

// ---------------------------------------------------------------------------
// Median household income
// ---------------------------------------------------------------------------

export interface IncomeRecord {
  municipalityId: string;
  medianHouseholdIncomeEur: number;
}

export async function fetchMedianIncome(): Promise<{
  records: IncomeRecord[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_income_start');
  const fetchedAt = new Date().toISOString().slice(0, 10);

  // Table: 11y9 -- Household income by municipality
  const data = await queryPxWeb('StatFin/tjt/14ww.px', {
    query: [
      { code: 'alue_23_20250101', selection: { filter: 'all', values: ['*'] } },
      { code: 'contentscode', selection: { filter: 'item', values: ['hkturaha18_med'] } },
      { code: 'timeperiod_y', selection: { filter: 'top', values: ['1'] } },
    ],
    response: { format: 'json-stat2' },
  });

  const records: IncomeRecord[] = rows(data)
    .map((row) => ({
      municipalityId: row.key[1] ?? '',
      medianHouseholdIncomeEur: parseFloat(row.values[0] ?? '0'),
    }))
    .filter((r) => r.municipalityId && !Number.isNaN(r.medianHouseholdIncomeEur));

  log.info('fetch_income_done', { count: records.length });

  return {
    records,
    provenance: {
      name: 'Statistics Finland — Median household income by municipality (PxWeb)',
      url: `${PXWEB_BASE}/StatFin/tjt/14ww.px`,
      license: 'CC BY 4.0',
      fetchedAt,
      transformVersion: '1',
    },
  };
}

// ---------------------------------------------------------------------------
// Unemployment rate
// ---------------------------------------------------------------------------

export interface UnemploymentRecord {
  municipalityId: string;
  unemploymentRatePercent: number;
}

export async function fetchUnemploymentRate(): Promise<{
  records: UnemploymentRecord[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_unemployment_start');
  const fetchedAt = new Date().toISOString().slice(0, 10);

  // Table: 12b9 -- Unemployment rate by municipality
  const data = await queryPxWeb('StatFin/tyokay/115x.px', {
    query: [
      { code: 'alue_23_20250101', selection: { filter: 'all', values: ['*'] } },
      { code: 'timeperiod_y', selection: { filter: 'top', values: ['1'] } },
      { code: 'contentscode', selection: { filter: 'item', values: ['tyokay-tyottomyysaste'] } },
    ],
    response: { format: 'json-stat2' },
  });

  const records: UnemploymentRecord[] = rows(data)
    .map((row) => ({
      municipalityId: row.key[1] ?? '0',
      unemploymentRatePercent: parseFloat(row.values[0] ?? '0'),
    }))
    .filter((r) => r.municipalityId && !Number.isNaN(r.unemploymentRatePercent));

  log.info('fetch_unemployment_done', { count: records.length });

  return {
    records,
    provenance: {
      name: 'Statistics Finland — Unemployment rate by municipality (PxWeb)',
      url: `${PXWEB_BASE}/StatFin/tyokay/115x.px`,
      license: 'CC BY 4.0',
      fetchedAt,
      transformVersion: '1',
    },
  };
}

// ---------------------------------------------------------------------------
// Net migration
// ---------------------------------------------------------------------------

export interface MigrationRecord {
  municipalityId: string;
  netMigrationPer1000: number;
}

export async function fetchNetMigration(): Promise<{
  records: MigrationRecord[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_migration_start');
  const fetchedAt = new Date().toISOString().slice(0, 10);

  const data = await queryPxWeb('StatFin/muutl/11ae.px', {
    query: [
      { code: 'timeperiod_y', selection: { filter: 'top', values: ['1'] } },
      { code: 'alue_23_20260101', selection: { filter: 'all', values: ['*'] } },
      { code: 'contentscode', selection: { filter: 'item', values: ['muutl-vm43_netto'] } },
    ],
    response: { format: 'json-stat2' },
  });

  const records: MigrationRecord[] = rows(data)
    .map((row) => ({
      municipalityId: row.key[1] ?? '',
      netMigrationPer1000: parseFloat(row.values[0] ?? '0'),
    }))
    .filter((r) => r.municipalityId && !Number.isNaN(r.netMigrationPer1000));

  log.info('fetch_migration_done', { count: records.length });

  return {
    records,
    provenance: {
      name: 'Statistics Finland — Net migration per 1000 by municipality (PxWeb)',
      url: `${PXWEB_BASE}/StatFin/muutl/11ae.px`,
      license: 'CC BY 4.0',
      fetchedAt,
      transformVersion: '1',
    },
  };
}
