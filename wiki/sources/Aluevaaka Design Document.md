---
title: "Aluevaaka Design Document"
type: source
aliases:
  - "Aluevaaka MVP Design"
tags:
  - topic/location-intelligence
  - type/report
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/DESIGN.md]]"
confidence: high
status: mature
source_author: "Aluevaaka project"
source_date: "2026-07-30"
source_url: ""
---

**Aluevaaka Design Document** is the proposed MVP architecture and product design for an explainable relocation recommendation platform in Finland. It defines the product scope, scoring model, AWS serverless architecture, data lifecycle, operational controls, delivery phases, and future commercial direction.

## Key Takeaways

- The MVP recommends neighbourhoods or statistical areas in Helsinki, Espoo, Vantaa, and Kauniainen rather than attempting to cover all Finnish municipalities.
- Recommendations are deterministic and explainable: soft preferences influence weighted ranking, while hard constraints exclude unsuitable areas.
- The low-cost architecture uses a static React/Vite frontend on S3 and CloudFront, one Lambda Function URL, generated datasets in S3, CloudWatch, and GitHub Actions.
- Data provenance, freshness, completeness, licensing, schema validation, and rollback to the last validated dataset are product and engineering requirements.
- The design defers machine learning, accounts, persistent databases, real-time ingestion, payments, API Gateway, and continuously running infrastructure until demand is validated.
- Results must expose category scores, strengths, trade-offs, constraints, data completeness, dataset version, and source metadata instead of presenting a score as objective truth.

## Detailed Notes

### Product scope and user flow

A user selects preference weights and optional hard constraints. The browser sends a validated request to a Lambda Function URL, which loads the current generated dataset from S3, scores areas, and returns ranked results. The frontend presents a map, ranked list, comparison view, explanations, and freshness information.

The recommendation unit is a defined neighbourhood or statistical area with a stable identifier, parent city, coordinates or polygon, source, publication date, and area classification. When neighbourhood-level data is unavailable, the limitation must be shown rather than silently substituting municipality-level data.

### Architecture and operations

The frontend is a static React/Vite/TypeScript application delivered through S3 and CloudFront. The backend exposes `GET /health` and `POST /recommendations` through one Lambda Function URL. S3 stores frontend assets, generated datasets, and metadata. CloudWatch provides structured logs, metrics, alarms, and retention controls. GitHub Actions performs deployment and active smoke tests.

### Data lifecycle and quality

Batch workflows download selected open datasets, validate and normalize records, calculate derived indicators, produce versioned JSON and metadata, and upload only validated output. If a refresh fails, the last validated dataset remains available. Dataset metadata records source URLs, licenses, timestamps, publication dates, transformation versions, join identifiers, missing values, and limitations.

### Recommendation engine and API

The weighted score is represented as $Score(m) = \\sum_i w_i \\cdot normalizedMetric_i(m)$. Hard constraints are applied before ranking. Missing data must not silently become favourable; responses identify incomplete data and may include confidence metadata. The API uses shared schemas and safe error responses for malformed requests, unavailable datasets, and internal failures.

### Security, cost, and delivery

The MVP avoids storing personal preferences, secrets in frontend assets, broad IAM permissions, public S3 writes, sensitive logs, and unnecessary VPC networking. It also avoids EC2, ECS, RDS/Aurora, NAT Gateway, Kubernetes, and always-on ingestion workers. CI checks formatting, linting, compilation, tests, API contracts, data validation, infrastructure, dependencies, and security. The phased plan moves from foundation to recommendation MVP, AWS deployment, operational quality, and product validation.

## Entities & Concepts Referenced

- [[Aluevaaka]] — the project and product defined by the design.
- [[Serverless AWS Architecture]] — the deployment pattern for the MVP.
- [[Explainable Recommendation]] — the product principle behind transparent results.
- [[Deterministic Weighted Scoring]] — the initial recommendation method.
- [[Data Provenance and Quality]] — the requirements for trustworthy generated datasets.
- [[AWS Lambda]] — the dynamic backend runtime exposed through a Function URL.
- [[Amazon S3]] — storage for frontend assets and generated datasets.
- [[Amazon CloudFront]] — delivery layer for the static frontend.

## Quotes & Data Points

- “The MVP focuses on relocation within the Helsinki metropolitan area.” — Summary
- “The initial engine should be deterministic and explainable. Machine learning is not required for the MVP.” — Section 8
- The initial endpoint consists of `GET /health` and `POST /recommendations` — Section 5.2 and Section 9.
- The MVP targets four cities: Helsinki, Espoo, Vantaa, and Kauniainen.
- Acceptance requires no always-on compute or database and includes CloudWatch logs, alarms, budget alerts, IaC, and smoke tests.

## Open Questions

- Which open datasets provide sufficiently current, licensed, neighbourhood-level coverage for each category?
- What normalization method and confidence treatment best preserve comparability as coverage changes?
- When validated demand justifies API Gateway, authentication, persistence, or commercial reporting?
