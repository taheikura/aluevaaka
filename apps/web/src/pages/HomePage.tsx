import { LiveRecommendationView } from '../components/LiveRecommendationView.js';

export function HomePage() {
  // Navigate when state settles to success
  // (useEffect handles the async state update)
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Löydä sinulle sopiva alue</h1>
        <p className="hero-desc">
          Aluevaaka yhdistää suomalaiset avoimet aineistot ja sinun painotuksesi. Kerro, mitä
          arvostat asuinpaikassasi – saat selitettyjä alue-ehdotuksia kartalla ja listana.
        </p>
        <p className="data-disclaimer">
          Tulokset perustuvat julkisiin tilastoaineistoihin. Ne eivät ole kiinteistöneuvontaa.
          Tarkista tiedot aina suoraan kunnasta ennen päätöksentekoa.
        </p>
      </section>

      <LiveRecommendationView />
    </div>
  );
}
