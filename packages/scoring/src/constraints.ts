import type { MunicipalityMetrics } from '@aluevaaka/data-model';
import type { Constraints } from '@aluevaaka/schemas';

/**
 * Returns true if the municipality passes ALL hard constraints.
 * A missing metric is treated as a constraint violation when a constraint
 * is defined — we prefer false negatives over misleading inclusions.
 */
export function passesConstraints(
  metrics: MunicipalityMetrics,
  constraints: Constraints,
): boolean {
  if (!constraints) return true;

  if (constraints.maximumHousingCostEur !== undefined) {
    const cost = metrics.avgMonthlyRent2r ?? metrics.housingPricePerM2;
    if (cost === undefined || cost > constraints.maximumHousingCostEur) return false;
  }

  if (constraints.maximumDistanceToHealthcareKm !== undefined) {
    const dist = metrics.distanceToHealthcareCentreKm;
    if (dist === undefined || dist > constraints.maximumDistanceToHealthcareKm) return false;
  }

  if (constraints.maximumDistanceToRailKm !== undefined) {
    const dist = metrics.distanceToRailKm;
    if (dist === undefined || dist > constraints.maximumDistanceToRailKm) return false;
  }

  if (constraints.minimumBroadbandPercent !== undefined) {
    const coverage = metrics.broadbandAvailabilityPercent;
    if (coverage === undefined || coverage < constraints.minimumBroadbandPercent) return false;
  }

  return true;
}
