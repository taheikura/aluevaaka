import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config.js';

export interface FrontendDistributionProps {
  config: EnvConfig;
  webBucket: s3.IBucket;
}

/**
 * CloudFront distribution in front of the S3 web bucket.
 *
 * Uses Origin Access Control (OAC) — the modern replacement for OAI.
 * The S3 bucket policy is updated automatically by CDK to allow
 * CloudFront to read objects.
 */
export class FrontendDistribution extends Construct {
  public readonly distribution: cloudfront.Distribution;
  /** The CloudFront domain name — use this as the CORS allowed origin */
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: FrontendDistributionProps) {
    super(scope, id);

    const { config, webBucket } = props;
    const { envName } = config;

    // Cache policy: aggressive caching for hashed assets, no-cache for index.html
    const assetCachePolicy = new cloudfront.CachePolicy(this, 'AssetCachePolicy', {
      cachePolicyName: `aluevaaka-${envName}-assets`,
      comment: 'Long TTL for content-addressed assets',
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.days(1),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const htmlCachePolicy = new cloudfront.CachePolicy(this, 'HtmlCachePolicy', {
      cachePolicyName: `aluevaaka-${envName}-html`,
      comment: 'No-cache for HTML entry points so deploys take effect immediately',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(60),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(webBucket);

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `Aluevaaka web frontend (${envName})`,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultRootObject: 'index.html',

      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: htmlCachePolicy,
        compress: true,
      },

      additionalBehaviors: {
        // Vite produces hashed filenames like /assets/index-Bx3kZ7.js
        '/assets/*': {
          origin: s3Origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: assetCachePolicy,
          compress: true,
        },
      },

      // SPA fallback: return index.html for unknown paths (React Router handles routing)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    this.domainName = `https://${this.distribution.distributionDomainName}`;

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: this.domainName,
      exportName: `aluevaaka-${envName}-frontend-url`,
      description: 'CloudFront URL for the web frontend',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      exportName: `aluevaaka-${envName}-distribution-id`,
      description: 'CloudFront distribution ID — needed for cache invalidation on deploy',
    });
  }
}
