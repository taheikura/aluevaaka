import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { fetchJson, HttpError } from '../lib/http.js';
import { log } from '../lib/logger.js';

const SOURCE_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const BOUNDS = { south: 60.05, west: 24.45, north: 60.42, east: 25.35 };
const TILE_ROWS = 4;
const TILE_COLUMNS = 4;
const USER_AGENT = 'aluevaaka-data-pipeline/1.0 contact: github.com/taheikura/aluevaaka';
const OVERPASS_QUERY_TIMEOUT_SECONDS = 30;
const REQUEST_TIMEOUT_MS = 35_000;

interface OverpassElement {
  id?: number;
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

function buildTiles(): string[] {
  const latStep = (BOUNDS.north - BOUNDS.south) / TILE_ROWS;
  const lonStep = (BOUNDS.east - BOUNDS.west) / TILE_COLUMNS;
  const tiles: string[] = [];
  for (let row = 0; row < TILE_ROWS; row += 1) {
    for (let column = 0; column < TILE_COLUMNS; column += 1) {
      const south = BOUNDS.south + row * latStep;
      const north = row === TILE_ROWS - 1 ? BOUNDS.north : south + latStep;
      const west = BOUNDS.west + column * lonStep;
      const east = column === TILE_COLUMNS - 1 ? BOUNDS.east : west + lonStep;
      tiles.push(`${south},${west},${north},${east}`);
    }
  }
  return tiles;
}

function buildQuery(bbox: string): string {
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];(
    nwr["amenity"~"hospital|clinic|doctors|pharmacy|school|library"](${bbox});
    nwr["public_transport"="platform"](${bbox});
    nwr["highway"="bus_stop"](${bbox});
    nwr["shop"="supermarket"](${bbox});
    nwr["leisure"~"park|nature_reserve"](${bbox});
  );out center qt;`;
}

function kindForElement(element: OverpassElement): PointOfInterestKind | undefined {
  const tags = element.tags ?? {};
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'library') return 'library';
  if (['hospital', 'clinic', 'doctors', 'pharmacy'].includes(tags.amenity ?? ''))
    return 'healthcare';
  if (tags.shop === 'supermarket') return 'grocery';
  if (tags.leisure === 'park' || tags.leisure === 'nature_reserve') return 'park';
  if (tags.public_transport === 'platform' || tags.highway === 'bus_stop') return 'transit';
  return undefined;
}

export async function fetchPointsOfInterest(): Promise<{
  points: PointOfInterest[];
  provenance: DataSourceProvenance;
  failedKinds: PointOfInterestKind[];
  failedTiles: number[];
}> {
  const tiles = buildTiles();
  log.info('fetch_points_of_interest_start', {
    urls: SOURCE_URLS,
    tiles: tiles.length,
    tileRows: TILE_ROWS,
    tileColumns: TILE_COLUMNS,
  });
  const points: PointOfInterest[] = [];
  const failedKinds: PointOfInterestKind[] = [];
  const seen = new Set<string>();

  const failedTiles: number[] = [];
  for (const [tileIndex, tile] of tiles.entries()) {
    let data: OverpassResponse | undefined;
    let lastError: unknown;
    for (const url of SOURCE_URLS) {
      if (data) break;
      try {
        data = await fetchJson<OverpassResponse>(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
          },
          body: new URLSearchParams({ data: buildQuery(tile) }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        break;
      } catch (error) {
        lastError = error;
        log.warn('points_of_interest_source_failed', {
          tile: tileIndex + 1,
          url,
          error: String(error),
          ...(error instanceof HttpError && error.retryAfter
            ? { retryAfter: error.retryAfter }
            : {}),
        });
        if (error instanceof HttpError && error.status === 429 && error.retryAfter) {
          log.info('points_of_interest_retry_guidance', {
            tile: tileIndex + 1,
            url,
            retryAfter: error.retryAfter,
          });
        }
      }
    }
    if (!data) {
      failedTiles.push(tileIndex + 1);
      log.warn('points_of_interest_tile_unavailable', {
        tile: tileIndex + 1,
        error: String(lastError),
      });
      continue;
    }

    for (const element of data.elements) {
      const kind = kindForElement(element);
      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;
      if (!kind || lat === undefined || lng === undefined) continue;
      const key = `${kind}:${element.type}:${element.id ?? `${lat}:${lng}`}`;
      if (seen.has(key)) continue;
      seen.add(key);
      points.push({ kind, lat, lng });
    }
    log.info('fetch_points_of_interest_tile_done', {
      tile: tileIndex + 1,
      count: data.elements.length,
    });
  }

  for (const kind of Object.keys({
    healthcare: true,
    transit: true,
    grocery: true,
    park: true,
    school: true,
    library: true,
  }) as PointOfInterestKind[]) {
    if (!points.some((point) => point.kind === kind)) failedKinds.push(kind);
  }

  if (failedKinds.length === 6) {
    throw new Error(`All points-of-interest tiles failed: ${failedKinds.join(', ')}`);
  }

  log.info('fetch_points_of_interest_done', {
    count: points.length,
    failedKinds,
    failedTiles,
  });
  return {
    points,
    failedKinds,
    failedTiles,
    provenance: {
      name: 'OpenStreetMap — points of interest via Overpass API',
      url: SOURCE_URLS.join(', '),
      license: 'OpenStreetMap ODbL',
      fetchedAt: new Date().toISOString().slice(0, 10),
      transformVersion: '1',
    },
  };
}
