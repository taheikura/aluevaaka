/**
 * Runtime configuration loaded from environment variables.
 * All required variables must be present at startup — fail fast if they're not.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  /** S3 bucket name for generated datasets */
  dataBucket: requireEnv('DATA_BUCKET'),

  /** S3 key prefix for generated datasets, e.g. "data/generated" */
  dataPrefix: process.env.DATA_PREFIX ?? 'data/generated',

  /** AWS region — always available inside Lambda */
  region: process.env.AWS_REGION ?? 'eu-north-1',

  /** Deployed service version, injected by CI */
  serviceVersion: process.env.SERVICE_VERSION ?? 'unknown',

  /** Deployment environment used as a CloudWatch metric dimension */
  environment: process.env.ENVIRONMENT ?? 'development',

  /** Maximum request body size in bytes (100 KB) */
  maxBodyBytes: 100 * 1024,
} as const;
