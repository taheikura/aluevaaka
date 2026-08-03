import { LiveRecommendationView } from '../components/LiveRecommendationView.js';

export function HomePage() {
  // Navigate when state settles to success
  // (useEffect handles the async state update)
  return (
    <div className="home-page">
      <LiveRecommendationView />
    </div>
  );
}
