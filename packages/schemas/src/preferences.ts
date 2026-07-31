import { z } from 'zod';

/**
 * User preference weights — each value is 0–1.
 * The backend normalises these so they don't need to sum to 1.
 */
export const PreferencesSchema = z.object({
  housingAffordability: z.number().min(0).max(1).default(0),
  healthcareAccess: z.number().min(0).max(1).default(0),
  transportConnectivity: z.number().min(0).max(1).default(0),
  natureAndRecreation: z.number().min(0).max(1).default(0),
  economicOutlook: z.number().min(0).max(1).default(0),
  services: z.number().min(0).max(1).default(0),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

/**
 * Hard constraints — municipalities that violate any constraint
 * are excluded from results entirely before ranking.
 */
export const ConstraintsSchema = z
  .object({
    /** Maximum acceptable monthly housing cost in EUR */
    maximumHousingCostEur: z.number().positive().optional(),
    /** Maximum acceptable distance to healthcare centre in km */
    maximumDistanceToHealthcareKm: z.number().positive().optional(),
    /** Maximum acceptable distance to rail station in km */
    maximumDistanceToRailKm: z.number().positive().optional(),
    /** Minimum required broadband availability percentage */
    minimumBroadbandPercent: z.number().min(0).max(100).optional(),
  })
  .optional();

export type Constraints = z.infer<typeof ConstraintsSchema>;
