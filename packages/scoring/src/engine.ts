import type { MunicipalityBase, MunicipalityMetrics } from '@aluevaaka/data-model';
import type {
  CategoryScores,
  Constraints,
  Preferences,
  RecommendationResult,
} from '@aluevaaka/schemas';
import { passesConstraints } from './constraints.js';
import { columnRange, normalizeHigherIsBetter, normalizeLowerIsBetter } from './normalize.js';

// ---------------------------------------------------------------------------
// Normalized metric set (computed once per dataset load)
// ---------------------------------------------------------------------------

export interface NormalizedDataset {
  municipalities: MunicipalityBase[];
  metrics: MunicipalityMetrics[];
  /** Pre-computed column ranges used for normalization */
  ranges: MetricRanges;
}

interface MetricRanges {
  housingPricePerM2?: { min: number; max: number };
  avgMonthlyRent2r?: { min: number; max: number };
  distanceToHealthcareCentreKm?: { min: number; max: number };
  distanceToRailKm?: { min: number; max: number };
  mobileCoveragePercent?: { min: number; max: number };
  broadbandAvailabilityPercent?: { min: number; max: number };
  forestCoverPercent?: { min: number; max: number };
  distanceToWaterKm?: { min: number; max: number };
  distanceToHealthcareKm?: { min: number; max: number };
  distanceToTransitKm?: { min: number; max: number };
  distanceToGroceryKm?: { min: number; max: number };
  distanceToParkKm?: { min: number; max: number };
  distanceToSchoolKm?: { min: number; max: number };
  distanceToLibraryKm?: { min: number; max: number };
}

/** Build column ranges from the full dataset. Call once on dataset load. */
export function buildRanges(metrics: MunicipalityMetrics[]): MetricRanges {
  const col = <K extends keyof MunicipalityMetrics>(key: K) =>
    metrics.map((m) => m[key] as number | undefined);

  // Build only the keys that have a valid range (exactOptionalPropertyTypes
  // forbids assigning `undefined` to an optional property explicitly).
  const ranges: MetricRanges = {};
  const set = <K extends keyof MetricRanges>(key: K, val: ReturnType<typeof columnRange>) => {
    if (val !== undefined) (ranges as Record<K, typeof val>)[key] = val;
  };

  set('housingPricePerM2', columnRange(col('housingPricePerM2')));
  set('avgMonthlyRent2r', columnRange(col('avgMonthlyRent2r')));
  set('distanceToHealthcareCentreKm', columnRange(col('distanceToHealthcareCentreKm')));
  set('distanceToRailKm', columnRange(col('distanceToRailKm')));
  set('mobileCoveragePercent', columnRange(col('mobileCoveragePercent')));
  set('broadbandAvailabilityPercent', columnRange(col('broadbandAvailabilityPercent')));
  set('forestCoverPercent', columnRange(col('forestCoverPercent')));
  set('distanceToWaterKm', columnRange(col('distanceToWaterKm')));
  set('distanceToHealthcareKm', columnRange(col('distanceToHealthcareKm')));
  set('distanceToTransitKm', columnRange(col('distanceToTransitKm')));
  set('distanceToGroceryKm', columnRange(col('distanceToGroceryKm')));
  set('distanceToParkKm', columnRange(col('distanceToParkKm')));
  set('distanceToSchoolKm', columnRange(col('distanceToSchoolKm')));
  set('distanceToLibraryKm', columnRange(col('distanceToLibraryKm')));

  return ranges;
}

// ---------------------------------------------------------------------------
// Category scores
// ---------------------------------------------------------------------------

function scoreHousing(m: MunicipalityMetrics, ranges: MetricRanges): number | undefined {
  const r = ranges.avgMonthlyRent2r ?? ranges.housingPricePerM2;
  const v = m.avgMonthlyRent2r ?? m.housingPricePerM2;
  if (!r) return undefined;
  return normalizeLowerIsBetter(v, r.min, r.max);
}

function scoreHealthcare(m: MunicipalityMetrics, ranges: MetricRanges): number | undefined {
  const r = ranges.distanceToHealthcareKm;
  if (!r) return undefined;
  return normalizeLowerIsBetter(m.distanceToHealthcareKm, r.min, r.max);
}

function scoreTransport(m: MunicipalityMetrics, ranges: MetricRanges): number | undefined {
  const scores: number[] = [];

  if (ranges.distanceToTransitKm) {
    const s = normalizeLowerIsBetter(
      m.distanceToTransitKm,
      ranges.distanceToTransitKm.min,
      ranges.distanceToTransitKm.max,
    );
    if (s !== undefined) scores.push(s);
  }

  if (ranges.distanceToRailKm) {
    const s = normalizeLowerIsBetter(
      m.distanceToRailKm,
      ranges.distanceToRailKm.min,
      ranges.distanceToRailKm.max,
    );
    if (s !== undefined) scores.push(s);
  }
  if (ranges.broadbandAvailabilityPercent) {
    const s = normalizeHigherIsBetter(
      m.broadbandAvailabilityPercent,
      ranges.broadbandAvailabilityPercent.min,
      ranges.broadbandAvailabilityPercent.max,
    );
    if (s !== undefined) scores.push(s);
  }

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
}

function scoreNature(m: MunicipalityMetrics, ranges: MetricRanges): number | undefined {
  const scores: number[] = [];

  if (ranges.distanceToParkKm) {
    const s = normalizeLowerIsBetter(
      m.distanceToParkKm,
      ranges.distanceToParkKm.min,
      ranges.distanceToParkKm.max,
    );
    if (s !== undefined) scores.push(s);
  }

  if (ranges.forestCoverPercent) {
    const s = normalizeHigherIsBetter(
      m.forestCoverPercent,
      ranges.forestCoverPercent.min,
      ranges.forestCoverPercent.max,
    );
    if (s !== undefined) scores.push(s);
  }
  if (ranges.distanceToWaterKm) {
    const s = normalizeLowerIsBetter(
      m.distanceToWaterKm,
      ranges.distanceToWaterKm.min,
      ranges.distanceToWaterKm.max,
    );
    if (s !== undefined) scores.push(s);
  }

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
}

// ---------------------------------------------------------------------------
// Data completeness
// ---------------------------------------------------------------------------

const EXPECTED_METRICS: (keyof MunicipalityMetrics)[] = [
  'housingPricePerM2',
  'distanceToHealthcareKm',
  'distanceToTransitKm',
  'distanceToGroceryKm',
  'distanceToParkKm',
  'distanceToSchoolKm',
  'distanceToLibraryKm',
];

function computeCompleteness(m: MunicipalityMetrics): number {
  const present = EXPECTED_METRICS.filter((k) => m[k] !== undefined).length;
  return present / EXPECTED_METRICS.length;
}

// ---------------------------------------------------------------------------
// Explanation
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  housingAffordability: 'Affordable housing',
  healthcareAccess: 'Healthcare access',
  transportConnectivity: 'Transport connectivity',
  natureAndRecreation: 'Nature and recreation',
  economicOutlook: 'Economic outlook',
  services: 'Local services',
};

function buildExplanation(
  categoryScores: CategoryScores,
  preferences: Preferences,
): { strengths: string[]; tradeoffs: string[] } {
  const scored = (Object.entries(categoryScores) as [keyof CategoryScores, number | undefined][])
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ({ key: k, score: v as number, weight: preferences[k] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const strengths = scored
    .filter((s) => s.score >= 0.65 && s.weight > 0)
    .slice(0, 3)
    .map((s) => CATEGORY_LABELS[s.key]);

  const tradeoffs = scored
    .filter((s) => s.score < 0.4 && s.weight > 0)
    .slice(-3)
    .map((s) => `Weaker ${CATEGORY_LABELS[s.key].toLowerCase()}`);

  return { strengths, tradeoffs };
}

// ---------------------------------------------------------------------------
// Main ranking function
// ---------------------------------------------------------------------------

export interface RankInput {
  municipalities: MunicipalityBase[];
  metrics: MunicipalityMetrics[];
  ranges: MetricRanges;
  preferences: Preferences;
  constraints: Constraints;
  limit: number;
}

export function rankMunicipalities(input: RankInput): RecommendationResult[] {
  const { municipalities, metrics, ranges, preferences, constraints, limit } = input;

  // Build a lookup map for O(1) metric access
  const metricsById = new Map(metrics.map((m) => [m.id, m]));

  // Normalize preference weights so they sum to 1
  const weightSum = Object.values(preferences).reduce((a, b) => (a ?? 0) + (b ?? 0), 0);
  const normalizedWeights: Preferences =
    weightSum === 0
      ? preferences
      : (Object.fromEntries(
          Object.entries(preferences).map(([k, v]) => [k, (v ?? 0) / (weightSum ?? 1)]),
        ) as Preferences);

  const results: RecommendationResult[] = [];
  const excluded: MunicipalityBase[] = [];

  for (const muni of municipalities) {
    const m = metricsById.get(muni.id);
    if (!m) continue;

    // Apply hard constraints first
    if (!passesConstraints(m, constraints)) {
      excluded.push(muni);
      continue;
    }

    const categoryScores: CategoryScores = {
      housingAffordability: scoreHousing(m, ranges) ?? undefined,
      healthcareAccess: scoreHealthcare(m, ranges) ?? undefined,
      transportConnectivity: scoreTransport(m, ranges) ?? undefined,
      natureAndRecreation: scoreNature(m, ranges) ?? undefined,
      economicOutlook: undefined,
    };

    // Weighted sum — skip categories with no score
    let weightedScore = 0;
    let appliedWeight = 0;

    for (const [key, rawScore] of Object.entries(categoryScores) as [
      keyof CategoryScores,
      number | undefined,
    ][]) {
      const w = normalizedWeights[key] ?? 0;
      if (w === 0) continue;
      weightedScore += w * (rawScore ?? 0.5);
      appliedWeight += w;
    }

    if (appliedWeight === 0) continue;

    // Re-normalise to applied weight so missing categories don't drag down the score
    const score = weightedScore / appliedWeight;
    const dataCompleteness = computeCompleteness(m);
    const { strengths, tradeoffs } = buildExplanation(categoryScores, preferences);

    results.push({
      municipalityId: muni.id,
      name: muni.nameFi,
      region: muni.region,
      coordinates: muni.coordinates,
      polygon: muni.polygon,
      housingPricePerM2: m.housingPricePerM2,
      housingTransactionCount: m.housingTransactionCount,
      housingDataYear: m.housingDataYear,
      h3Index: m.h3Index,
      score,
      categoryScores,
      strengths,
      tradeoffs,
      dataCompleteness,
    });
  }

  const ranked = results.sort((a, b) => b.score - a.score);
  if (ranked.length > 0 || excluded.length === 0) return ranked.slice(0, limit);

  const relaxed = rankMunicipalities({ ...input, constraints: undefined });
  return relaxed
    .map((result) => ({
      ...result,
      tradeoffs: [
        'Pakolliset ehdot eivät täyttyneet – tulos on paras saatavilla oleva vaihtoehto.',
        ...result.tradeoffs,
      ],
    }))
    .slice(0, limit);
}
