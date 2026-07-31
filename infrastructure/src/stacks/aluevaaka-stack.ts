import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config.js';
import { Storage } from '../constructs/storage.js';
import { RecommendationLambda } from '../constructs/recommendation-lambda.js';
import { FrontendDistribution } from '../constructs/frontend-distribution.js';
import { CiIdentity } from '../constructs/ci-identity.js';
import { Observability } from '../constructs/observability.js';

export interface AluevaakaStackProps extends cdk.StackProps {
  config: EnvConfig;
  /** GitHub repo "owner/repo" for OIDC trust */
  githubRepo: string;
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
        account: props.config.account ?? process.env['CDK_DEFAULT_ACCOUNT'],
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
      webBucket: storage.webBucket,
    });

    // 3. Lambda + Function URL (depends on data bucket; needs CF domain for CORS)
    const lambda = new RecommendationLambda(this, 'RecommendationLambda', {
      config: props.config,
      storage,
      frontendOrigin: distribution.domainName,
    });

    // 4. CI/CD IAM identity (depends on all three above)
    new CiIdentity(this, 'CiIdentity', {
      config: props.config,
      storage,
      lambda,
      distribution,
      githubRepo: props.githubRepo,
    });

    // 5. Dashboard + budget alarms
    new Observability(this, 'Observability', {
      config: props.config,
      lambda,
    });
  }
}
