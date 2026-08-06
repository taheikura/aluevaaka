/**
 * Integration tests for the Lambda handler routing and response shapes.
 * S3 calls are mocked via vi.mock so no AWS credentials are needed.
 */

import type { Context, LambdaFunctionURLEvent } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import type { HandlerResponse } from '../response.js';

// Mock the dataset module before importing the handler
vi.mock('../dataset.js', () => ({
  loadManifest: vi.fn().mockResolvedValue({
    version: '2026-07-30',
    generatedAt: '2026-07-30T00:00:00Z',
    municipalityCount: 2,
    sources: [],
    qualityWarnings: [],
  }),
  loadDataset: vi.fn().mockResolvedValue({
    manifest: {
      version: '2026-07-30',
      generatedAt: '2026-07-30T00:00:00Z',
      municipalityCount: 2,
      sources: [],
      qualityWarnings: [],
    },
    municipalities: [
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
    ],
    metrics: [
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
    ],
    ranges: {
      housingPricePerM2: { min: 2200, max: 4500 },
      avgMonthlyRent2r: { min: 900, max: 1800 },
      distanceToHealthcareCentreKm: { min: 1, max: 3 },
      distanceToRailKm: { min: 0.5, max: 1 },
      broadbandAvailabilityPercent: { min: 95, max: 99 },
      forestCoverPercent: { min: 20, max: 40 },
      distanceToWaterKm: { min: 1, max: 2 },
      unemploymentRatePercent: { min: 7, max: 9 },
      netMigrationPer1000: { min: 2, max: 5 },
      medianHouseholdIncomeEur: { min: 32000, max: 38000 },
    },
  }),
  loadMapPartition: vi.fn().mockResolvedValue({
    municipalities: [
      {
        id: '091',
        nameFi: 'Helsinki',
        region: 'Uusimaa',
        coordinates: { lat: 60.17, lng: 24.94 },
        population: 1,
        areaKm2: 1,
      },
    ],
    metrics: [{ id: '091', housingPricePerM2: 4500 }],
  }),
  loadMapDataset: vi.fn().mockResolvedValue({
    manifest: {
      version: '2026-07-30',
      generatedAt: '2026-07-30T00:00:00Z',
      municipalityCount: 2,
      sources: [],
      qualityWarnings: [],
    },
    municipalities: [
      {
        id: '091',
        nameFi: 'Helsinki',
        region: 'Uusimaa',
        coordinates: { lat: 60.17, lng: 24.94 },
        population: 1,
        areaKm2: 1,
      },
    ],
    metrics: [{ id: '091', housingPricePerM2: 4500 }],
    ranges: { housingPricePerM2: { min: 4500, max: 4500 } },
  }),
}));

// Set required env var before importing handler
process.env.DATA_BUCKET = 'test-bucket';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

const { handler } = await import('../index.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  method: string,
  path: string,
  body?: unknown,
  origin?: string,
): LambdaFunctionURLEvent {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: '',
    headers: { ...(origin ? { origin } : {}) },
    requestContext: {
      http: { method, path, protocol: 'HTTP/1.1', sourceIp: '1.2.3.4', userAgent: 'test' },
      accountId: '123456789012',
      apiId: 'test',
      domainName: 'test.lambda-url.eu-north-1.on.aws',
      domainPrefix: 'test',
      requestId: 'test-req-id',
      routeKey: '$default',
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1735689600000,
    },
    body: body ? JSON.stringify(body) : undefined,
    isBase64Encoded: false,
  } as unknown as LambdaFunctionURLEvent;
}

const context = { awsRequestId: 'test-ctx-id' } as Context;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('returns 200 with dataset info', async () => {
    const res: HandlerResponse = await handler(makeEvent('GET', '/health'), context);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.datasetVersion).toBe('2026-07-30');
    expect(body.datasetStatus).toBe('available');
  });
});

describe('POST /recommendations', () => {
  it('returns 200 with results', async () => {
    const res: HandlerResponse = await handler(
      makeEvent('POST', '/recommendations', {
        preferences: {
          housingAffordability: 0.5,
          healthcareAccess: 0.5,
          transportConnectivity: 0,
          natureAndRecreation: 0,
          economicOutlook: 0,
          services: 0,
        },
        limit: 5,
      }),
      context,
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.results).toBeInstanceOf(Array);
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.datasetVersion).toBe('2026-07-30');
  });

  it('returns 400 for invalid JSON', async () => {
    const event = makeEvent('POST', '/recommendations');
    event.body = 'not-json{';
    const res: HandlerResponse = await handler(event, context);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for preference values out of range', async () => {
    const res: HandlerResponse = await handler(
      makeEvent('POST', '/recommendations', {
        preferences: { housingAffordability: 5 }, // invalid: > 1
      }),
      context,
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /map', () => {
  it('returns visible cells with match flags', async () => {
    const res: HandlerResponse = await handler(
      makeEvent('POST', '/map', {
        preferences: {
          housingAffordability: 0.5,
          healthcareAccess: 0.5,
          transportConnectivity: 0,
          natureAndRecreation: 0,
          economicOutlook: 0,
          services: 0,
        },
        bounds: { south: 59, west: 23, north: 61, east: 26 },
        zoom: 10,
      }),
      context,
    );
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.results).toBeInstanceOf(Array);
    expect(body.results[0]).toHaveProperty('isGoodMatch');
  });
});

describe('OPTIONS preflight', () => {
  it('returns 204 with CORS headers for allowed origin', async () => {
    const res: HandlerResponse = await handler(
      makeEvent('OPTIONS', '/recommendations', undefined, 'http://localhost:5173'),
      context,
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers?.['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('does not echo disallowed origins', async () => {
    const res: HandlerResponse = await handler(
      makeEvent('OPTIONS', '/recommendations', undefined, 'https://evil.example.com'),
      context,
    );
    expect(res.statusCode).toBe(204);
    expect(res.headers?.['Access-Control-Allow-Origin'] ?? '').toBe('');
  });
});

describe('Unknown routes', () => {
  it('returns 404', async () => {
    const res: HandlerResponse = await handler(makeEvent('GET', '/unknown'), context);
    expect(res.statusCode).toBe(404);
  });
});
