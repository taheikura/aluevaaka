/**
 * Source adapter: Finnish municipality base data.
 *
 * Primary source: Statistics Finland (Tilastokeskus) open data API.
 * License: CC BY 4.0  https://stat.fi/org/lainsaadanto/copyright_en.html
 *
 * The API returns GeoJSON FeatureCollections. We extract the kuntanumero
 * (municipality code), names, region, and centroid coordinates.
 *
 * NOTE: Replace PLACEHOLDER_URL with the real Statistics Finland API endpoint
 * once you confirm the exact query path. The structure below matches the
 * typical stat.fi open data GeoJSON shape.
 */

import type { MunicipalityBase } from '@aluevaaka/data-model';
import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { fetchJson } from '../lib/http.js';
import { log } from '../lib/logger.js';

const SOURCE_URL =
  'https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0' +
  '&request=GetFeature&typeName=tilastointialueet:kunta4500k_2024' +
  '&outputFormat=application/json';

interface StatFiFeature {
  type: 'Feature';
  properties: {
    kunta: string;       // municipality code e.g. "091"
    nimi: string;        // Finnish name
    namn: string;        // Swedish name
    maakunta: string;    // region code
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface StatFiGeoJson {
  type: 'FeatureCollection';
  features: StatFiFeature[];
}

/** Region code → human-readable name mapping (Statistics Finland classification) */
const REGION_NAMES: Record<string, string> = {
  '01': 'Uusimaa',
  '02': 'Varsinais-Suomi',
  '04': 'Satakunta',
  '05': 'Kanta-Häme',
  '06': 'Pirkanmaa',
  '07': 'Päijät-Häme',
  '08': 'Kymenlaakso',
  '09': 'Etelä-Karjala',
  '10': 'Etelä-Savo',
  '11': 'Pohjois-Savo',
  '12': 'Pohjois-Karjala',
  '13': 'Keski-Suomi',
  '14': 'Etelä-Pohjanmaa',
  '15': 'Pohjanmaa',
  '16': 'Keski-Pohjanmaa',
  '17': 'Pohjois-Pohjanmaa',
  '18': 'Kainuu',
  '19': 'Lappi',
  '21': 'Ahvenanmaa',
};

function centroid(geometry: StatFiFeature['geometry']): { lat: number; lng: number } | null {
  // For Polygon: average of exterior ring vertices
  // For MultiPolygon: average of all rings' first vertex
  try {
    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates as [number, number];
      return { lat, lng };
    }
    if (geometry.type === 'Polygon') {
      const ring = (geometry.coordinates as number[][][])[0] ?? [];
      const lat = ring.reduce((s, c) => s + (c[1] ?? 0), 0) / ring.length;
      const lng = ring.reduce((s, c) => s + (c[0] ?? 0), 0) / ring.length;
      return { lat, lng };
    }
    if (geometry.type === 'MultiPolygon') {
      const allRings = (geometry.coordinates as number[][][][]).flatMap((p) => p[0] ?? []);
      const lat = allRings.reduce((s, c) => s + (c[1] ?? 0), 0) / allRings.length;
      const lng = allRings.reduce((s, c) => s + (c[0] ?? 0), 0) / allRings.length;
      return { lat, lng };
    }
  } catch {
    // geometry parse failure — caller will skip this record
  }
  return null;
}

export interface MunicipalitySourceResult {
  municipalities: MunicipalityBase[];
  provenance: DataSourceProvenance;
}

export async function fetchMunicipalities(): Promise<MunicipalitySourceResult> {
  log.info('fetch_municipalities_start', { url: SOURCE_URL });

  const geojson = await fetchJson<StatFiGeoJson>(SOURCE_URL);
  const fetchedAt = new Date().toISOString().slice(0, 10);

  const municipalities: MunicipalityBase[] = [];
  let skipped = 0;

  for (const feature of geojson.features) {
    const { kunta, nimi, namn, maakunta } = feature.properties;
    const coords = centroid(feature.geometry);

    if (!kunta || !nimi || !coords) {
      skipped++;
      continue;
    }

    municipalities.push({
      id: kunta,
      nameFi: nimi,
      nameSv: namn || undefined,
      region: REGION_NAMES[maakunta] ?? maakunta,
      coordinates: coords,
      // Population and area come from a separate Statistics Finland source;
      // default to 0 and let the merge step fill them in.
      population: 0,
      areaKm2: 0,
    });
  }

  log.info('fetch_municipalities_done', {
    total: municipalities.length,
    skipped,
  });

  return {
    municipalities,
    provenance: {
      name: 'Statistics Finland — Municipality boundaries (WFS)',
      url: SOURCE_URL,
      license: 'CC BY 4.0',
      fetchedAt,
      transformVersion: '1',
    },
  };
}
