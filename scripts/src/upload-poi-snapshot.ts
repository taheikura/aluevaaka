#!/usr/bin/env tsx
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env.DATA_BUCKET;
const key = process.env.POI_SNAPSHOT_KEY ?? 'data/raw/osm-poi.json';
const region = process.env.AWS_REGION ?? 'eu-north-1';
const path = resolve(process.env.POI_SNAPSHOT_PATH ?? 'data/raw/osm-poi.json');

if (!bucket) {
  throw new Error('Missing required env var: DATA_BUCKET');
}

const body = await readFile(path);
await new S3Client({ region }).send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'no-cache',
  }),
);
console.log(JSON.stringify({ bucket, key, path, bytes: body.length }));
