import * as path from 'node:path';
import * as url from 'node:url';
import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config.js';
import type { Storage } from './storage.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export interface RecommendationLambdaProps {
  config: EnvConfig;
  storage: Storage;
  /** CloudFront distribution domain for the CORS allowed origin */
  frontendOrigin: string;
}

/**
 * The recommendation Lambda and its Function URL.
 *
 * The Function URL is the public API endpoint for the MVP.
 * To migrate to API Gateway: remove `functionUrl` and add an
 * HttpApi or RestApi construct — the Lambda handler code stays unchanged.
 */
export class RecommendationLambda extends Construct {
  public readonly fn: lambda.Function;
  public readonly functionUrl: lambda.FunctionUrl;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: RecommendationLambdaProps) {
    super(scope, id);

    const { config, storage, frontendOrigin } = props;
    const { envName, lambdaMemoryMb, lambdaTimeoutSecs, logRetentionDays, alertEmail } = config;

    // SNS topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `aluevaaka-${envName}-alarms`,
    });
    this.alarmTopic.addSubscription(new subscriptions.EmailSubscription(alertEmail));

    // Log group with explicit retention — avoids unbounded CloudWatch costs
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/aluevaaka-recommendation-${envName}`,
      retention: logRetentionDays,
      removalPolicy:
        envName === 'development' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    // Lambda function — ESM bundle produced by esbuild in services/recommendation
    this.fn = new lambda.Function(this, 'Function', {
      functionName: `aluevaaka-recommendation-${envName}`,
      description: 'Aluevaaka municipality recommendation engine',
      // The bundle is built by `pnpm build` in services/recommendation
      // and output to services/recommendation/bundle/
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, '../../../services/recommendation/bundle'),
      ),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64, // Graviton2 — ~20% cheaper than x86
      memorySize: lambdaMemoryMb,
      timeout: cdk.Duration.seconds(lambdaTimeoutSecs),
      logGroup,
      environment: {
        DATA_BUCKET: storage.dataBucket.bucketName,
        DATA_PREFIX: config.dataPrefix,
        ALLOWED_ORIGINS: frontendOrigin,
        SERVICE_VERSION: process.env.SERVICE_VERSION ?? 'local',
        ENVIRONMENT: envName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      // No VPC — avoids NAT Gateway cost per the design document
    });

    // Grant Lambda read access to the data bucket
    storage.grantDataRead(this.fn);
    this.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: { StringEquals: { 'cloudwatch:namespace': 'Aluevaaka/Recommendation' } },
      }),
    );

    // Lambda Function URL — public, no auth (recommendations are not sensitive)
    this.functionUrl = this.fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: [frontendOrigin, 'http://localhost:5173'],
        allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
        allowedHeaders: ['content-type'],
        maxAge: cdk.Duration.hours(24),
      },
    });

    // ---------------------------------------------------------------------------
    // CloudWatch alarms
    // ---------------------------------------------------------------------------

    const errorAlarm = new cloudwatch.Alarm(this, 'ErrorAlarm', {
      alarmName: `aluevaaka-${envName}-lambda-errors`,
      alarmDescription: 'Lambda error rate is elevated',
      metric: this.fn.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    errorAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    const throttleAlarm = new cloudwatch.Alarm(this, 'ThrottleAlarm', {
      alarmName: `aluevaaka-${envName}-lambda-throttles`,
      alarmDescription: 'Lambda throttles detected',
      metric: this.fn.metricThrottles({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 3,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    throttleAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    const p95DurationAlarm = new cloudwatch.Alarm(this, 'DurationAlarm', {
      alarmName: `aluevaaka-${envName}-lambda-p95-duration`,
      alarmDescription: 'Lambda p95 duration approaching timeout',
      metric: this.fn.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      // Alarm at 80% of timeout
      threshold: lambdaTimeoutSecs * 1000 * 0.8,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    p95DurationAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Outputs
    new cdk.CfnOutput(this, 'FunctionUrl', {
      value: this.functionUrl.url,
      exportName: `aluevaaka-${envName}-function-url`,
      description: 'Lambda Function URL — use as VITE_API_URL in frontend builds',
    });
  }
}
