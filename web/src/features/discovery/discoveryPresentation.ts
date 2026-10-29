import { DISCOVERY_ROLE_PART_IDS } from "@/features/discovery/discoveryConfig";
import type { DiscoveryMustHaves } from "@/features/discovery/discoveryTypes";

export type DiscoverySearchBriefCriterion =
  | { key: "role"; values: string[] }
  | { key: "expertise"; values: string[] }
  | { key: "capability"; values: string[] }
  | { key: "location"; values: string[] }
  | { key: "remote"; values: string[] }
  | { key: "availability"; values: string[] }
  | { key: "searchIntent"; values: string[] }
  | { key: "startHorizon"; values: string[] }
  | { key: "commitment"; values: string[] };

/**
 * Wonach gerade gefiltert wird — vollstaendig.
 *
 * JEDES KRITERIUM, DAS DIE LISTE KUERZT, STEHT HIER. Ein Filter, der still
 * wirkt, ist derselbe Fehler wie eine Fehlermeldung ohne Grund: Man sieht
 * weniger Menschen und weiss nicht, warum. Wer hier etwas ergaenzt, das die
 * Datenbankfunktion prueft, ergaenzt es auch dort.
 */
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
  if (filters.requiredCapabilityAreasAny.length > 0) {
    criteria.push({ key: "capability", values: filters.requiredCapabilityAreasAny });
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
  if (filters.acceptedSearchIntents.length > 0) {
    criteria.push({ key: "searchIntent", values: filters.acceptedSearchIntents });
  }
  if (filters.acceptedStartHorizons.length > 0) {
    criteria.push({ key: "startHorizon", values: filters.acceptedStartHorizons });
  }
  if (filters.acceptedCommitmentLevels.length > 0) {
    criteria.push({ key: "commitment", values: filters.acceptedCommitmentLevels });
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

/**
 * Rollen als Beschriftungen - mit dem Freitext an der Stelle von "other".
 *
 * Steht hier und nicht in einer der Anzeigen, weil die Rollen an fuenf Orten
 * gerendert werden: eigene Vorschau, Kandidatenkarte, Profildetail, Intros und
 * die Abgleichsansicht. Ohne eine gemeinsame Stelle haette die eine Anzeige
 * "Anderer Schwerpunkt" gezeigt und die naechste den Text - und beim dritten
 * Mal haette jemand die Ersetzung vergessen.
 *
 * Steht kein Text da, bleibt die Floskel. Das ist kein guter Zustand, aber ein
 * ehrlicher: Bestandsprofile haben den Text noch nicht.
 */
export function discoveryRoleLabels(
  roles: readonly string[],
  other: string | null | undefined,
  labelFor: (role: string) => string
) {
  const text = other?.trim();
  return roles.map((role) => (role === "other" && text ? text : labelFor(role)));
}


/**
 * Beschriftungen gespeicherter Unterbereiche ("product.discovery" -> "Product Discovery").
 *
 * Die Kennung steht in `DISCOVERY_ROLE_PART_IDS`, die Beschriftungen in den
 * Sprachdateien unter `roleHelp.<rolle>.parts` in derselben Reihenfolge.
 * Unbekannte Kennungen fallen weg, statt als Rohtext zu erscheinen.
 */
export function discoveryRolePartLabels(
  ids: readonly string[] | undefined,
  partsFor: (role: string) => string
): string[] {
  return (ids ?? []).flatMap((id) => {
    const [role, part] = id.split(".");
    const list = (DISCOVERY_ROLE_PART_IDS as Record<string, readonly string[]>)[role] ?? [];
    const index = list.indexOf(part);
    if (index < 0) return [];
    const label = partsFor(role).split(" | ")[index];
    return label ? [label] : [];
  });
}
