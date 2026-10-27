---
title: "Deterministic Weighted Scoring"
type: concept
aliases:
  - "Weighted recommendation scoring"
tags:
  - topic/location-intelligence
  - type/method
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/DESIGN.md]]"
  - "[[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]]"
confidence: high
status: mature
---

Deterministic weighted scoring ranks alternatives by combining normalized metrics with user-supplied weights through a reproducible formula. Aluevaaka uses this method for its initial recommendation engine instead of machine learning.

## Key Points

- Computes a score such as $Score(m) = \\sum_i w_i \\cdot normalizedMetric_i(m)$.
- Applies hard constraints before ranking, so excluded areas do not merely receive lower scores.
- Requires documented normalization and explicit treatment of missing data.

## Details

### Definition & Scope

Each area receives normalized category metrics. The user’s weights determine the relative influence of those metrics, while constraints such as maximum housing cost or distance to healthcare remove ineligible areas.

### How It Works

The engine validates the request, filters by hard constraints, calculates weighted scores, identifies positive and negative contributors, and returns ranked areas with category-level results. A later confidence adjustment may be considered after data coverage is measured.

### When It Applies

The method fits an MVP that values explainability, testing, and stable behaviour. It may be insufficient for complex preference interactions or changing objectives, which can motivate later experimentation with more advanced models.

### Potential travel-time metrics

The [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]] could provide inputs to a transport-accessibility metric, but only after its cell-level data is aggregated to Aluevaaka areas and the metric's mode, time period, destination set, and missing-data treatment are defined. A raw travel-time value should not be mixed into the score until its direction and normalization are explicit and comparable across the areas being ranked.

## Connections

- [[Explainable Recommendation]] — makes the calculation understandable to users.
- [[Data Provenance and Quality]] — determines whether metrics are trustworthy and comparable.
- [[Aluevaaka]] — uses the method for relocation ranking.
- [[Travel-Time Accessibility]] — describes a possible derived input and its assumptions.

## Open Questions

- Which normalization method remains stable across refreshes and area coverage changes?
- Should confidence affect ranking or only be shown as metadata?

## Sources

- [[raw/DESIGN.md]] — defines the formula, constraint ordering, normalization, and missing-data rules.
- [[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]] — provides candidate modelled travel-time data, not a ready-to-score Aluevaaka metric.
