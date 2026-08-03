import type {
  Preferences,
  RecommendationRequest,
  RecommendationResponse,
} from '@aluevaaka/schemas';
import { useEffect, useState } from 'react';
import { getHealth, postRecommendations } from '../api/client.js';
import { PreferenceForm } from './PreferenceForm.js';
import { ResultMap } from './ResultMap.js';

const DEFAULT_PREFERENCES: Preferences = {
  housingAffordability: 0,
  healthcareAccess: 0,
  transportConnectivity: 0,
  natureAndRecreation: 0,
  economicOutlook: 0,
  services: 0,
};

export function LiveRecommendationView() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getHealth>> | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const request: RecommendationRequest = {
    preferences,
    constraints: {},
    limit: 2000,
  };

  useEffect(() => {
    if (!Object.values(preferences).some((value) => (value ?? 0) > 0)) return;
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        setData(await postRecommendations(request));
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  const updatePreferences = (next: RecommendationRequest) => {
    setPreferences(next.preferences);
  };

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
          <ResultMap results={data?.results ?? []} />
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
