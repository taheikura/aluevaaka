---
title: "Amazon CloudFront"
type: entity
aliases:
  - "CloudFront"
tags:
  - topic/location-intelligence
  - org/aws
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/DESIGN.md]]"
confidence: high
status: draft
---

Amazon CloudFront is the content-delivery layer proposed for Aluevaaka’s static web frontend. It serves the React/Vite assets stored in Amazon S3 and supports a low-cost, scalable public demo.

## Key Points

- Delivers static frontend assets from S3.
- Can invalidate cached assets after deployment when required.
- Forms part of the intended origin configuration rather than a public-write workflow.

## Details

CloudFront is used for the frontend while the browser calls the recommendation Lambda Function URL for dynamic results. The deployment workflow provisions and validates the distribution through infrastructure as code and smoke tests.

## Connections

- [[Serverless AWS Architecture]] — is the frontend delivery component.
- [[Amazon S3]] — provides the origin assets.
- [[Aluevaaka]] — delivers the product’s static interface.

## Open Questions

- What caching and invalidation policy best balances freshness and deployment cost?

## Sources

- [[raw/DESIGN.md]] — specifies CloudFront and S3 as the static frontend delivery path.
