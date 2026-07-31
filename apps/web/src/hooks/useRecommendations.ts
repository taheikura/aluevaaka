import { useState } from 'react';
import type { RecommendationRequest, RecommendationResponse } from '@aluevaaka/schemas';
import { postRecommendations } from '../api/client.js';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: RecommendationResponse }
  | { status: 'error'; message: string };

export function useRecommendations() {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function submit(request: RecommendationRequest) {
    setState({ status: 'loading' });
    try {
      const data = await postRecommendations(request);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }

  function reset() {
    setState({ status: 'idle' });
  }

  return { state, submit, reset };
}
