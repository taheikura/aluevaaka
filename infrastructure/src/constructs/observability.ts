import { Duration } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
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
    const { envName, budgetAlertUsd, alertEmail } = config;
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

    // ---------------------------------------------------------------------------
    // AWS Budgets
    // ---------------------------------------------------------------------------

    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: `aluevaaka-${envName}-monthly`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: budgetAlertUsd,
          unit: 'USD',
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail }],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: alertEmail }],
        },
      ],
    });
  }
}
