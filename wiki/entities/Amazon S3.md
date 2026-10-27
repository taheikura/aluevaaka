---
title: "Amazon S3"
type: entity
aliases:
  - "S3"
  - "Amazon Simple Storage Service"
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

Amazon S3 is the object storage service used by Aluevaaka for static frontend assets, generated datasets, metadata, optional raw archives, deployment metadata, and future reports.

## Key Points

- Stores versioned generated datasets consumed by Lambda.
- Hosts frontend assets behind Amazon CloudFront.
- Requires blocked public writes and least-privilege deployment access.

## Details

### Data and deployment roles

S3 separates the static frontend bucket from the data bucket conceptually, while CI/CD uploads assets and validated datasets. The last validated dataset must remain available if a source refresh fails.

### Security considerations

S3 Block Public Access should be enabled wherever possible. The frontend bucket is not a public write location, and restricted source data must not be redistributed against its license.

## Connections

- [[Serverless AWS Architecture]] — is the main storage layer in the MVP.
- [[Data Provenance and Quality]] — stores manifests and metadata describing data quality.
- [[AWS Lambda]] — reads the current recommendation dataset.

## Open Questions

- What bucket and object versioning policy best supports rollback and cost control?

## Sources

- [[raw/DESIGN.md]] — defines S3 storage uses, deployment controls, and dataset publication behaviour.
