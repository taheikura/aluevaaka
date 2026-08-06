import type { DataSourceProvenance } from '@aluevaaka/data-model';
import { fetchJson } from '../lib/http.js';

const SOURCE_URL =
  'https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=WFS&version=2.0.0' +
  '&request=GetFeature&typeNames=avoindata:Meluselvitys_2022_Helsinki_kadut_ja_maantiet_Lden' +
  '&outputFormat=application/json&srsName=EPSG:4326';

export interface TrafficNoisePolygon {
  polygon: Array<[number, number]>;
  dbLo: number;
  dbHi: number;
}

interface NoiseFeature {
  geometry?: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  properties?: { db_lo?: number; db_hi?: number };
}

interface NoiseFeatureCollection {
  features: NoiseFeature[];
}

function ringCoordinates(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (point): point is [number, number] =>
      Array.isArray(point) &&
      point.length >= 2 &&
      typeof point[0] === 'number' &&
      typeof point[1] === 'number',
  );
}

function polygonCoordinates(
  type: NoiseFeature['geometry'] extends { type: infer T } ? T : never,
  value: unknown,
): Array<Array<[number, number]>> {
  if (type === 'Polygon') {
    if (!Array.isArray(value)) return [];
    const outerRing = ringCoordinates(value[0]);
    return outerRing.length >= 3 ? [outerRing] : [];
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((polygon) => {
    if (!Array.isArray(polygon)) return [];
    const outerRing = ringCoordinates(polygon[0]);
    return outerRing.length >= 3 ? [outerRing] : [];
  });
}

export async function fetchTrafficNoise(): Promise<{
  polygons: TrafficNoisePolygon[];
  provenance: DataSourceProvenance;
}> {
  const data = await fetchJson<NoiseFeatureCollection>(SOURCE_URL);
  const polygons = data.features.flatMap((feature) => {
    const dbLo = feature.properties?.db_lo;
    const dbHi = feature.properties?.db_hi;
    if (
      !feature.geometry ||
      dbLo === undefined ||
      dbHi === undefined ||
      !Number.isFinite(dbLo) ||
      !Number.isFinite(dbHi)
    ) {
      return [];
    }
    return polygonCoordinates(feature.geometry.type, feature.geometry.coordinates).map(
      (polygon) => ({
        polygon,
        dbLo,
        dbHi,
      }),
    );
  });
  return {
    polygons,
    provenance: {
      name: 'Helsinki noise study 2022 — road and street traffic Lden',
      url: SOURCE_URL,
      license: 'CC BY 4.0',
      fetchedAt: new Date().toISOString().slice(0, 10),
      publishedAt: '2022',
      transformVersion: '2',
    },
  };
}
