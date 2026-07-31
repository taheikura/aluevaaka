import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config.js';

export interface StorageProps {
  config: EnvConfig;
}

/**
 * Two S3 buckets:
 *   - webBucket: serves static frontend assets (accessed via CloudFront OAC)
 *   - dataBucket: stores generated municipality datasets (accessed by Lambda)
 *
 * Both have Block Public Access enabled. The web bucket is NOT a public bucket —
 * CloudFront uses an Origin Access Control to fetch assets.
 */
export class Storage extends Construct {
  public readonly webBucket: s3.Bucket;
  public readonly dataBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageProps) {
    super(scope, id);

    const { envName } = props.config;

    this.webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `aluevaaka-web-${envName}-${cdk.Aws.ACCOUNT_ID}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      // Deployment replaces files — lifecycle rules keep costs near zero
      lifecycleRules: [
        {
          id: 'expire-old-assets',
          noncurrentVersionExpiration: cdk.Duration.days(7),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
      removalPolicy:
        envName === 'development' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: envName === 'development',
    });

    this.dataBucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: `aluevaaka-data-${envName}-${cdk.Aws.ACCOUNT_ID}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          id: 'expire-old-dataset-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
      removalPolicy:
        envName === 'development' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: envName === 'development',
    });

    // Output bucket names for use in CI/CD pipelines
    new cdk.CfnOutput(this, 'WebBucketName', {
      value: this.webBucket.bucketName,
      exportName: `aluevaaka-${envName}-web-bucket`,
    });
    new cdk.CfnOutput(this, 'DataBucketName', {
      value: this.dataBucket.bucketName,
      exportName: `aluevaaka-${envName}-data-bucket`,
    });
  }

  /**
   * Grant a principal read-only access to dataset files.
   * Called by the Lambda construct to wire up IAM without coupling the constructs.
   */
  grantDataRead(grantee: iam.IGrantable): iam.Grant {
    return this.dataBucket.grantRead(grantee);
  }

  /**
   * Grant a principal write access to the web bucket.
   * Called by the CI/CD identity construct.
   */
  grantWebDeploy(grantee: iam.IGrantable): iam.Grant {
    return this.webBucket.grantReadWrite(grantee);
  }

  /**
   * Grant a principal write access to the data bucket.
   * Called by the CI/CD identity construct.
   */
  grantDataWrite(grantee: iam.IGrantable): iam.Grant {
    return this.dataBucket.grantReadWrite(grantee);
  }
}
