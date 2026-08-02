/**
 * Core area data model.
 *
 * These types represent the shape of data stored in generated S3 datasets.
 * Keep this pure — no AWS SDK, no Zod, no runtime deps.
 */

/** ISO 8601 date string, e.g. "2026-07-30" */
export type ISODateString = string;

/** Finnish municipality identifier (kuntanumero), e.g. "091" for Helsinki */
export type MunicipalityId = string;

export interface MunicipalityCoordinates {
  /** WGS84 latitude */
  lat: number;
  /** WGS84 longitude */
  lng: number;
}

export interface MunicipalityBase {
  id: MunicipalityId;
  /** Parent municipality code used to join municipality-level source data. */
  municipalityId?: MunicipalityId;
  /** Official or commonly used Finnish area name */
  nameFi: string;
  /** Official Swedish name, if available */
  nameSv?: string;
  /** Parent city for the capital-area MVP */
  region: string;
  coordinates: MunicipalityCoordinates;
  /** Population from latest available census */
  population: number;
  /** Land area in km² */
  areaKm2: number;
}

/** Raw metric values for a single municipality — all optional to handle missing data gracefully */
export interface MunicipalityMetrics {
  id: MunicipalityId;

  // Housing affordability
  /** Average asking price per m² for residential property */
  housingPricePerM2?: number;
  /** Average monthly rent for a 2-room apartment */
  avgMonthlyRent2r?: number;

  // Healthcare and services
  /** Distance to nearest GP/health centre in km */
  distanceToHealthcareCentreKm?: number;
  /** Number of GP practices per 1000 residents */
  gpPracticesPer1000?: number;
  /** Distance to nearest hospital with emergency dept in km */
  distanceToHospitalKm?: number;

  // Transport and connectivity
  /** Distance to nearest railway station in km */
  distanceToRailKm?: number;
  /** Daily rail or bus connections to nearest regional centre */
  dailyPublicTransportConnections?: number;
  /** 4G/5G population coverage percentage */
  mobileCoveragePercent?: number;
  /** Fixed broadband availability percentage */
  broadbandAvailabilityPercent?: number;

  // Nature and recreation
  /** Percentage of municipality area covered by forest */
  forestCoverPercent?: number;
  /** Number of recreational areas or nature reserves */
  natureReserveCount?: number;
  /** Distance to nearest lake or coastline in km */
  distanceToWaterKm?: number;

  // Demographics and economic outlook
  /** Unemployment rate as a percentage */
  unemploymentRatePercent?: number;
  /** Number of employers with 10+ employees */
  largeEmployerCount?: number;
  /** Net migration per 1000 residents over last 3 years */
  netMigrationPer1000?: number;
  /** Municipal income tax rate percentage */
  incomeTaxRatePercent?: number;
  /** Median household net income in EUR */
  medianHouseholdIncomeEur?: number;
}

/** Fraction of expected metrics that are present, 0–1 */
export type DataCompleteness = number;

/** Provenance for a single data source within a dataset */
export interface DataSourceProvenance {
  /** Human-readable source name, e.g. "Statistics Finland" */
  name: string;
  url: string;
  /** SPDX license or free-text terms */
  license: string;
  /** When the data was fetched by our pipeline */
  fetchedAt: ISODateString;
  /** Publication date of the source data, if known */
  publishedAt?: ISODateString;
  /** Pipeline transform version that produced this data */
  transformVersion: string;
}

/** Top-level manifest written alongside generated datasets */
export interface DatasetManifest {
  /** Semver or date-based version string, e.g. "2026-07-30" */
  version: string;
  generatedAt: ISODateString;
  municipalityCount: number;
  sources: DataSourceProvenance[];
  /** Any quality warnings produced by the pipeline */
  qualityWarnings: string[];
}
