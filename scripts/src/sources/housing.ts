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
  /** Average asking price per m² in EUR */
  housingPricePerM2?: number;
}

export async function fetchHousingPrices(): Promise<{
  records: HousingRecord[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_housing_start');
  const fetchedAt = new Date().toISOString().slice(0, 10);

  const res = await fetch(`${PXWEB_BASE}/StatFin/ashi/statfin_ashi_pxt_11ls.px`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: [
        { code: 'Vuosi', selection: { filter: 'top', values: ['1'] } },
        { code: 'Tiedot', selection: { filter: 'item', values: ['keskihinta'] } },
      ],
      response: { format: 'json-stat2' },
    }),
  });

  if (!res.ok) throw new Error(`Housing fetch failed: HTTP ${res.status}`);

  const data = (await res.json()) as {
    data: Array<{ key: string[]; values: string[] }>;
  };

  const records: HousingRecord[] = data.data
    .map((row) => {
      const price = parseFloat(row.values[0] ?? '');
      return {
        municipalityId: row.key[1] ?? '',
        housingPricePerM2: isNaN(price) ? undefined : price,
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
      url: `${PXWEB_BASE}/StatFin/ashi/statfin_ashi_pxt_11ls.px`,
      license: 'CC BY 4.0',
      fetchedAt,
      transformVersion: '1',
    },
  };
}
