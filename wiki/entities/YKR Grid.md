---
title: "YKR Grid"
type: entity
aliases:
  - "Yhdyskuntarakenteen seurantajärjestelmän ruutuaineisto"
tags:
  - topic/location-intelligence
  - type/geospatial-data
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]]"
confidence: medium
status: stub
---

The YKR grid is the Finnish grid system whose geometric properties and enumeration are used by the Helsinki Region Travel Time Matrix 2023, according to the source page. That matrix uses 250 × 250 m cells and associates route records with grid-cell identifiers.

## Key Points

- The source describes its 250 m grid as following the YKR grid's geometry and enumeration.
- Grid geometries and cell IDs are needed to spatially relate route results to other area datasets.
- Aluevaaka cannot assume YKR cell IDs match its municipality, postal-area, or H3 identifiers.

## Details

For Aluevaaka integration, the grid is a spatial reference for source route data, not a direct replacement for the project's recommendation areas. Any conversion to supported areas requires an explicit, validated spatial join or aggregation.

## Connections

- [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]] — uses a 250 m grid for its origin and destination cells.
- [[Travel-Time Accessibility]] — explains how grid-level route times might be derived into area-level metrics.

## Open Questions

- Which YKR geometry version and coordinate reference system are supplied with the downloadable data?

## Sources

- [[Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab]]
