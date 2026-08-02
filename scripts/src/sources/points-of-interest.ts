import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { fetchJson } from '../lib/http.js';
import { log } from '../lib/logger.js';

const OVERPASS_QUERY =
  '[out:json][timeout:120];(nwr["amenity"~"hospital|clinic|doctors|pharmacy|school|library|supermarket|grocery_or_supermarket"](60.05,24.45,60.42,25.35);nwr["shop"="supermarket"](60.05,24.45,60.42,25.35);nwr["leisure"~"park|nature_reserve"](60.05,24.45,60.42,25.35);nwr["public_transport"="platform"](60.05,24.45,60.42,25.35););out center;';
const SOURCE_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

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

export async function fetchPointsOfInterest(): Promise<{
  points: PointOfInterest[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_points_of_interest_start', { urls: SOURCE_URLS });
  let data: OverpassResponse | undefined;
  let lastError: unknown;
  for (const url of SOURCE_URLS) {
    try {
      data = await fetchJson<OverpassResponse>(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'aluevaaka-data-pipeline/1.0 contact: github.com/taheikura/aluevaaka',
        },
        body: new URLSearchParams({ data: OVERPASS_QUERY }),
      });
      break;
    } catch (error) {
      lastError = error;
      log.warn('points_of_interest_source_failed', { url, error: String(error) });
    }
  }
  if (!data) throw new Error(`All points-of-interest sources failed: ${String(lastError)}`);
  const points = data.elements.flatMap((element) => {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat === undefined || lng === undefined) return [];
    const tags = element.tags ?? {};
    const kind = tags.amenity;
    if (kind === 'hospital' || kind === 'clinic' || kind === 'doctors' || kind === 'pharmacy') {
      return [{ kind: 'healthcare' as const, lat, lng }];
    }
    if (kind === 'school') return [{ kind: 'school' as const, lat, lng }];
    if (kind === 'library') return [{ kind: 'library' as const, lat, lng }];
    if (tags.public_transport === 'platform') return [{ kind: 'transit' as const, lat, lng }];
    if (kind === 'supermarket' || tags.shop === 'supermarket') {
      return [{ kind: 'grocery' as const, lat, lng }];
    }
    if (tags.leisure === 'park' || tags.leisure === 'nature_reserve') {
      return [{ kind: 'park' as const, lat, lng }];
    }
    return [];
  });

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
