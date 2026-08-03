import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type Kind = 'healthcare' | 'transit' | 'grocery' | 'park' | 'school' | 'library';

type Coordinate = [number, number];

interface Feature {
  type: 'Feature';
  id?: string | number;
  geometry: { type: string; coordinates: unknown } | null;
  properties?: Record<string, unknown>;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

interface PoiRecord {
  kind: Kind;
  lat: number;
  lng: number;
  name?: string;
  osmId?: string;
}

const input = resolve(process.argv[2] ?? 'data/raw/osm-poi.geojson');
const output = resolve(process.argv[3] ?? 'data/raw/osm-poi.json');

function kindFor(properties: Record<string, unknown>): Kind | undefined {
  const amenity = String(properties.amenity ?? '');
  if (amenity === 'school') return 'school';
  if (amenity === 'library') return 'library';
  if (['hospital', 'clinic', 'doctors', 'pharmacy'].includes(amenity)) return 'healthcare';
  if (properties.shop === 'supermarket') return 'grocery';
  if (properties.leisure === 'park' || properties.leisure === 'nature_reserve') return 'park';
  if (properties.public_transport === 'platform' || properties.highway === 'bus_stop') {
    return 'transit';
  }
  return undefined;
}

function coordinatesOf(geometry: Feature['geometry']): Coordinate[] {
  if (!geometry) return [];
  const collect = (value: unknown): Coordinate[] => {
    if (!Array.isArray(value)) return [];
    if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
      return [[value[0], value[1]]];
    }
    return value.flatMap(collect);
  };
  return collect(geometry.coordinates);
}

function representativePoint(feature: Feature): Coordinate | undefined {
  const coordinates = coordinatesOf(feature.geometry);
  if (coordinates.length === 0) return undefined;
  const [lng, lat] = coordinates.reduce(
    ([sumLng, sumLat], [pointLng, pointLat]) => [sumLng + pointLng, sumLat + pointLat],
    [0, 0],
  );
  return [lng / coordinates.length, lat / coordinates.length];
}

async function main(): Promise<void> {
  const source = JSON.parse(await readFile(input, 'utf8')) as FeatureCollection;
  const seen = new Set<string>();
  const points: PoiRecord[] = [];

  for (const feature of source.features) {
    const properties = feature.properties ?? {};
    const kind = kindFor(properties);
    const point = representativePoint(feature);
    if (!kind || !point) continue;
    const [lng, lat] = point;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const osmId = feature.id === undefined ? undefined : String(feature.id);
    const key = `${kind}:${osmId ?? `${lat}:${lng}`}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = typeof properties.name === 'string' ? properties.name : undefined;
    points.push({ kind, lat, lng, ...(name ? { name } : {}), ...(osmId ? { osmId } : {}) });
  }

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(points, null, 2));
  console.log(JSON.stringify({ input, output, count: points.length }));
}

main().catch((error) => {
  console.error(JSON.stringify({ level: 'ERROR', message: String(error) }));
  process.exit(1);
});
