import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from '@aws-sdk/client-cloudwatch';
import { config } from './config.js';
import { logger } from './logger.js';

const cloudwatch = new CloudWatchClient({ region: config.region });
const namespace = 'Aluevaaka/Recommendation';

export async function publishDatasetMetrics(input: {
  version: string;
  areaCount: number;
  metricCoverage: Record<string, number>;
  qualityWarningCount: number;
  generatedAt: string;
}): Promise<void> {
  const timestamp = new Date();
  const generatedAt = new Date(input.generatedAt);
  const ageHours = Number.isNaN(generatedAt.getTime())
    ? 0
    : Math.max(0, (timestamp.getTime() - generatedAt.getTime()) / 3_600_000);
  const metrics = [
    { name: 'DatasetAreaCount', value: input.areaCount, unit: StandardUnit.Count },
    { name: 'DatasetAgeHours', value: ageHours, unit: StandardUnit.Count },
    {
      name: 'DatasetQualityWarningCount',
      value: input.qualityWarningCount,
      unit: StandardUnit.Count,
    },
    ...Object.entries(input.metricCoverage).map(([key, value]) => ({
      name: `MetricCoverage_${key}`,
      value: value * 100,
      unit: StandardUnit.Percent,
    })),
  ];

  try {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: namespace,
        MetricData: metrics.map((metric) => ({
          MetricName: metric.name,
          Value: metric.value,
          Unit: metric.unit,
          Timestamp: timestamp,
          Dimensions: [{ Name: 'Environment', Value: config.environment }],
        })),
      }),
    );
  } catch (error) {
    logger.warn('dataset_metrics_publish_failed', { error: String(error) });
  }
}

export async function publishDatasetFailureMetric(): Promise<void> {
  try {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: namespace,
        MetricData: [
          {
            MetricName: 'DatasetUnavailableCount',
            Value: 1,
            Unit: StandardUnit.Count,
            Dimensions: [{ Name: 'Environment', Value: config.environment }],
          },
        ],
      }),
    );
  } catch (error) {
    logger.warn('dataset_failure_metric_publish_failed', { error: String(error) });
  }
}

export async function publishRecommendationMetric(): Promise<void> {
  try {
    await cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: namespace,
        MetricData: [
          {
            MetricName: 'RecommendationRequestCount',
            Value: 1,
            Unit: 'Count',
            Dimensions: [{ Name: 'Environment', Value: config.environment }],
          },
        ],
      }),
    );
  } catch (error) {
    logger.warn('recommendation_metric_publish_failed', { error: String(error) });
  }
}
