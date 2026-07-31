#!/usr/bin/env node
/**
 * CDK App entry point.
 *
 * Environment configuration is loaded from:
 *   --context env=<development|production>   (required)
 *   --context alertEmail=<email>             (required)
 *   --context githubRepo=<owner/repo>        (required)
 *
 * Example:
 *   cdk deploy \
 *     --context env=production \
 *     --context alertEmail=you@example.com \
 *     --context githubRepo=yourname/aluevaaka
 */
import * as cdk from 'aws-cdk-lib';
import { AluevaakaStack } from '../stacks/aluevaaka-stack.js';
import { getEnvConfig } from '../config.js';

const app = new cdk.App();

const envName = app.node.tryGetContext('env') as string | undefined;
const alertEmail = app.node.tryGetContext('alertEmail') as string | undefined;
const githubRepo = app.node.tryGetContext('githubRepo') as string | undefined;

if (!envName) {
  throw new Error('Pass --context env=<development|production>');
}
if (!alertEmail) {
  throw new Error('Pass --context alertEmail=<your@email.com>');
}
if (!githubRepo) {
  throw new Error('Pass --context githubRepo=<owner/repo>');
}

const config = getEnvConfig(envName, alertEmail);

new AluevaakaStack(app, `Aluevaaka-${capitalize(envName)}`, {
  config,
  githubRepo,
  description: `Aluevaaka municipality recommendation platform (${envName})`,
});

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
