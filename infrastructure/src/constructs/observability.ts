import { Duration } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import type * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config.js';
import type { RecommendationLambda } from './recommendation-lambda.js';

export interface ObservabilityProps {
  config: EnvConfig;
  lambda: RecommendationLambda;
}

/**
 * CloudWatch dashboard and AWS Budgets alert.
 *
 * The dashboard gives a quick health overview without needing to navigate
 * through the Lambda console. The budget alert prevents surprise bills.
 */
export class Observability extends Construct {
  constructor(scope: Construct, id: string, props: ObservabilityProps) {
    super(scope, id);

    const { config, lambda } = props;
    const { envName } = config;
    const fn = lambda.fn;

    // ---------------------------------------------------------------------------
    // CloudWatch Dashboard
    // ---------------------------------------------------------------------------

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `aluevaaka-${envName}`,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Invocations',
        left: [fn.metricInvocations({ period: Duration.minutes(5) })],
        width: 8,
      }) as cloudwatch.IWidget,
      new cloudwatch.GraphWidget({
        title: 'Errors',
        left: [fn.metricErrors({ period: Duration.minutes(5) })],
        width: 8,
      }) as cloudwatch.IWidget,
      new cloudwatch.GraphWidget({
        title: 'Duration (p50 / p95)',
        left: [
          fn.metricDuration({ period: Duration.minutes(5), statistic: 'p50' }),
          fn.metricDuration({ period: Duration.minutes(5), statistic: 'p95' }),
        ],
        width: 8,
      }) as cloudwatch.IWidget,
    );

    const customMetric = (name: string, unit: cloudwatch.Unit = cloudwatch.Unit.COUNT) =>
      new cloudwatch.Metric({
        namespace: 'Aluevaaka/Recommendation',
        metricName: name,
        dimensionsMap: { Environment: envName },
        period: Duration.minutes(5),
        statistic: 'Sum',
        unit,
      });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Dataset health',
        left: [
          customMetric('DatasetAreaCount'),
          customMetric('DatasetAgeHours'),
          customMetric('DatasetQualityWarningCount'),
          customMetric('DatasetUnavailableCount'),
        ],
        width: 12,
      }) as cloudwatch.IWidget,
      new cloudwatch.GraphWidget({
        title: 'Recommendation traffic',
        left: [customMetric('RecommendationRequestCount')],
        width: 12,
      }) as cloudwatch.IWidget,
    );

    const datasetAgeAlarm = new cloudwatch.Alarm(this, 'DatasetAgeAlarm', {
      alarmName: `aluevaaka-${envName}-dataset-age`,
      alarmDescription: 'Dataset has not been refreshed recently',
      metric: customMetric('DatasetAgeHours'),
      threshold: 24 * 8,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    datasetAgeAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(
        scope.node.findChild('RecommendationLambda').node.findChild('AlarmTopic') as sns.Topic,
      ),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Throttles',
        left: [fn.metricThrottles({ period: Duration.minutes(5) })],
        width: 8,
      }) as cloudwatch.IWidget,
      new cloudwatch.AlarmWidget({
        title: 'Error Alarm',
        alarm: scope.node
          .findChild('RecommendationLambda')
          .node.findChild('ErrorAlarm') as cloudwatch.Alarm,
        width: 8,
      }) as cloudwatch.IWidget,
    );
  }
}
