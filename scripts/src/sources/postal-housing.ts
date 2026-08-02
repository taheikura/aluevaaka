import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { log } from '../lib/logger.js';

const PXWEB_BASE = 'https://pxdata.stat.fi:443/PxWeb/api/v1/fi';
const TABLE_PATH = 'StatFin/ashi/13mu.px';

interface PxWebResponse {
  id: string[];
  size: number[];
  dimension: Record<string, { category: { index: Record<string, number> } }>;
  value: Array<number | null>;
}

export interface PostalHousingRecord {
  postalCode: string;
  dataYear: string;
  housingPricePerM2?: number;
  transactionCount?: number;
}

function dimensionValues(data: PxWebResponse, id: string): string[] {
  return Object.entries(data.dimension[id]?.category.index ?? {})
    .sort(([, a], [, b]) => a - b)
    .map(([key]) => key);
}

export async function fetchPostalHousingPrices(): Promise<{
  records: PostalHousingRecord[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_postal_housing_start');
  const response = await fetch(`${PXWEB_BASE}/${TABLE_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: [
        { code: 'timeperiod_y', selection: { filter: 'item', values: ['2025'] } },
        {
          code: 'postinumeroalue_4_20220101',
          selection: { filter: 'all', values: ['*'] },
        },
        { code: 'talotyyppi_6_20131021', selection: { filter: 'item', values: ['5'] } },
        { code: 'contentscode', selection: { filter: 'all', values: ['*'] } },
      ],
      response: { format: 'json-stat2' },
    }),
  });

  if (!response.ok) throw new Error(`Postal housing fetch failed: HTTP ${response.status}`);
  const data = (await response.json()) as PxWebResponse;
  const postalCodes = dimensionValues(data, 'postinumeroalue_4_20220101');
  const records = postalCodes.map((postalCode, postalIndex) => {
    const start = postalIndex * 2;
    const price = data.value[start + 0];
    const count = data.value[start + 1];
    return {
      postalCode,
      dataYear: '2025',
      housingPricePerM2: price ?? undefined,
      transactionCount: count ?? undefined,
    };
  });

  log.info('fetch_postal_housing_done', {
    total: records.length,
    withPrice: records.filter((record) => record.housingPricePerM2 !== undefined).length,
  });

  return {
    records,
    provenance: {
      name: 'Statistics Finland — Housing transactions by postal code (PxWeb 13mu)',
      url: `${PXWEB_BASE}/${TABLE_PATH}`,
      license: 'CC BY 4.0',
      fetchedAt: new Date().toISOString().slice(0, 10),
      transformVersion: '1',
    },
  };
}
