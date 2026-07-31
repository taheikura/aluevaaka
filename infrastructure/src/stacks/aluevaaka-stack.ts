import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config.js';
import { Storage } from '../constructs/storage.js';
import { RecommendationLambda } from '../constructs/recommendation-lambda.js';
import { FrontendDistribution } from '../constructs/frontend-distribution.js';
import { Observability } from '../constructs/observability.js';

export interface AluevaakaStackProps extends cdk.StackProps {
  config: EnvConfig;
}

/**
 * The single top-level CloudFormation stack.
 *
 * Composition order matters: constructs that depend on outputs of others
 * (e.g. Lambda needs the data bucket name) are created after their dependencies.
 *
 * To migrate from Lambda Function URL to API Gateway:
 *   1. Replace RecommendationLambda.functionUrl with an HttpApi construct here.
 *   2. Pass the API Gateway endpoint as `frontendOrigin` → update CORS.
 *   3. Everything else (Lambda code, storage, observability, CI) stays the same.
 */
export class AluevaakaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AluevaakaStackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props.config.account ?? process.env['CDK_DEFAULT_ACCOUNT'] ?? '*',
        region: props.config.region,
      },
    });

    cdk.Tags.of(this).add('Project', 'aluevaaka');
    cdk.Tags.of(this).add('Environment', props.config.envName);
    cdk.Tags.of(this).add('ManagedBy', 'cdk');

    // 1. Storage (no dependencies)
    const storage = new Storage(this, 'Storage', { config: props.config });

    // 2. CloudFront distribution (depends on web bucket)
    const distribution = new FrontendDistribution(this, 'Frontend', {
      config: props.config,
      webBucket: storage.webBucket as s3.IBucket,
    });

    // 3. Lambda + Function URL (depends on data bucket; needs CF domain for CORS)
    const lambda = new RecommendationLambda(this, 'RecommendationLambda', {
      config: props.config,
      storage,
      frontendOrigin: distribution.domainName,
    });

    // CI/CD identity is managed by the AWS Organization repository. The
    // deployment workflow assumes that existing target-account role through
    // the management-account GitHub OIDC role.

    // 4. Dashboard + budget alarms
    new Observability(this, 'Observability', {
      config: props.config,
      lambda,
    });
  }
}
