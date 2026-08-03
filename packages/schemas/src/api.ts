import { z } from 'zod';
import { ConstraintsSchema, PreferencesSchema } from './preferences.js';

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const RecommendationRequestSchema = z.object({
  preferences: PreferencesSchema,
  constraints: ConstraintsSchema,
  /** Maximum number of results to return, 1–2000 */
  limit: z.number().int().min(1).max(2000).default(10),
});

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export const CategoryScoresSchema = z.object({
  housingAffordability: z.number().min(0).max(1).optional(),
  healthcareAccess: z.number().min(0).max(1).optional(),
  transportConnectivity: z.number().min(0).max(1).optional(),
  natureAndRecreation: z.number().min(0).max(1).optional(),
  groceryProximity: z.number().min(0).max(1).optional(),
  schoolProximity: z.number().min(0).max(1).optional(),
  economicOutlook: z.number().min(0).max(1).optional(),
  safety: z.number().min(0).max(1).optional(),
  services: z.number().min(0).max(1).optional(),
});

export type CategoryScores = z.infer<typeof CategoryScoresSchema>;

export const RecommendationResultSchema = z.object({
  municipalityId: z.string(),
  name: z.string(),
  region: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
  housingPricePerM2: z.number().nonnegative().optional(),
  housingTransactionCount: z.number().int().nonnegative().optional(),
  housingDataYear: z.string().optional(),
  h3Index: z.string().optional(),
  /** Overall weighted match score 0–1 */
  score: z.number().min(0).max(1),
  categoryScores: CategoryScoresSchema,
  /** Top positive contributors, plain language */
  strengths: z.array(z.string()),
  /** Notable trade-offs or weak areas */
  tradeoffs: z.array(z.string()),
  /** Fraction of expected metrics that were present for this municipality, 0–1 */
  dataCompleteness: z.number().min(0).max(1),
});

export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;

export const RecommendationResponseSchema = z.object({
  datasetVersion: z.string(),
  results: z.array(RecommendationResultSchema),
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

export const MapRequestSchema = z.object({
  preferences: PreferencesSchema,
  constraints: ConstraintsSchema,
  bounds: z.object({
    south: z.number().min(-90).max(90),
    west: z.number().min(-180).max(180),
    north: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
  }),
});

export type MapRequest = z.infer<typeof MapRequestSchema>;

export const MapResultSchema = RecommendationResultSchema.extend({
  rank: z.number().int().positive(),
  isGoodMatch: z.boolean(),
});

export const MapResponseSchema = z.object({
  datasetVersion: z.string(),
  results: z.array(MapResultSchema),
});

export type MapResponse = z.infer<typeof MapResponseSchema>;

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  serviceVersion: z.string(),
  datasetVersion: z.string().optional(),
  datasetStatus: z.enum(['available', 'stale', 'unavailable']),
  municipalityCount: z.number().int().nonnegative().optional(),
  areaCount: z.number().int().nonnegative().optional(),
  metricCoverage: z.record(z.number().min(0).max(1)).optional(),
  qualityWarnings: z.array(z.string()).optional(),
  generatedAt: z.string().optional(),
  sources: z
    .array(
      z.object({
        name: z.string(),
        fetchedAt: z.string(),
        publishedAt: z.string().optional(),
      }),
    )
    .optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

export const ApiErrorSchema = z.object({
  error: z.string(),
  /** Machine-readable code */
  code: z.enum(['VALIDATION_ERROR', 'DATASET_UNAVAILABLE', 'INTERNAL_ERROR', 'REQUEST_TOO_LARGE']),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
