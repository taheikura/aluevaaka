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
const OVERPASS_QUERY_TIMEOUT_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 75_000;
const REQUEST_DELAY_MS = 15_000;
const RETRY_AFTER_FALLBACK_MS = 60_000;
const MAX_TILE_SUBDIVISION_DEPTH = 2;

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

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function retryAfterMilliseconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;
  return Math.max(0, timestamp - Date.now());
}

function splitTile(bbox: string): string[] {
  const [south, west, north, east] = bbox.split(',').map(Number);
  const middleLat = (south + north) / 2;
  const middleLng = (west + east) / 2;
  return [
    `${south},${west},${middleLat},${middleLng}`,
    `${south},${middleLng},${middleLat},${east}`,
    `${middleLat},${west},${north},${middleLng}`,
    `${middleLat},${middleLng},${north},${east}`,
  ];
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
  let requestStarted = false;
  const fetchTile = async (
    tile: string,
    label: string,
    depth: number,
  ): Promise<{ elements: OverpassElement[]; succeeded: boolean }> => {
    let data: OverpassResponse | undefined;
    let lastError: unknown;
    for (const url of SOURCE_URLS) {
      if (requestStarted) await delay(REQUEST_DELAY_MS);
      requestStarted = true;
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
          tile: label,
          url,
          error: String(error),
          ...(error instanceof HttpError && error.retryAfter
            ? { retryAfter: error.retryAfter }
            : {}),
        });
        if (error instanceof HttpError && error.status === 429) {
          const waitMs = retryAfterMilliseconds(error.retryAfter) ?? RETRY_AFTER_FALLBACK_MS;
          log.info('points_of_interest_rate_limit_wait', { tile: label, waitMs });
          await delay(waitMs);
        }
      }
    }
    if (data) return { elements: data.elements, succeeded: true };

    if (depth < MAX_TILE_SUBDIVISION_DEPTH) {
      log.info('points_of_interest_tile_split', {
        tile: label,
        depth,
        error: String(lastError),
      });
      const parts = splitTile(tile);
      const elements: OverpassElement[] = [];
      let succeeded = false;
      for (const [index, part] of parts.entries()) {
        const result = await fetchTile(part, `${label}.${index + 1}`, depth + 1);
        elements.push(...result.elements);
        succeeded ||= result.succeeded;
      }
      return { elements, succeeded };
    }

    log.warn('points_of_interest_tile_unavailable', {
      tile: label,
      error: String(lastError),
    });
    return { elements: [], succeeded: false };
  };

  for (const [tileIndex, tile] of tiles.entries()) {
    const result = await fetchTile(tile, String(tileIndex + 1), 0);
    if (!result.succeeded) {
      failedTiles.push(tileIndex + 1);
      continue;
    }

    for (const element of result.elements) {
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
      count: result.elements.length,
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
