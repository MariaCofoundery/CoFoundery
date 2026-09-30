import type { ThemePreference } from "@/features/find/discoveryMatch";
import type { FounderSearchPreferences } from "@/features/discovery/discoveryTypes";

/**
 * Aus den angewendeten Suchpraeferenzen werden die Kriterien einer gemerkten
 * Suche.
 *
 * Drei Entscheidungen stecken hier drin, und alle drei sind es wert,
 * nachlesbar zu sein:
 *
 *   Rollen und Expertise landen im selben Feld. Der Abgleich prueft "topics"
 *   gegen die Rollen UND die Expertise des neuen Profils - wer "Technik"
 *   sucht, meint beides.
 *
 *   Eine Arbeitsweise wird nur dann zum Kriterium, wenn genau eine verlangt
 *   ist. Wer zwei zulaesst, grenzt damit nichts ein, das eine Meldung
 *   rechtfertigt.
 *
 *   Die Alignment-Dimensionen werden nur mitgenommen, wenn Alignment auch
 *   eingeschaltet ist. Sonst stuende in der Suche ein Filter, den niemand
 *   gesetzt hat.
 */
export type DiscoverySearchCriteriaRow = {
  topics: string[];
  industries: string[];
  locations: string[];
  remote_mode: string | null;
  capability_area_ids: string[];
  discovery_preferences: ThemePreference[];
};

export function buildDiscoverySearchCriteria(
  preferences: Pick<FounderSearchPreferences, "mustHaves"> | null,
  themePreferences: readonly ThemePreference[] = [],
): DiscoverySearchCriteriaRow {
  const mustHaves = preferences?.mustHaves;

  return {
    topics: [
      ...(mustHaves?.requiredRolesAny ?? []),
      ...(mustHaves?.requiredExpertiseAny ?? []),
    ].slice(0, 12),
    industries: (mustHaves?.requiredIndustriesAny ?? []).slice(0, 5),
    locations: mustHaves?.desiredLocationRegion ? [mustHaves.desiredLocationRegion] : [],
    remote_mode:
      mustHaves?.acceptedRemoteModes.length === 1 ? mustHaves.acceptedRemoteModes[0] : null,
    capability_area_ids: (mustHaves?.requiredCapabilityAreasAny ?? []).slice(0, 8),
    // Nur die gewichteten: "egal" ist keine Praeferenz, und sechs Zeilen
    // "egal" waeren eine Aufzeichnung ohne Inhalt.
    discovery_preferences: themePreferences.filter((entry) => entry.importance > 0),
  };
}
