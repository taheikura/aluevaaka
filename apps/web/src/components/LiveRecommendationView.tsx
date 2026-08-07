import type { MapRequest, MapResponse, Preferences } from '@aluevaaka/schemas';
import { useEffect, useRef, useState } from 'react';
import { getHealth, postMap } from '../api/client.js';
import { PreferenceForm } from './PreferenceForm.js';
import { ResultMap } from './ResultMap.js';

const DEFAULT_PREFERENCES: Preferences = {
  housingAffordability: 0,
  healthcareAccess: 0,
  transportConnectivity: 0,
  healthcareProximity: 0,
  natureAndRecreation: 0,
  economicOutlook: 0,
  trafficNoise: 0,
  services: 0,
  groceryProximity: 0,
  schoolProximity: 0,
  natureProximity: 0,
};

export function LiveRecommendationView() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [data, setData] = useState<MapResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getHealth>> | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [mapBounds, setMapBounds] = useState<MapRequest['bounds'] | null>(null);
  const [mapZoom, setMapZoom] = useState(10);
  const requestIdRef = useRef(0);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const updatePreferences = (next: { preferences: Preferences }) => {
    setPreferences(next.preferences);
  };

  const loadMap = async (bounds: MapRequest['bounds']) => {
    setStatus('loading');
    if (!Object.values(preferences).some((value) => (value ?? 0) > 0)) {
      setStatus('idle');
      return;
    }
    try {
      const requestId = ++requestIdRef.current;
      const response = await postMap({ preferences, constraints: {}, bounds, zoom: mapZoom });
      if (requestId !== requestIdRef.current) return;
      setData(response);
      setStatus('idle');
    } catch (error) {
      setData(null);
      setStatus('error');
      console.error('Map loading failed', error);
    }
  };

  const handleBoundsChange = (bounds: MapRequest['bounds']) => {
    setMapBounds(bounds);
  };

  useEffect(() => {
    if (!mapBounds) return;
    const timer = window.setTimeout(() => void loadMap(mapBounds), 250);
    return () => window.clearTimeout(timer);
  }, [preferences, mapBounds, mapZoom]);

  return (
    <div className="live-recommendation-layout">
      <aside
        className={`live-filters${filtersOpen ? '' : ' is-collapsed'}`}
        aria-label="Aluehaun suodattimet"
      >
        <button
          type="button"
          className="filters-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          Suodattimet {filtersOpen ? '▲' : '▼'}
        </button>
        {filtersOpen && (
          <>
            <PreferenceForm
              value={{ preferences, maxHousingCost: '', maxHealthcareKm: '' }}
              onChange={updatePreferences}
              isLoading={status === 'loading'}
              showConstraints={false}
            />
            {status === 'loading' && <p role="status">Päivitetään pisteitä…</p>}
            {status === 'error' && <p role="alert">Suositusten haku epäonnistui.</p>}
          </>
        )}
        {health && (
          <p className="data-freshness">
            Data päivitetty: {new Date(health.generatedAt ?? '').toLocaleString('fi-FI')}
            {health.sources?.find((source) => source.name.includes('OpenStreetMap')) && (
              <>
                {' '}
                · OSM:{' '}
                {health.sources.find((source) => source.name.includes('OpenStreetMap'))?.fetchedAt}
              </>
            )}
          </p>
        )}
      </aside>
      <main className="live-results">
        <div className="live-map-panel">
          <ResultMap
            results={data?.results ?? []}
            onBoundsChange={handleBoundsChange}
            onZoomChange={setMapZoom}
          />
          <div className="map-legend" role="note" aria-label="Sopivuuskartan selite">
            <span className="map-legend-item">
              <span className="map-legend-swatch" style={{ background: '#10b981' }} />
              Hyvä osuma ≥ 90 %
            </span>
            <span className="map-legend-item">
              <span className="map-legend-swatch" style={{ background: '#f59e0b' }} />
              50–79 %
            </span>
            <span className="map-legend-item">
              <span className="map-legend-swatch" style={{ background: '#ef4444' }} />
              alle 50 %
            </span>
          </div>
        </div>
        <p className="live-result-summary" role="status">
          {data
            ? `${data.results.length} aluetta vertailussa`
            : 'Säädä painotuksia nähdäksesi alueet'}
        </p>
      </main>
    </div>
  );
}
