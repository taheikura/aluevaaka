---
title: "Data Provenance and Quality"
type: concept
aliases:
  - "Dataset provenance"
  - "Data-quality monitoring"
tags:
  - topic/location-intelligence
  - type/data-engineering
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/DESIGN.md]]"
  - "[[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]]"
confidence: high
status: mature
---

Data provenance and quality are the practices of recording where data came from, how it was transformed, how current and complete it is, and whether it passes validation. In Aluevaaka, these practices are necessary to prevent an apparently precise recommendation from hiding stale, incomplete, or improperly licensed source data.

## Key Points

- Records source URLs, licenses, timestamps, publication dates, transformation versions, and geographic join identifiers.
- Validates schemas, identifiers, coordinates, ranges, duplicates, record counts, and completeness.
- Preserves the last validated dataset when a refresh fails.

## Details

### Definition & Scope

Provenance covers the trace from open source records through normalization and derived indicators to the generated dataset used by Lambda. Quality includes structural validity, coverage, freshness, and known limitations.

### How It Works

A batch workflow downloads sources, validates and normalizes them, calculates indicators, writes metadata and a manifest, and publishes only valid output to S3. The pipeline emits record counts, missing-value counts, and source status. The UI exposes relevant provenance to users.

### When It Applies

These controls apply to every recommendation category and every data refresh. They are particularly important when neighbourhood-level data is missing or when external sources change format or become unavailable.

### Applying the controls to travel-time data

The [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]] is a dated, modelled grid dataset with mode, time-period, and speed assumptions. Before using it in Aluevaaka, record the source and license, calculation date, method/version, and transformations; validate grid IDs and geometry joins; and measure coverage after aggregating to the product's area geography. Keep missing or partial coverage visible so derived travel-time metrics do not imply more certainty than the input supports.

## Connections

- [[Deterministic Weighted Scoring]] — supplies the metrics used in the ranking.
- [[Explainable Recommendation]] — surfaces freshness, completeness, and limitations.
- [[Serverless AWS Architecture]] — stores generated datasets and metadata in S3.
- [[Travel-Time Accessibility]] — applies provenance and coverage checks to a candidate transport indicator.

## Open Questions

- What thresholds should trigger a visible warning versus a failed publication?
- How should source licensing restrictions affect caching and redistribution?

## Sources

- [[raw/DESIGN.md]] — specifies the data lifecycle, metadata, validation checks, and rollback behaviour.
- [[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]] — describes the matrix's date, grid, transport modes, and methodology caveats.
