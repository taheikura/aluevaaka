import type { HealthResponse } from '@aluevaaka/schemas';
import { config } from '../config.js';
import { loadDataset } from '../dataset.js';
import { logger } from '../logger.js';
import { publishDatasetFailureMetric, publishDatasetMetrics } from '../metrics.js';
import { error, type HandlerResponse, ok } from '../response.js';

export async function handleHealth(origin: string | undefined): Promise<HandlerResponse> {
  try {
    const dataset = await loadDataset();
    const body: HealthResponse = {
      status: 'ok',
      serviceVersion: config.serviceVersion,
      datasetVersion: dataset.manifest.version,
      datasetStatus: 'available',
      municipalityCount: dataset.manifest.municipalityCount,
      areaCount: dataset.manifest.areaCount,
      metricCoverage: dataset.manifest.metricCoverage,
      qualityWarnings: dataset.manifest.qualityWarnings,
      generatedAt: dataset.manifest.generatedAt,
      sources: dataset.manifest.sources.map(({ name, fetchedAt, publishedAt }) => ({
        name,
        fetchedAt,
        ...(publishedAt ? { publishedAt } : {}),
      })),
    };
    await publishDatasetMetrics({
      version: dataset.manifest.version,
      areaCount: dataset.manifest.areaCount ?? dataset.manifest.municipalityCount,
      metricCoverage: dataset.manifest.metricCoverage ?? {},
      qualityWarningCount: dataset.manifest.qualityWarnings.length,
      generatedAt: dataset.manifest.generatedAt,
    });
    return ok(body, origin);
  } catch (err) {
    logger.error('health_check_failed', { error: String(err) });
    await publishDatasetFailureMetric();
    return error(503, { error: 'Dataset unavailable', code: 'DATASET_UNAVAILABLE' }, origin);
  }
}
