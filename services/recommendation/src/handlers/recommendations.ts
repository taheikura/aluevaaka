import {
  MapRequestSchema,
  RecommendationRequestSchema,
  type RecommendationResponse,
} from '@aluevaaka/schemas';
import { rankMunicipalities } from '@aluevaaka/scoring';
import { config } from '../config.js';
import { loadDataset, loadMapDataset } from '../dataset.js';
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
  let dataset: Awaited<ReturnType<typeof loadDataset>>;
  try {
    dataset = await loadMapDataset();
  } catch (err) {
    const message = String(err);
    logger.error('map_dataset_load_failed', { error: message });
    return error(
      503,
      { error: 'Dataset unavailable', code: 'DATASET_UNAVAILABLE', details: { message } },
      origin,
    );
  }
  const { south, west, north, east } = input.data.bounds;
  const latitudePadding = (north - south) * 0.1;
  const longitudePadding = (east - west) * 0.1;
  const paddedSouth = Math.max(-90, south - latitudePadding);
  const paddedNorth = Math.min(90, north + latitudePadding);
  const paddedWest = Math.max(-180, west - longitudePadding);
  const paddedEast = Math.min(180, east + longitudePadding);
  const visibleIds = new Set(
    dataset.municipalities
      .filter(({ coordinates }) => {
        const { lat, lng } = coordinates;
        return lat >= paddedSouth && lat <= paddedNorth && lng >= paddedWest && lng <= paddedEast;
      })
      .map(({ id }) => id),
  );
  const visibleMunicipalities = dataset.municipalities.filter(({ id }) => visibleIds.has(id));
  const visibleMetrics = dataset.metrics.filter(({ id }) => visibleIds.has(id));
  const maximumCandidates = input.data.zoom <= 10 ? 4000 : input.data.zoom <= 12 ? 10000 : 20000;
  const candidateStride = Math.max(1, Math.ceil(visibleMunicipalities.length / maximumCandidates));
  const candidateMunicipalities = visibleMunicipalities.filter(
    (_, index) => index % candidateStride === 0,
  );
  const candidateIds = new Set(candidateMunicipalities.map(({ id }) => id));
  const candidateMetrics = visibleMetrics.filter(({ id }) => candidateIds.has(id));
  const maximumMapCells = input.data.zoom <= 10 ? 1500 : input.data.zoom <= 12 ? 3000 : 6000;
  const ranked = rankMunicipalities({
    municipalities: candidateMunicipalities,
    metrics: candidateMetrics,
    ranges: dataset.ranges,
    preferences: input.data.preferences,
    constraints: input.data.constraints,
    limit: Math.min(maximumMapCells, candidateMunicipalities.length),
  });
  const detailStride = input.data.zoom <= 10 ? 4 : input.data.zoom <= 12 ? 2 : 1;
  const visible = ranked
    .filter((_, index) => index % detailStride === 0)
    .map((result, index) => ({
      ...result,
      rank: index + 1,
      isGoodMatch: result.score >= 0.8,
    }));
  logger.info('map_completed', {
    resultCount: visible.length,
    visibleCount: visibleMunicipalities.length,
    candidateCount: candidateMunicipalities.length,
    datasetCount: dataset.municipalities.length,
    zoom: input.data.zoom,
    responseBytes: JSON.stringify(visible).length,
  });
  return ok({ datasetVersion: dataset.manifest.version, results: visible }, origin);
}
