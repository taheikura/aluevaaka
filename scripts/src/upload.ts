#!/usr/bin/env tsx
/**
 * Upload generated datasets to S3.
 *
 * Expects environment variables:
 *   DATA_BUCKET  — target S3 bucket name
 *   DATA_PREFIX  — key prefix, defaults to "data/generated"
 *   AWS_REGION   — defaults to "eu-north-1"
 *
 * Run: DATA_BUCKET=my-bucket pnpm --filter @aluevaaka/scripts upload
 */
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { log } from './lib/logger.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const DATA_BUCKET = process.env.DATA_BUCKET;
const DATA_PREFIX = process.env.DATA_PREFIX ?? 'data/generated';
const REGION = process.env.AWS_REGION ?? 'eu-north-1';
const LOCAL_DIR = join(__dirname, '../../data/generated');

if (!DATA_BUCKET) {
  console.error('Missing required env var: DATA_BUCKET');
  process.exit(1);
}

const s3 = new S3Client({ region: REGION });

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
};

async function upload(): Promise<void> {
  log.info('upload_start', { bucket: DATA_BUCKET, prefix: DATA_PREFIX });

  try {
    await access(LOCAL_DIR);
  } catch {
    throw new Error(
      `Generated dataset directory does not exist: ${LOCAL_DIR}. Run the pipeline first.`,
    );
  }

  const files: string[] = [];
  async function collect(directory: string): Promise<void> {
    for (const entry of await readdir(directory)) {
      const localPath = join(directory, entry);
      const info = await stat(localPath);
      if (info.isDirectory()) await collect(localPath);
      else if (entry.endsWith('.json')) files.push(localPath);
    }
  }
  await collect(LOCAL_DIR);

  if (files.length === 0) {
    log.error('upload_no_files', { dir: LOCAL_DIR });
    process.exit(1);
  }

  await Promise.all(
    files.map(async (localPath) => {
      const file = localPath.slice(LOCAL_DIR.length + 1);
      const key = `${DATA_PREFIX}/${file}`;
      const body = await readFile(localPath);
      const ext = `.${basename(file).split('.').pop() ?? ''}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: DATA_BUCKET,
          Key: key,
          Body: body,
          ContentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
          // Disable caching — Lambda always reads the freshest version
          CacheControl: 'no-cache',
        }),
      );

      log.info('uploaded', { key, bytes: body.length });
    }),
  );

  log.info('upload_complete', { fileCount: files.length });
}

upload().catch((err) => {
  console.error(JSON.stringify({ level: 'ERROR', msg: 'upload_failed', error: String(err) }));
  process.exit(1);
});
