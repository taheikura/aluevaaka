---
title: "Serverless AWS Architecture"
type: concept
aliases:
  - "Low-cost AWS serverless deployment"
tags:
  - topic/location-intelligence
  - type/architecture
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/DESIGN.md]]"
confidence: high
status: mature
---

Serverless AWS architecture is a deployment model that uses managed, on-demand services instead of continuously running servers. Aluevaaka’s MVP uses S3 and CloudFront for static delivery, Lambda Function URLs for dynamic requests, S3 for generated datasets, CloudWatch for observability, and GitHub Actions for delivery.

## Key Points

- Minimizes idle operating cost and solo-operator maintenance.
- Keeps the runtime simple: one public function with `/health` and `/recommendations`.
- Avoids a database, VPC, NAT Gateway, and continuously running workers during MVP validation.

## Details

### Definition & Scope

The architecture is optimized for a read-heavy, batch-data recommendation application rather than a general-purpose API platform. Infrastructure is provisioned reproducibly with infrastructure as code.

### How It Works

CloudFront serves a static React/Vite frontend from S3. The browser calls a Lambda Function URL. Lambda reads the current generated dataset from S3 and logs structured events to CloudWatch. GitHub Actions builds, deploys, uploads data, and runs smoke tests.

### When It Applies

This approach fits an early public demo with intermittent traffic and few dynamic operations. API Gateway, authentication, persistence, scheduled ingestion, and additional services become appropriate when usage, routing, security, or commercial requirements justify their complexity.

## Connections

- [[Aluevaaka]] — is the product designed around this architecture.
- [[Data Provenance and Quality]] — relies on generated, versioned S3 datasets.
- [[Explainable Recommendation]] — is exposed through the Lambda recommendation endpoint.

## Open Questions

- At what traffic or operational threshold should API Gateway replace the Function URL?
- Which AWS IaC tool should be the long-term standard for the project?

## Sources

- [[raw/DESIGN.md]] — defines the AWS services, cost strategy, observability, CI/CD, and deferred complexity.
