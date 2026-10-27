---
title: "Aluevaaka"
type: entity
aliases:
  - "Aluevaaka platform"
tags:
  - topic/location-intelligence
  - type/product
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/DESIGN.md]]"
  - "[[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]]"
confidence: high
status: mature
---

Aluevaaka is a proposed Finnish location-intelligence product that gives explainable relocation recommendations for neighbourhoods and statistical areas. Its MVP focuses on Helsinki, Espoo, Vantaa, and Kauniainen and combines open data with user preferences.

## Key Points

- Targets relocation, living, work, and future business-location decisions.
- Returns ranked areas with category scores, strengths, trade-offs, freshness, and provenance.
- Uses a deliberately small, low-cost AWS serverless architecture.
- Could derive transport-accessibility indicators from a travel-time matrix after spatial aggregation and validation against Aluevaaka's area geography.

## Details

### MVP boundary

The product begins with four Helsinki metropolitan-area cities and defined neighbourhood or statistical-area identifiers. It does not attempt to rank every Finnish municipality or infer neighbourhood names from arbitrary coordinates.

### Product direction

Later possibilities include premium relocation reports, municipality subscriptions, embeddable widgets, relocation partnerships, business location intelligence, and a commercial API. These depend on validated demand and data licensing.

### Travel-time data migration

The [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]] is a candidate source for transport indicators, but its 250 m grid-cell IDs do not directly match Aluevaaka's municipality/postal-area records or optional H3 cells. The current model includes proximity and service metrics but no route-time matrix field. Integration therefore requires an explicit spatial mapping or aggregation and new metric/provenance handling; the 2023 modelled snapshot should not be presented as live routing or a complete accessibility measure.

## Connections

- [[Explainable Recommendation]] — defines how Aluevaaka communicates results.
- [[Deterministic Weighted Scoring]] — provides the initial ranking method.
- [[Serverless AWS Architecture]] — supports the low-cost deployment model.
- [[Travel-Time Accessibility]] — describes a possible transport metric and the migration considerations.

## Open Questions

- Which initial data sources deliver reliable neighbourhood-level coverage?
- Which user segments should be prioritized after the portfolio MVP?
- Which area geography and aggregation method should be used to migrate grid-level travel times into recommendation metrics?

## Sources

- [[raw/DESIGN.md]] — defines the product scope, architecture, roadmap, and acceptance criteria.
- [[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]] — documents a potential transport-data source and its grid-level coverage and assumptions.
