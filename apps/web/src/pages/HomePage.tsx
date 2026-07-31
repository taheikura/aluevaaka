import type { RecommendationRequest } from '@aluevaaka/schemas';
import { useNavigate } from 'react-router-dom';
import { PreferenceForm } from '../components/PreferenceForm.js';
import { useRecommendations } from '../hooks/useRecommendations.js';

export function HomePage() {
  // Navigate when state settles to success
  // (useEffect handles the async state update)
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Löydä sinulle sopiva kunta</h1>
        <p className="hero-desc">
          Aluevaaka yhdistää suomalaiset avoimet aineistot ja sinun painotuksesi. Kerro, mitä
          arvostat asuinpaikassasi – saat selitettyjä kuntasuosituksia kartalla ja listana.
        </p>
        <p className="data-disclaimer">
          Tulokset perustuvat julkisiin tilastoaineistoihin. Ne eivät ole kiinteistöneuvontaa.
          Tarkista tiedot aina suoraan kunnasta ennen päätöksentekoa.
        </p>
      </section>

      <RecommendenceFormSection />
    </div>
  );
}

function RecommendenceFormSection() {
  const navigate = useNavigate();
  const { state, submit } = useRecommendations();

  async function handleSubmit(request: RecommendationRequest) {
    await submit(request);
  }

  // Navigate after state update settles
  if (state.status === 'success') {
    navigate('/results', { state: { data: state.data }, replace: false });
  }

  return (
    <>
      {state.status === 'error' && (
        <div role="alert" className="error-banner">
          Hakuvirhe: {state.message}
        </div>
      )}
      <PreferenceForm onSubmit={handleSubmit} isLoading={state.status === 'loading'} />
    </>
  );
}
