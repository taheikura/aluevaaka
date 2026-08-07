import type { RecommendationResult } from '@aluevaaka/schemas';

interface Props {
  result: RecommendationResult;
  rank: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  housingAffordability: 'Asuminen',
  healthcareAccess: 'Terveydenhuolto',
  transportConnectivity: 'Liikenne',
  natureAndRecreation: 'Luonto',
  economicOutlook: 'Talous',
  services: 'Palvelut',
};

function ScoreBar({ value, label }: { value: number | undefined; label: string }) {
  if (value === undefined) return null;
  const pct = Math.round(value * 100);
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div
        className="score-bar-track"
        role="meter"
        aria-label={`${label}: ${pct} / 100`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="score-bar-value">{pct}</span>
    </div>
  );
}

export function ResultCard({ result, rank }: Props) {
  const overallPct = Math.round(result.score * 100);
  const completenessPct = Math.round(result.dataCompleteness * 100);

  return (
    <article className="result-card" aria-label={`${rank}. ${result.name}`}>
      <header className="result-card-header">
        <span className="result-rank" aria-hidden="true">
          {rank}
        </span>
        <div className="result-title">
          <h2 className="result-name">{result.name}</h2>
          <span className="result-region">{result.region}</span>
        </div>
        <div className="result-overall-score">
          <span className="score-label">Kokonaispistemäärä: </span>
          <span className="score-number">{overallPct}</span>
          <span className="score-max">/100</span>
        </div>
      </header>

      <section aria-label="Kategoriapistemäärät" className="category-scores">
        {Object.entries(result.categoryScores).map(([key, val]) => (
          <ScoreBar key={key} value={val} label={CATEGORY_LABELS[key] ?? key} />
        ))}
      </section>

      {result.housingPricePerM2 !== undefined && (
        <p className="housing-data" role="note">
          Asuntojen toteutunut neliöhinta:{' '}
          {Math.round(result.housingPricePerM2).toLocaleString('fi-FI')} €/m²
          {result.housingTransactionCount !== undefined &&
            ` · ${result.housingTransactionCount} kauppaa`}
          {result.housingDataYear && ` · lähdevuosi ${result.housingDataYear}`}
        </p>
      )}

      {result.avgMonthlyRent2r !== undefined && (
        <p className="housing-data" role="note">
          Keskimääräinen 2h vuokra: {Math.round(result.avgMonthlyRent2r).toLocaleString('fi-FI')}{' '}
          €/kk
        </p>
      )}

      {result.strengths.length > 0 && (
        <section aria-label="Vahvuudet" className="result-section">
          <h3>Vahvuudet</h3>
          <ul>
            {result.strengths.map((s) => (
              <li key={s}>✓ {s}</li>
            ))}
          </ul>
        </section>
      )}

      {result.tradeoffs.length > 0 && (
        <section aria-label="Heikkoudet" className="result-section">
          <h3>Huomioita</h3>
          <ul>
            {result.tradeoffs.map((t) => (
              <li key={t}>△ {t}</li>
            ))}
          </ul>
        </section>
      )}

      {completenessPct < 90 && (
        <p className="completeness-warning" role="note">
          Tietojen kattavuus: {completenessPct} % nykyisistä vertailumittareista.
        </p>
      )}
    </article>
  );
}
