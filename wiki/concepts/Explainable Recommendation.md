---
title: "Explainable Recommendation"
type: concept
aliases:
  - "Transparent recommendation"
tags:
  - topic/location-intelligence
  - type/product-principle
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/DESIGN.md]]"
  - "[[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]]"
confidence: high
status: mature
---

An explainable recommendation is a ranked result that shows how user preferences, constraints, data quality, and trade-offs led to the outcome. In Aluevaaka, explanations are verified outputs of the scoring engine rather than prose invented by a language model.

## Key Points

- Shows category scores and the strongest positive and negative contributors.
- Distinguishes soft preferences from hard exclusions.
- Exposes data completeness, freshness, provenance, and limitations.

## Details

### Definition & Scope

The recommendation is a match against the user’s selected preferences, not an objective statement that one area is universally better. The interface should make this distinction explicit.

### How It Works

The backend returns intermediate scoring information, applied constraints, missing or stale data, dataset version, and source metadata. The frontend uses these verified fields to render explanations, maps, lists, and comparisons.

### When It Applies

This approach is especially useful for relocation decisions where users need to understand competing factors such as affordability, transport, nature, services, and economic outlook. It is limited by the quality and geographic coverage of the underlying data.

### Explaining travel-time indicators

If Aluevaaka adopts indicators derived from the [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]], explanations should state the transport mode, time period, calculation vintage, destination definition, and area-aggregation method. Coverage and model assumptions should be shown alongside the result; modelled 2023 travel times are not live routing.

## Connections

- [[Deterministic Weighted Scoring]] — supplies auditable contributions to the result.
- [[Data Provenance and Quality]] — qualifies how much confidence users should place in a result.
- [[Aluevaaka]] — applies the concept to relocation recommendations.
- [[Travel-Time Accessibility]] — defines the assumptions behind possible travel-time metrics.

## Open Questions

- How should confidence be displayed without creating a second misleading score?
- Which explanations are most useful in user testing?

## Sources

- [[raw/DESIGN.md]] — requires score breakdowns, trade-offs, source metadata, and limitations.
- [[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]] — documents the matrix's modelled date, mode/time variants, and methodology.
