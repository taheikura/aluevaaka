import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { fetchJson } from '../lib/http.js';
import { log } from '../lib/logger.js';

const SOURCE_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const BBOX = '60.05,24.45,60.42,25.35';
const USER_AGENT = 'aluevaaka-data-pipeline/1.0 contact: github.com/taheikura/aluevaaka';

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export type PointOfInterestKind =
  | 'healthcare'
  | 'transit'
  | 'grocery'
  | 'park'
  | 'school'
  | 'library';

export interface PointOfInterest {
  kind: PointOfInterestKind;
  lat: number;
  lng: number;
}

const QUERIES: Record<PointOfInterestKind, string> = {
  healthcare: `[out:json][timeout:45];nwr["amenity"~"hospital|clinic|doctors|pharmacy"](${BBOX});out center;`,
  transit: `[out:json][timeout:45];(nwr["public_transport"="platform"](${BBOX});nwr["highway"="bus_stop"](${BBOX}););out center;`,
  grocery: `[out:json][timeout:45];nwr["shop"="supermarket"](${BBOX});out center;`,
  park: `[out:json][timeout:45];nwr["leisure"~"park|nature_reserve"](${BBOX});out center;`,
  school: `[out:json][timeout:45];nwr["amenity"="school"](${BBOX});out center;`,
  library: `[out:json][timeout:45];nwr["amenity"="library"](${BBOX});out center;`,
};

export async function fetchPointsOfInterest(): Promise<{
  points: PointOfInterest[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_points_of_interest_start', { urls: SOURCE_URLS, kinds: Object.keys(QUERIES) });
  const points: PointOfInterest[] = [];

  for (const [kind, query] of Object.entries(QUERIES) as [PointOfInterestKind, string][]) {
    let data: OverpassResponse | undefined;
    let lastError: unknown;
    for (const url of SOURCE_URLS) {
      try {
        data = await fetchJson<OverpassResponse>(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(60_000),
        });
        break;
      } catch (error) {
        lastError = error;
        log.warn('points_of_interest_source_failed', { kind, url, error: String(error) });
      }
    }
    if (!data)
      throw new Error(`All points-of-interest sources failed for ${kind}: ${String(lastError)}`);

    for (const element of data.elements) {
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      if (lat !== undefined && lng !== undefined) points.push({ kind, lat, lng });
    }
    log.info('fetch_points_of_interest_kind_done', { kind, count: data.elements.length });
  }

  log.info('fetch_points_of_interest_done', { count: points.length });
  return {
    points,
    provenance: {
      name: 'OpenStreetMap — points of interest via Overpass API',
      url: SOURCE_URLS.join(', '),
      license: 'OpenStreetMap ODbL',
      fetchedAt: new Date().toISOString().slice(0, 10),
      transformVersion: '1',
    },
  };
}
