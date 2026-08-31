import type { DiscoveryMustHaves } from "@/features/discovery/discoveryTypes";

export type DiscoverySearchBriefCriterion =
  | { key: "role"; values: string[] }
  | { key: "expertise"; values: string[] }
  | { key: "location"; values: string[] }
  | { key: "remote"; values: string[] }
  | { key: "availability"; values: string[] };

export function getDiscoverySearchBriefCriteria(
  filters: DiscoveryMustHaves
): DiscoverySearchBriefCriterion[] {
  const criteria: DiscoverySearchBriefCriterion[] = [];
  if (filters.requiredRolesAny.length > 0) {
    criteria.push({ key: "role", values: filters.requiredRolesAny });
  }
  if (filters.requiredExpertiseAny.length > 0) {
    criteria.push({ key: "expertise", values: filters.requiredExpertiseAny });
  }
  if (filters.desiredLocationRegion) {
    criteria.push({ key: "location", values: [filters.desiredLocationRegion] });
  }
  if (filters.acceptedRemoteModes.length > 0) {
    criteria.push({ key: "remote", values: filters.acceptedRemoteModes });
  }
  if (filters.minimumAvailabilityHoursPerWeek != null) {
    criteria.push({
      key: "availability",
      values: [String(filters.minimumAvailabilityHoursPerWeek)],
    });
  }
  return criteria;
}

export function compactDiscoveryValues(values: string[], limit = 3) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return {
    visible: normalized.slice(0, limit),
    remaining: Math.max(0, normalized.length - limit),
  };
}
