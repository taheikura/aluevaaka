import type { MunicipalityBase, MunicipalityMetrics } from '@aluevaaka/data-model';
import { describe, expect, it } from 'vitest';
import { buildRanges, rankMunicipalities } from '../engine.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const municipalities: MunicipalityBase[] = [
  {
    id: '091',
    nameFi: 'Helsinki',
    region: 'Uusimaa',
    coordinates: { lat: 60.17, lng: 24.94 },
    population: 660000,
    areaKm2: 715,
  },
  {
    id: '837',
    nameFi: 'Tampere',
    region: 'Pirkanmaa',
    coordinates: { lat: 61.5, lng: 23.77 },
    population: 240000,
    areaKm2: 689,
  },
  {
    id: '999',
    nameFi: 'SmallTown',
    region: 'Lappi',
    coordinates: { lat: 68.0, lng: 27.0 },
    population: 2000,
    areaKm2: 5000,
  },
];

const metrics: MunicipalityMetrics[] = [
  {
    id: '091',
    housingPricePerM2: 4500,
    avgMonthlyRent2r: 1800,
    distanceToHealthcareCentreKm: 1,
    distanceToRailKm: 0.5,
    broadbandAvailabilityPercent: 99,
    forestCoverPercent: 20,
    distanceToWaterKm: 1,
    unemploymentRatePercent: 7,
    netMigrationPer1000: 5,
    medianHouseholdIncomeEur: 38000,
  },
  {
    id: '837',
    housingPricePerM2: 2200,
    avgMonthlyRent2r: 900,
    distanceToHealthcareCentreKm: 3,
    distanceToRailKm: 1,
    broadbandAvailabilityPercent: 95,
    forestCoverPercent: 40,
    distanceToWaterKm: 2,
    unemploymentRatePercent: 9,
    netMigrationPer1000: 2,
    medianHouseholdIncomeEur: 32000,
  },
  {
    id: '999',
    housingPricePerM2: 800,
    avgMonthlyRent2r: 450,
    distanceToHealthcareCentreKm: 40,
    distanceToRailKm: 120,
    broadbandAvailabilityPercent: 60,
    forestCoverPercent: 85,
    distanceToWaterKm: 0.5,
    unemploymentRatePercent: 15,
    netMigrationPer1000: -8,
    medianHouseholdIncomeEur: 24000,
  },
];

const ranges = buildRanges(metrics);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rankMunicipalities', () => {
  it('returns results sorted by score descending', () => {
    const results = rankMunicipalities({
      municipalities,
      metrics,
      ranges,
      preferences: {
        housingAffordability: 0.5,
        healthcareAccess: 0.5,
        transportConnectivity: 0,
        natureAndRecreation: 0,
        economicOutlook: 0,
        services: 0,
      },
      constraints: undefined,
      limit: 10,
    });

    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      if (prev && curr) {
        expect(prev.score).toBeGreaterThanOrEqual(curr.score);
      }
    }
  });

  it('respects the limit parameter', () => {
    const results = rankMunicipalities({
      municipalities,
      metrics,
      ranges,
      preferences: {
        housingAffordability: 1,
        healthcareAccess: 0,
        transportConnectivity: 0,
        natureAndRecreation: 0,
        economicOutlook: 0,
        services: 0,
      },
      constraints: undefined,
      limit: 2,
    });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('excludes municipalities that violate hard constraints', () => {
    const results = rankMunicipalities({
      municipalities,
      metrics,
      ranges,
      preferences: {
        housingAffordability: 1,
        healthcareAccess: 0,
        transportConnectivity: 0,
        natureAndRecreation: 0,
        economicOutlook: 0,
        services: 0,
      },
      constraints: {
        maximumDistanceToHealthcareKm: 10,
      },
      limit: 10,
    });

    // SmallTown has 40km to healthcare — should be excluded
    expect(results.find((r) => r.municipalityId === '999')).toBeUndefined();
  });

  it('all results have scores between 0 and 1', () => {
    const results = rankMunicipalities({
      municipalities,
      metrics,
      ranges,
      preferences: {
        housingAffordability: 0.25,
        healthcareAccess: 0.25,
        transportConnectivity: 0.25,
        natureAndRecreation: 0.25,
        economicOutlook: 0,
        services: 0,
      },
      constraints: undefined,
      limit: 10,
    });

    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('includes dataCompleteness for all results', () => {
    const results = rankMunicipalities({
      municipalities,
      metrics,
      ranges,
      preferences: {
        housingAffordability: 1,
        healthcareAccess: 0,
        transportConnectivity: 0,
        natureAndRecreation: 0,
        economicOutlook: 0,
        services: 0,
      },
      constraints: undefined,
      limit: 10,
    });

    for (const r of results) {
      expect(r.dataCompleteness).toBeGreaterThan(0);
      expect(r.dataCompleteness).toBeLessThanOrEqual(1);
    }
  });
});
