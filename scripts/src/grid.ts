import type { MunicipalityBase, MunicipalityMetrics } from '@aluevaaka/data-model';
import { cellToLatLng, gridDisk, latLngToCell } from 'h3-js';
import type { PointOfInterest, PointOfInterestKind } from './sources/points-of-interest.js';

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

export function generateGridCells(areas: MunicipalityBase[], resolution = 8): GridCell[] {
  const cells = new Map<string, GridCell>();
  for (const area of areas) {
    const index = latLngToCell(area.coordinates.lat, area.coordinates.lng, resolution);
    for (const cell of gridDisk(index, 3)) {
      const [lat, lng] = cellToLatLng(cell);
      if (lat < 60.05 || lat > 60.42 || lng < 24.45 || lng > 25.35) continue;
      cells.set(cell, {
        ...area,
        id: `h3-${cell}`,
        nameFi: `Alue ${cell.slice(-6)}`,
        coordinates: { lat, lng },
        h3Index: cell,
      });
    }
  }
  return [...cells.values()];
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
