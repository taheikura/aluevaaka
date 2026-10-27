---
title: "Helsinki Region Travel Time Matrix 2023 — Digital Geography Lab"
type: source
aliases:
  - "Helsinki travel time matrix 2023"
  - "HRTM 2023"
tags:
  - topic/location-intelligence
  - type/dataset
created: 2026-10-27
updated: 2026-10-27
sources:
  - "[[raw/clippings/Helsinki Region Travel Time Matrix 2023  Digital Geography Lab]]"
confidence: medium
status: mature
source_author: "Digital Geography Lab"
source_date: "2023 data; page publication date not specified"
source_url: "https://www.helsinki.fi/en/researchgroups/digital-geography-lab/helsinki-region-travel-time-matrix-2023"
---

The Digital Geography Lab's page documents a 2023 travel-time matrix for the Helsinki region. It describes travel times and walking distances between 13,231 centroids in a 250 × 250 m grid across Helsinki, Espoo, Kauniainen, and Vantaa. The dataset is a potential source for Aluevaaka's transport and accessibility indicators, but it does not directly match the project's current area-level data model and would require spatial aggregation and validation before use.

## Key Takeaways

- The matrix covers 13,231 origin/destination grid centroids in the four Helsinki metropolitan municipalities.
- It includes walking, cycling, public transport, and private-car routes; public transport and car routes have rush-hour, midday, and nighttime variants.
- Walking and cycling data include different speed assumptions; cycling times include one minute for unlocking and locking a bicycle.
- CSV, compressed CSV, and GeoPackage formats are described. Grid geometries can be joined to route rows with `from_id` and `to_id`.
- The 2023 routes were computed for Wednesday, 15 February 2023. The page says the calculations use r5py and a locally modified R5 engine.
- Earlier matrix versions were produced with differing methodologies, so changes between releases should not automatically be interpreted as real-world transport changes.
- For Aluevaaka, this is a candidate input to derive travel-time indicators, not a ready-made neighbourhood score. Its grid identifiers must be related to the project's area geographies and the coverage and aggregation validated.

## Detailed Notes

### Coverage and measures

The source describes a 250 × 250 m grid following the geometric properties and enumeration of the YKR grid. It covers Helsinki, Espoo, Kauniainen, and Vantaa. Route records identify origin and destination cells and provide walk, cycle, public-transport, and car travel times. The published columns distinguish transport modes, speed assumptions, and—where applicable—time of day. A walking-distance field is also listed.

### Formats and joins

The page describes route data as per-destination CSV files, a single compressed CSV, and a GeoPackage containing route columns and destination geometries. Separate GeoPackage and Shapefile archives contain grid geometries and cell IDs. The source says the geometries can be joined using either `from_id` or `to_id`, depending on the analysis.

### Method and temporal context

The 2023 matrix was computed for 15 February 2023. The page defines rush hour as 08:00–09:00, midday as 12:00–13:00, and nighttime as 02:00–03:00. It describes r5py as the interface to Conveyal's R5 engine and notes that the Digital Geography Lab maintains a patched R5 fork and a companion repository for input preparation, parameters, and output handling.

The page also points to a 2018 calculation made using the 2023 methods, while warning that earlier matrices used different methods and input data. The matrix is therefore a dated modelled snapshot, not live routing or a directly comparable time series.

### Integration and migration into Aluevaaka

Aluevaaka's current area model is municipality/postal-area oriented, with optional H3 cell identifiers and proximity or service metrics; it does not currently define a route-time matrix field. The source's `from_id`/`to_id` identifiers are grid-cell IDs, not Aluevaaka area IDs, so the data cannot be joined to existing recommendation records by identifier alone.

A practical migration path is to prototype a separate offline import and derive area-level indicators by spatially relating the source grid to Aluevaaka's supported areas. Candidate outputs could include travel time to selected destinations or counts/coverage within chosen time thresholds, broken down by mode and time period. Before publication, validate the geographic join, missing cells, units, mode/time assumptions, and aggregation method; preserve the source date, source URL, license terms, and transform version in dataset provenance. Expose coverage and limitations with the resulting recommendation rather than presenting the matrix as a complete measure of accessibility. The source page does not specify dataset licensing or enough operational detail to treat this migration plan as confirmed implementation.

## Entities & Concepts Referenced

- [[Digital Geography Lab]] — source publisher and maintainer of the described calculation resources.
- [[YKR Grid]] — the 250 m grid whose cell identifiers and geometries structure the matrix.
- [[r5py]] — Python library used for route calculations with R5.
- [[R5]] — routing engine that the page says was locally modified for these calculations.
- [[Travel-Time Accessibility]] — potential derived indicator and integration concept for Aluevaaka.
- [[Aluevaaka]] — possible consumer after data is transformed and validated for its area model.
- [[Data Provenance and Quality]] — requirements for source metadata, coverage checks, and safe publication.

## Quotes & Data Points

- Grid: 250 × 250 m; 13,231 centroids.
- Area: Helsinki, Espoo, Kauniainen, and Vantaa.
- Calculation date: Wednesday, 15 February 2023.
- Time windows: 08:00–09:00, 12:00–13:00, and 02:00–03:00.
- Cycling estimates include an extra minute for bicycle unlocking and locking.

## Open Questions

- What are the current download locations, license terms, and redistribution restrictions for each data format?
- Which destinations and thresholds would produce meaningful indicators for Aluevaaka users?
- Which Aluevaaka area geography should be used for aggregation, and how should partial grid-cell coverage be handled?
- How should the 2023 snapshot's age and model assumptions be communicated and refreshed?
