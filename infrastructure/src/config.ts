/**
 * Per-environment configuration.
 *
 * All tuneable values live here so the stack code never has inline magic strings.
 * Add a new entry to support a staging environment.
 */

export type EnvName = 'development' | 'production';

export interface EnvConfig {
  /** Used as a suffix on all resource names and IDs */
  envName: EnvName;
  /** AWS account ID — set via CDK_DEFAULT_ACCOUNT or explicitly */
  account?: string;
  /** AWS region */
  region: string;
  /** S3 key prefix for generated datasets */
  dataPrefix: string;
  /** CloudFront price class — PriceClass_100 = US/EU only, cheapest */
  cfPriceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  /** Lambda memory in MB */
  lambdaMemoryMb: number;
  /** Lambda timeout in seconds */
  lambdaTimeoutSecs: number;
  /** CloudWatch log retention in days */
  logRetentionDays: number;
  /** Monthly budget alert threshold in USD */
  budgetAlertUsd: number;
  /** Email address for budget and alarm notifications */
  alertEmail: string;
}

const defaults: Omit<EnvConfig, 'envName' | 'alertEmail'> = {
  region: 'eu-north-1',
  dataPrefix: 'data/generated',
  cfPriceClass: 'PriceClass_100',
  lambdaMemoryMb: 512,
  lambdaTimeoutSecs: 60,
  logRetentionDays: 30,
  budgetAlertUsd: 10,
};

export const ENV_CONFIGS: Record<EnvName, Omit<EnvConfig, 'alertEmail'>> = {
  development: {
    ...defaults,
    envName: 'development',
    lambdaMemoryMb: 1024,
    logRetentionDays: 7,
    budgetAlertUsd: 5,
  },
  production: {
    ...defaults,
    envName: 'production',
    logRetentionDays: 90,
    budgetAlertUsd: 20,
  },
};

export function getEnvConfig(envName: string, alertEmail: string): EnvConfig {
  if (envName !== 'development' && envName !== 'production') {
    throw new Error(`Unknown env "${envName}". Valid values: development, production`);
  }
  return { ...ENV_CONFIGS[envName], alertEmail };
}
