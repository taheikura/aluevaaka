/**
 * Typed API client for the recommendation backend.
 *
 * Centralising fetch here means swapping from Lambda Function URL to API
 * Gateway is a one-line change to the base URL — nothing else changes.
 */
import {
  type HealthResponse,
  HealthResponseSchema,
  type MapRequest,
  type MapResponse,
  MapResponseSchema,
  type RecommendationRequest,
  type RecommendationResponse,
  RecommendationResponseSchema,
} from '@aluevaaka/schemas';

const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api').replace(
  /\/$/,
  '',
);

async function fetchApi<T>(
  path: string,
  init: RequestInit,
  schema: { parse: (v: unknown) => T },
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`API ${res.status} ${path}`, body);
    const details = body as { error?: string; details?: { message?: string } };
    const message = [details.error ?? 'Unknown error', details.details?.message]
      .filter(Boolean)
      .join(': ');
    throw new ApiError(res.status, message, body);
  }

  const json = await res.json();
  return schema.parse(json);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function getHealth(): Promise<HealthResponse> {
  return fetchApi('/health', { method: 'GET' }, HealthResponseSchema);
}

export async function postRecommendations(
  request: RecommendationRequest,
): Promise<RecommendationResponse> {
  return fetchApi(
    '/recommendations',
    { method: 'POST', body: JSON.stringify(request) },
    RecommendationResponseSchema,
  );
}

export async function postMap(request: MapRequest): Promise<MapResponse> {
  return fetchApi('/map', { method: 'POST', body: JSON.stringify(request) }, MapResponseSchema);
}
