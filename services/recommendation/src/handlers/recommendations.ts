import {
  MapRequestSchema,
  RecommendationRequestSchema,
  type RecommendationResponse,
} from '@aluevaaka/schemas';
import { rankMunicipalities } from '@aluevaaka/scoring';
import { config } from '../config.js';
import { loadDataset } from '../dataset.js';
import { logger } from '../logger.js';
import { publishRecommendationMetric } from '../metrics.js';
import { error, type HandlerResponse, ok } from '../response.js';

export async function handleRecommendations(
  rawBody: string | null | undefined,
  origin: string | undefined,
): Promise<HandlerResponse> {
  // Guard: request size
  const bodyBytes = new TextEncoder().encode(rawBody ?? '').length;
  if (bodyBytes > config.maxBodyBytes) {
    return error(413, { error: 'Request body too large', code: 'REQUEST_TOO_LARGE' }, origin);
  }

  // Parse and validate body
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody ?? '{}');
  } catch {
    return error(400, { error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, origin);
  }

  const result = RecommendationRequestSchema.safeParse(parsed);
  if (!result.success) {
    return error(
      400,
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: result.error.flatten(),
      },
      origin,
    );
  }

  const { preferences, constraints, limit } = result.data;

  // Load dataset
  let dataset: Awaited<ReturnType<typeof loadDataset>>;
  try {
    dataset = await loadDataset();
  } catch (err) {
    logger.error('dataset_load_failed', { error: String(err) });
    return error(503, { error: 'Dataset unavailable', code: 'DATASET_UNAVAILABLE' }, origin);
  }

  const startMs = Date.now();
  const results = rankMunicipalities({
    municipalities: dataset.municipalities,
    metrics: dataset.metrics,
    ranges: dataset.ranges,
    preferences,
    constraints,
    limit,
  });

  const durationMs = Date.now() - startMs;

  logger.info('recommendation_completed', {
    durationMs,
    resultCount: results.length,
    datasetVersion: dataset.manifest.version,
  });
  await publishRecommendationMetric();

  const body: RecommendationResponse = {
    datasetVersion: dataset.manifest.version,
    results,
  };

  return ok(body, origin);
}

export async function handleMap(
  rawBody: string | null | undefined,
  origin: string | undefined,
): Promise<HandlerResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody ?? '{}');
  } catch {
    return error(400, { error: 'Invalid JSON', code: 'VALIDATION_ERROR' }, origin);
  }
  const input = MapRequestSchema.safeParse(parsed);
  if (!input.success) {
    return error(400, { error: 'Validation failed', code: 'VALIDATION_ERROR' }, origin);
  }
  const dataset = await loadDataset();
  const ranked = rankMunicipalities({
    municipalities: dataset.municipalities,
    metrics: dataset.metrics,
    ranges: dataset.ranges,
    preferences: input.data.preferences,
    constraints: input.data.constraints,
    limit: dataset.municipalities.length,
  });
  const { south, west, north, east } = input.data.bounds;
  const visible = ranked
    .filter(({ coordinates }) => {
      const { lat, lng } = coordinates;
      return lat >= south && lat <= north && lng >= west && lng <= east;
    })
    .map((result, index) => ({
      ...result,
      rank: index + 1,
      isGoodMatch: result.score >= 0.8,
    }));
  return ok({ datasetVersion: dataset.manifest.version, results: visible }, origin);
}
