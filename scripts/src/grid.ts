import type { MunicipalityBase, MunicipalityMetrics } from '@aluevaaka/data-model';
import { cellToBoundary, cellToLatLng, polygonToCells } from 'h3-js';
import type { PointOfInterest, PointOfInterestKind } from './sources/points-of-interest.js';
import type { TrafficNoisePolygon } from './sources/traffic-noise.js';

export interface GridCell extends MunicipalityBase {
  h3Index: string;
  postalCode?: string;
}

export interface GridCellMetrics extends MunicipalityMetrics {
  h3Index: string;
  distanceToHealthcareKm?: number;
  distanceToTransitKm?: number;
  distanceToGroceryKm?: number;
  distanceToParkKm?: number;
  distanceToSchoolKm?: number;
  distanceToLibraryKm?: number;
}

const KIND_KEYS: Record<PointOfInterestKind, keyof GridCellMetrics> = {
  healthcare: 'distanceToHealthcareKm',
  transit: 'distanceToTransitKm',
  grocery: 'distanceToGroceryKm',
  park: 'distanceToParkKm',
  school: 'distanceToSchoolKm',
  library: 'distanceToLibraryKm',
};

// H3 resolution 9 is approximately 200 m across and keeps the map dataset manageable.
const GRID_RESOLUTION = 9;
const GRID_BOUNDS = [
  [60.05, 24.45],
  [60.05, 25.35],
  [60.42, 25.35],
  [60.42, 24.45],
  [60.05, 24.45],
] as [number, number][];

function distanceKm(a: [number, number], b: [number, number]): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const earthRadiusKm = 6371;
  const latDelta = ((lat2 - lat1) * Math.PI) / 180;
  const lonDelta = ((lon2 - lon1) * Math.PI) / 180;
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(lonDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function nearestDistance(
  cell: [number, number],
  points: PointOfInterest[],
  kind: PointOfInterestKind,
): number | undefined {
  const matches = points.filter((point) => point.kind === kind);
  if (matches.length === 0) return undefined;
  return Math.min(...matches.map((point) => distanceKm(cell, [point.lat, point.lng])));
}

function nearestArea(cell: [number, number], areas: MunicipalityBase[]): MunicipalityBase {
  return areas.reduce((nearest, area) => {
    const nearestDistance = distanceKm(cell, [nearest.coordinates.lat, nearest.coordinates.lng]);
    const areaDistance = distanceKm(cell, [area.coordinates.lat, area.coordinates.lng]);
    return areaDistance < nearestDistance ? area : nearest;
  });
}

export function generateGridCells(
  areas: MunicipalityBase[],
  resolution = GRID_RESOLUTION,
): GridCell[] {
  const validAreas = areas.filter(
    (area) => Number.isFinite(area.coordinates.lat) && Number.isFinite(area.coordinates.lng),
  );
  const cells = polygonToCells(GRID_BOUNDS, resolution);
  return cells.map((cell) => {
    const [lat, lng] = cellToLatLng(cell);
    const area = nearestArea([lat, lng], validAreas);
    return {
      ...area,
      id: `h3-${cell}`,
      nameFi: `${area.nameFi} (${area.postalCode ?? area.id})`,
      coordinates: { lat, lng },
      polygon: cellToBoundary(cell).map(([cellLat, cellLng]) => [cellLat, cellLng]),
      h3Index: cell,
    };
  });
}

export function calculateGridMetrics(
  cells: GridCell[],
  points: PointOfInterest[],
): GridCellMetrics[] {
  return cells.map((cell) => {
    const coordinates: [number, number] = [cell.coordinates.lat, cell.coordinates.lng];
    const distances = Object.fromEntries(
      (Object.keys(KIND_KEYS) as PointOfInterestKind[]).map((kind) => [
        KIND_KEYS[kind],
        nearestDistance(coordinates, points, kind),
      ]),
    );
    return {
      id: cell.id,
      h3Index: cell.h3Index,
      ...distances,
    } as GridCellMetrics;
  });
}

export function calculateNoiseMetrics(
  cells: GridCell[],
  polygons: TrafficNoisePolygon[],
): MunicipalityMetrics[] {
  const polygonBounds = polygons.map((noise) => {
    const latitudes = noise.polygon.map(([, lat]) => lat);
    const longitudes = noise.polygon.map(([lng]) => lng);
    return {
      noise,
      minLat: Math.min(...latitudes),
      maxLat: Math.max(...latitudes),
      minLng: Math.min(...longitudes),
      maxLng: Math.max(...longitudes),
    };
  });

  const containsPoint = (point: [number, number], polygon: Array<[number, number]>): boolean => {
    const [lat, lng] = point;
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const [currentLng, currentLat] = polygon[index] ?? [0, 0];
      const [previousLng, previousLat] = polygon[previous] ?? [0, 0];
      const crosses = currentLat > lat !== previousLat > lat;
      if (
        crosses &&
        lng <
          ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat) +
            currentLng
      ) {
        inside = !inside;
      }
    }
    return inside;
  };

  return cells.map((cell) => {
    const [lat, lng] = cell.coordinates ? [cell.coordinates.lat, cell.coordinates.lng] : [0, 0];
    const cellBoundary =
      cell.polygon?.map(([cellLat, cellLng]) => [cellLat, cellLng] as [number, number]) ?? [];
    const match =
      polygonBounds.find(({ noise, minLat, maxLat, minLng, maxLng }) => {
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return false;
        return containsPoint([lat, lng], noise.polygon);
      }) ??
      polygonBounds.find(({ noise, minLat, maxLat, minLng, maxLng }) => {
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return false;
        return cellBoundary.some((vertex) => containsPoint(vertex, noise.polygon));
      });
    if (!match) return { id: cell.id };
    return {
      id: cell.id,
      trafficNoiseLdenDb: (match.noise.dbLo + match.noise.dbHi) / 2,
      trafficNoiseCoverage: containsPoint([lat, lng], match.noise.polygon) ? 1 : 0.5,
      trafficNoiseDataYear: '2022',
    };
  });
}
