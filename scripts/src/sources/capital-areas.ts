import type { DataSourceProvenance, MunicipalityBase } from '@aluevaaka/data-model';
import { fetchJson } from '../lib/http.js';
import { log } from '../lib/logger.js';

const SOURCE_URL =
  'https://kartta.hsy.fi/geoserver/wfs?service=WFS&version=2.0.0' +
  '&request=GetFeature&typeName=taustakartat_ja_aluejaot:pks_postinumeroalueet_2024' +
  '&outputFormat=application/json&srsName=EPSG:4326';

interface AreaFeature {
  properties: {
    posnro: string;
    nimi: string;
    nimiru?: string;
    kunta: string;
    kunta_nro: string;
  };
  geometry: { type: string; coordinates: unknown };
}

interface AreaGeoJson {
  features: AreaFeature[];
}

function centroid(geometry: AreaFeature['geometry']): { lat: number; lng: number } | null {
  const coordinates = geometry.coordinates as number[][][];
  const ring = coordinates[0] ?? [];
  if (geometry.type !== 'Polygon' || ring.length === 0) return null;
  return {
    lat: ring.reduce((sum, point) => sum + point[1], 0) / ring.length,
    lng: ring.reduce((sum, point) => sum + point[0], 0) / ring.length,
  };
}

export async function fetchCapitalAreas(): Promise<{
  municipalities: MunicipalityBase[];
  provenance: DataSourceProvenance;
}> {
  log.info('fetch_capital_areas_start', { url: SOURCE_URL });
  const data = await fetchJson<AreaGeoJson>(SOURCE_URL);
  const municipalities = data.features
    .filter((feature) =>
      ['Helsinki', 'Espoo', 'Vantaa', 'Kauniainen'].includes(feature.properties.kunta),
    )
    .map((feature) => {
      const coords = centroid(feature.geometry);
      if (!coords) return undefined;
      return {
        id: `postal-${feature.properties.posnro}`,
        municipalityId: feature.properties.kunta_nro,
        postalCode: feature.properties.posnro,
        nameFi: feature.properties.nimi,
        nameSv: feature.properties.nimiru,
        region: feature.properties.kunta,
        coordinates: coords,
        population: 0,
        areaKm2: 0,
      } satisfies MunicipalityBase;
    })
    .filter((area): area is MunicipalityBase => area !== undefined);

  log.info('fetch_capital_areas_done', { count: municipalities.length });
  return {
    municipalities,
    provenance: {
      name: 'HSY — Helsinki metropolitan postal areas',
      url: SOURCE_URL,
      license: 'HSY open data terms',
      fetchedAt: new Date().toISOString().slice(0, 10),
      transformVersion: '1',
    },
  };
}
