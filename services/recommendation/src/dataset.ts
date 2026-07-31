import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DatasetManifest, MunicipalityBase, MunicipalityMetrics } from '@aluevaaka/data-model';
import type { NormalizedDataset } from '@aluevaaka/scoring';
import { buildRanges } from '@aluevaaka/scoring';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from './config.js';
import { logger } from './logger.js';

const s3 = new S3Client({ region: config.region });

/** Module-level cache — survives warm Lambda invocations */
let cachedDataset: (NormalizedDataset & { manifest: DatasetManifest }) | null = null;
let cachedVersion: string | null = null;

/**
 * When DATA_BUCKET=local (SAM local dev), read files directly from the
 * local filesystem instead of S3. The key is treated as a relative path
 * from the project root data directory.
 *
 * SAM mounts the CodeUri at /var/task, and the project root is two levels up,
 * so we resolve relative to CWD which SAM sets to the project root.
 */
async function fetchJson<T>(key: string): Promise<T> {
  if (config.dataBucket === 'local') {
    // When running via Docker (lambda-local.sh), DATA_PREFIX is an absolute
    // path like /var/data. When running via SAM or tests, key is a relative
    // path like "data/generated/file.json" resolved from cwd.
    const localPath = key.startsWith('/') ? key : resolve(process.cwd(), key);
    logger.info('dataset_local_read', { path: localPath });
    const text = await readFile(localPath, 'utf-8');
    return JSON.parse(text) as T;
  }

  const response = await s3.send(new GetObjectCommand({ Bucket: config.dataBucket, Key: key }));
  if (!response.Body) {
    throw new Error(`Empty response body for S3 key: ${key}`);
  }
  const text = await response.Body.transformToString('utf-8');
  return JSON.parse(text) as T;
}

/**
 * Load the dataset from S3. Uses an in-memory cache keyed on the manifest
 * version so warm invocations skip S3 reads after the first call, but a
 * newly deployed dataset will be picked up on the next cold start or after
 * a function update.
 */
export async function loadDataset(): Promise<NormalizedDataset & { manifest: DatasetManifest }> {
  const manifestKey = `${config.dataPrefix}/dataset-manifest.json`;

  // Always fetch the manifest to check if the version changed
  let manifest: DatasetManifest;
  try {
    manifest = await fetchJson<DatasetManifest>(manifestKey);
  } catch (err) {
    throw new Error(
      `Failed to load dataset manifest from s3://${config.dataBucket}/${manifestKey}: ${String(err)}`,
    );
  }

  if (cachedDataset && cachedVersion === manifest.version) {
    logger.info('dataset_cache_hit', { version: manifest.version });
    return cachedDataset;
  }

  logger.info('dataset_loading', { version: manifest.version });

  const [municipalities, metricsRaw] = await Promise.all([
    fetchJson<MunicipalityBase[]>(`${config.dataPrefix}/municipalities.json`),
    fetchJson<MunicipalityMetrics[]>(`${config.dataPrefix}/metrics.json`),
  ]);

  const ranges = buildRanges(metricsRaw);

  cachedDataset = { municipalities, metrics: metricsRaw, ranges, manifest };
  cachedVersion = manifest.version;

  logger.info('dataset_loaded', {
    version: manifest.version,
    municipalityCount: municipalities.length,
  });

  return cachedDataset;
}
