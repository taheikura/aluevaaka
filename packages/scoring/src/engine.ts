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
  unemploymentRatePercent?: { min: number; max: number };
  netMigrationPer1000?: { min: number; max: number };
  medianHouseholdIncomeEur?: { min: number; max: number };
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
  set('unemploymentRatePercent', columnRange(col('unemploymentRatePercent')));
  set('netMigrationPer1000', columnRange(col('netMigrationPer1000')));
  set('medianHouseholdIncomeEur', columnRange(col('medianHouseholdIncomeEur')));

  return ranges;
}

// ---------------------------------------------------------------------------
// Category scores
// ---------------------------------------------------------------------------

function scoreHousing(
  m: MunicipalityMetrics,
  ranges: MetricRanges,
): number | undefined {
  const r = ranges.avgMonthlyRent2r ?? ranges.housingPricePerM2;
  const v = m.avgMonthlyRent2r ?? m.housingPricePerM2;
  if (!r) return undefined;
  return normalizeLowerIsBetter(v, r.min, r.max);
}

function scoreHealthcare(
  m: MunicipalityMetrics,
  ranges: MetricRanges,
): number | undefined {
  const r = ranges.distanceToHealthcareCentreKm;
  if (!r) return undefined;
  return normalizeLowerIsBetter(m.distanceToHealthcareCentreKm, r.min, r.max);
}

function scoreTransport(
  m: MunicipalityMetrics,
  ranges: MetricRanges,
): number | undefined {
  const scores: number[] = [];

  if (ranges.distanceToRailKm) {
    const s = normalizeLowerIsBetter(m.distanceToRailKm, ranges.distanceToRailKm.min, ranges.distanceToRailKm.max);
    if (s !== undefined) scores.push(s);
  }
  if (ranges.broadbandAvailabilityPercent) {
    const s = normalizeHigherIsBetter(m.broadbandAvailabilityPercent, ranges.broadbandAvailabilityPercent.min, ranges.broadbandAvailabilityPercent.max);
    if (s !== undefined) scores.push(s);
  }

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
}

function scoreNature(
  m: MunicipalityMetrics,
  ranges: MetricRanges,
): number | undefined {
  const scores: number[] = [];

  if (ranges.forestCoverPercent) {
    const s = normalizeHigherIsBetter(m.forestCoverPercent, ranges.forestCoverPercent.min, ranges.forestCoverPercent.max);
    if (s !== undefined) scores.push(s);
  }
  if (ranges.distanceToWaterKm) {
    const s = normalizeLowerIsBetter(m.distanceToWaterKm, ranges.distanceToWaterKm.min, ranges.distanceToWaterKm.max);
    if (s !== undefined) scores.push(s);
  }

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
}

function scoreEconomic(
  m: MunicipalityMetrics,
  ranges: MetricRanges,
): number | undefined {
  const scores: number[] = [];

  if (ranges.unemploymentRatePercent) {
    const s = normalizeLowerIsBetter(m.unemploymentRatePercent, ranges.unemploymentRatePercent.min, ranges.unemploymentRatePercent.max);
    if (s !== undefined) scores.push(s);
  }
  if (ranges.netMigrationPer1000) {
    const s = normalizeHigherIsBetter(m.netMigrationPer1000, ranges.netMigrationPer1000.min, ranges.netMigrationPer1000.max);
    if (s !== undefined) scores.push(s);
  }
  if (ranges.medianHouseholdIncomeEur) {
    const s = normalizeHigherIsBetter(m.medianHouseholdIncomeEur, ranges.medianHouseholdIncomeEur.min, ranges.medianHouseholdIncomeEur.max);
    if (s !== undefined) scores.push(s);
  }

  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
}

// ---------------------------------------------------------------------------
// Data completeness
// ---------------------------------------------------------------------------

const EXPECTED_METRICS: (keyof MunicipalityMetrics)[] = [
  'housingPricePerM2',
  'distanceToHealthcareCentreKm',
  'distanceToRailKm',
  'broadbandAvailabilityPercent',
  'forestCoverPercent',
  'unemploymentRatePercent',
  'netMigrationPer1000',
  'medianHouseholdIncomeEur',
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
  const weightSum = Object.values(preferences).reduce((a, b) => a + b, 0);
  const normalizedWeights: Preferences =
    weightSum === 0
      ? preferences
      : (Object.fromEntries(
          Object.entries(preferences).map(([k, v]) => [k, v / weightSum]),
        ) as Preferences);

  const results: RecommendationResult[] = [];

  for (const muni of municipalities) {
    const m = metricsById.get(muni.id);
    if (!m) continue;

    // Apply hard constraints first
    if (!passesConstraints(m, constraints)) continue;

    const categoryScores: CategoryScores = {
      housingAffordability: scoreHousing(m, ranges) ?? undefined,
      healthcareAccess: scoreHealthcare(m, ranges) ?? undefined,
      transportConnectivity: scoreTransport(m, ranges) ?? undefined,
      natureAndRecreation: scoreNature(m, ranges) ?? undefined,
      economicOutlook: scoreEconomic(m, ranges) ?? undefined,
    };

    // Weighted sum — skip categories with no score
    let weightedScore = 0;
    let appliedWeight = 0;

    for (const [key, rawScore] of Object.entries(categoryScores) as [keyof CategoryScores, number | undefined][]) {
      if (rawScore === undefined) continue;
      const w = normalizedWeights[key] ?? 0;
      weightedScore += w * rawScore;
      appliedWeight += w;
    }

    // If none of the user's weighted categories had data, skip this municipality
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
      score,
      categoryScores,
      strengths,
      tradeoffs,
      dataCompleteness,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
