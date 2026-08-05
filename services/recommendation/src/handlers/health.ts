import type { HealthResponse } from '@aluevaaka/schemas';
import { config } from '../config.js';
import { loadManifest } from '../dataset.js';
import { logger } from '../logger.js';
import { error, type HandlerResponse, ok } from '../response.js';

export async function handleHealth(origin: string | undefined): Promise<HandlerResponse> {
  try {
    const manifest = await loadManifest();
    const body: HealthResponse = {
      status: 'ok',
      serviceVersion: config.serviceVersion,
      datasetVersion: manifest.version,
      datasetStatus: 'available',
      municipalityCount: manifest.municipalityCount,
      areaCount: manifest.areaCount,
      metricCoverage: manifest.metricCoverage,
      qualityWarnings: manifest.qualityWarnings,
      generatedAt: manifest.generatedAt,
      sources: manifest.sources.map(({ name, fetchedAt, publishedAt }) => ({
        name,
        fetchedAt,
        ...(publishedAt ? { publishedAt } : {}),
      })),
    };
    return ok(body, origin);
  } catch (err) {
    logger.error('health_check_failed', { error: String(err) });
    return error(503, { error: 'Dataset unavailable', code: 'DATASET_UNAVAILABLE' }, origin);
  }
}
