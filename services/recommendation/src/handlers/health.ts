import type { HealthResponse } from '@aluevaaka/schemas';
import { config } from '../config.js';
import { loadDataset } from '../dataset.js';
import { logger } from '../logger.js';
import { error, ok, type HandlerResponse } from '../response.js';

export async function handleHealth(origin: string | undefined): Promise<HandlerResponse> {
  try {
    const dataset = await loadDataset();
    const body: HealthResponse = {
      status: 'ok',
      serviceVersion: config.serviceVersion,
      datasetVersion: dataset.manifest.version,
      datasetStatus: 'available',
    };
    return ok(body, origin);
  } catch (err) {
    logger.error('health_check_failed', { error: String(err) });
    const body: HealthResponse = {
      status: 'error',
      serviceVersion: config.serviceVersion,
      datasetStatus: 'unavailable',
    };
    return error(503, { error: 'Dataset unavailable', code: 'DATASET_UNAVAILABLE' }, origin);
  }
}
