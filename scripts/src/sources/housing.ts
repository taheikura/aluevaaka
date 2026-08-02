/**
 * Source adapter: Housing price data.
 *
 * Primary source: Statistics Finland — Dwelling prices by municipality (PxWeb)
 * Table: 11ls -- Average price per m² of old dwellings
 * License: CC BY 4.0
 *
 * Note: housing price data has limited coverage for small municipalities.
 * Missing values are returned as undefined and handled by the scoring engine.
 */

import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { log } from '../lib/logger.js';

const PXWEB_BASE = 'https://pxdata.stat.fi:443/PxWeb/api/v1/fi';

export interface HousingRecord {
  municipalityId: string;
  /** Area-level average transaction price per m² in EUR */
  housingPricePerM2?: number;
}

export async function fetchHousingPrices(): Promise<{
  records: HousingRecord[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_housing_start');
  const fetchedAt = new Date().toISOString().slice(0, 10);

  const res = await fetch(`${PXWEB_BASE}/StatFin/ashi/13mx.px`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: [
        { code: 'timeperiod_y', selection: { filter: 'item', values: ['2025'] } },
        { code: 'kunta_1_20150101', selection: { filter: 'all', values: ['*'] } },
        { code: 'talotyyppi_5_20111209', selection: { filter: 'item', values: ['0'] } },
        { code: 'contentscode', selection: { filter: 'item', values: ['keskihinta_aritm_nw'] } },
      ],
      response: { format: 'json-stat2' },
    }),
  });

  if (!res.ok) throw new Error(`Housing fetch failed: HTTP ${res.status}`);

  const data = (await res.json()) as {
    id: string[];
    size: number[];
    dimension: Record<string, { category: { index: Record<string, number> } }>;
    value: Array<number | null>;
  };

  const dimensions = data.id.map((id) => {
    const index = data.dimension[id]?.category.index ?? {};
    return Object.entries(index)
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => key);
  });

  const records: HousingRecord[] = data.value
    .map((value, flatIndex) => {
      const indexes = data.size.map((size, dimension) => {
        const stride = data.size
          .slice(dimension + 1)
          .reduce((product, value) => product * value, 1);
        return Math.floor(flatIndex / stride) % size;
      });
      const price = value ?? Number.NaN;
      return {
        municipalityId: dimensions[1]?.[indexes[1] ?? 0] ?? '',
        housingPricePerM2: Number.isNaN(price) ? undefined : price,
      };
    })
    .filter((r) => r.municipalityId !== '');

  log.info('fetch_housing_done', {
    total: records.length,
    withPrice: records.filter((r) => r.housingPricePerM2 !== undefined).length,
  });

  return {
    records,
    provenance: {
      name: 'Statistics Finland — Average housing price per m² by municipality (PxWeb)',
      url: `${PXWEB_BASE}/StatFin/ashi/13mx.px`,
      license: 'CC BY 4.0',
      fetchedAt,
      transformVersion: '1',
    },
  };
}
