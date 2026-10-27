---
title: "Travel-Time Accessibility"
type: concept
aliases:
  - "Travel time accessibility"
  - "Modeled travel-time access"
tags:
  - topic/location-intelligence
  - type/transport
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]]"
confidence: medium
status: draft
---

Travel-time accessibility describes how long it takes to reach destinations from a place using a specified travel mode and set of assumptions. For Aluevaaka, the Helsinki Region Travel Time Matrix 2023 is a potential input for deriving such indicators, but its grid-level route times must first be mapped to the project's area geography and validated.

## Key Points

- Travel time is mode-, time-of-day-, and assumption-dependent; these dimensions should not be collapsed without an explicit decision.
- The 2023 matrix covers 250 m grid centroids in Helsinki, Espoo, Kauniainen, and Vantaa, not Aluevaaka's current recommendation areas directly.
- Accessibility indicators depend on which destinations count, how cell-level results are aggregated, and how missing coverage is treated.
- The matrix is modelled data from a dated snapshot, not live routing or a complete measure of service quality.

## Details

### From route matrix to indicator

A route matrix gives travel costs between origins and destinations. To turn it into an area-level recommendation metric, Aluevaaka would need to select destination types (for example, healthcare or transit), define mode and time-period assumptions, and derive a transparent statistic such as travel time to a selected destination or the share of relevant destinations reachable within a threshold. The source does not prescribe which statistic is appropriate for the product.

### Integration with Aluevaaka

The current data model includes area-level distances and service counts, optional H3 identifiers, and provenance metadata, but it does not define travel-time fields or matrix cell identifiers. The matrix's `from_id` and `to_id` values therefore need a validated spatial mapping or aggregation before they can become recommendation metrics. A migration should keep raw source data and transformation steps separate from the generated dataset, retain publication and calculation dates, and report metric coverage.

### Limitations

Modelled travel times depend on the source's network, schedules, time windows, speed assumptions, and methodology. The 2023 values should not be presented as current live conditions. The source also notes methodological differences from older matrix releases, which limits naïve trend comparisons.

## Connections

- [[Aluevaaka]] — could use validated area-level indicators in relocation recommendations.
- [[Deterministic Weighted Scoring]] — defines how any adopted indicators would contribute to a ranking.
- [[Explainable Recommendation]] — requires mode, time period, coverage, and limitations to be visible.
- [[Data Provenance and Quality]] — records the dataset and validates spatial joins and completeness.
- [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]] — describes the candidate route dataset.

## Open Questions

- Which destination sets and travel-time thresholds represent useful user-facing measures?
- Which modes and periods should be exposed as preferences or defaults?
- What spatial aggregation method best matches Aluevaaka's target area units?
- How often can the source be refreshed, and under what license?

## Sources

- [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]] — grid-based route times and calculation assumptions.
