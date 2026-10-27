---
title: "AWS Lambda"
type: entity
aliases:
  - "Lambda"
  - "Recommendation Lambda"
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

AWS Lambda is the managed compute service selected for Aluevaaka’s dynamic recommendation backend. The MVP exposes a Lambda Function URL for health checks and recommendation requests, avoiding a separate API Gateway while the API surface remains small.

## Key Points

- Handles `GET /health` and `POST /recommendations`.
- Loads generated datasets from Amazon S3 and can use a warm-cache entry.
- Emits structured logs and metrics to Amazon CloudWatch.

## Details

### Role in Aluevaaka

Lambda validates requests, applies hard constraints, calculates deterministic weighted scores, and returns ranked areas with explanations and metadata. The health endpoint verifies that the current dataset can actually be located and read.

### Operational boundaries

The function should use least-privilege permissions, strict CORS, request and result-size limits, safe error responses, and no sensitive preference data in logs. It should not be placed in a VPC for the MVP because outbound access through a NAT Gateway could add substantial idle cost.

## Connections

- [[Serverless AWS Architecture]] — is the runtime component of the deployment model.
- [[Amazon S3]] — provides generated datasets to the function.
- [[Explainable Recommendation]] — is the function’s primary product output.

## Open Questions

- When will routing, throttling, or authentication needs justify API Gateway?

## Sources

- [[raw/DESIGN.md]] — specifies the Function URL contract, runtime responsibilities, security, and cost constraints.
