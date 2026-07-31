import { useLocation, useNavigate } from 'react-router-dom';
import type { RecommendationResponse } from '@aluevaaka/schemas';
import { ResultCard } from '../components/ResultCard.js';
import { ResultMap } from '../components/ResultMap.js';

interface LocationState {
  data?: RecommendationResponse;
}

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  if (!state?.data) {
    return (
      <div className="results-empty">
        <p>Ei hakutuloksia. Palaa etusivulle ja tee haku.</p>
        <button onClick={() => navigate('/')}>Etusivulle</button>
      </div>
    );
  }

  const { results, datasetVersion } = state.data;

  return (
    <div className="results-page">
      <div className="results-header">
        <h1>Suositellut kunnat</h1>
        <p className="dataset-version">
          Aineisto: <time dateTime={datasetVersion}>{datasetVersion}</time>
        </p>
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Muuta hakua
        </button>
      </div>

      {results.length === 0 ? (
        <p role="status">Yksikään kunta ei täyttänyt antamiasi ehtoja. Löysää rajoituksia.</p>
      ) : (
        <>
          <section aria-label="Karttanäkymä" className="map-section">
            <ResultMap results={results} />
          </section>

          <section aria-label="Kuntalistaus" className="results-list">
            {results.map((result, i) => (
              <ResultCard key={result.municipalityId} result={result} rank={i + 1} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
