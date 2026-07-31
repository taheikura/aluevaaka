import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config.js';
import type { Storage } from './storage.js';
import type { RecommendationLambda } from './recommendation-lambda.js';
import type { FrontendDistribution } from './frontend-distribution.js';

export interface CiIdentityProps {
  config: EnvConfig;
  storage: Storage;
  lambda: RecommendationLambda;
  distribution: FrontendDistribution;
  /** GitHub repo in the form "owner/repo" */
  githubRepo: string;
}

/**
 * OIDC-based IAM role for GitHub Actions.
 *
 * Using OIDC means no long-lived AWS credentials are stored in GitHub Secrets —
 * GitHub exchanges a short-lived OIDC token for temporary AWS credentials per run.
 *
 * The role is scoped to the specific repo and can be further scoped to a branch
 * (e.g. only the `main` branch can deploy to production).
 */
export class CiIdentity extends Construct {
  public readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: CiIdentityProps) {
    super(scope, id);

    const { config, storage, lambda, distribution, githubRepo } = props;
    const { envName } = config;

    // OIDC provider for GitHub Actions (one per account — reuse if it already exists)
    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOidcProvider',
      `arn:aws:iam::${cdk.Aws.ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com`,
    );

    // Trust policy: only allow this specific repo (and optionally specific branches)
    const trustCondition =
      envName === 'production'
        ? // Production: only main branch
          `repo:${githubRepo}:ref:refs/heads/main`
        : // Development: any branch
          `repo:${githubRepo}:*`;

    this.deployRole = new iam.Role(this, 'DeployRole', {
      roleName: `aluevaaka-github-deploy-${envName}`,
      description: `GitHub Actions deploy role for aluevaaka ${envName}`,
      assumedBy: new iam.WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': trustCondition,
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Allow CI to upload frontend assets to web bucket
    storage.grantWebDeploy(this.deployRole);

    // Allow CI to upload generated datasets to data bucket
    storage.grantDataWrite(this.deployRole);

    // Allow CI to update the Lambda function code only
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:UpdateFunctionCode', 'lambda:GetFunctionConfiguration'],
        resources: [lambda.fn.functionArn],
      }),
    );

    // Allow CI to create CloudFront invalidations
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
        resources: [
          `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distribution.distribution.distributionId}`,
        ],
      }),
    );

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: this.deployRole.roleArn,
      exportName: `aluevaaka-${envName}-deploy-role-arn`,
      description: 'IAM role ARN to configure in GitHub Actions OIDC settings',
    });
  }
}
