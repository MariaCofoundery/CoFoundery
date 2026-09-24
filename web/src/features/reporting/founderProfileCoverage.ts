import type {
  CapabilityArea,
  CapabilityEntry,
  CapabilityFamily,
} from "@/features/capability/capabilityTypes";

/**
 * Die Deckungskarte einer einzelnen Person.
 *
 * GEWUENSCHT AM 24.09.2026: "Auch gerne ein bisschen farbig oder vielleicht
 * auch mit Grafiken irgendwie ein bisschen attraktiver gestaltet werden."
 *
 * WARUM KEIN NETZDIAGRAMM. Ein Spinnennetz ueber die Familien sieht gut aus
 * und ist genau deshalb gefaehrlich: Es braucht je Familie EINE Zahl, also
 * einen Score. Den gibt dieses Modell nicht her (Edwards, siehe
 * `docs/capability-comparison-theory-brief.md`), und ein unvalidiertes
 * Instrument, das eine Zahl je Person ausgibt, wird als Auswahlkriterium
 * benutzt, sobald es existiert. Den Schaden traegt die Person.
 *
 * WAS STATTDESSEN GEZEICHNET WIRD: je Familie ein Balken aus ihren einzelnen
 * Bereichen, jeder in der Farbe dessen, was die Person zu ihm gesagt hat. Das
 * sind Zaehlwerte ueber Bereiche - Tatsachen, keine Note. Dieselbe Sprache wie
 * in `CapabilityTeamReadoutView`, damit das eigene Bild und das Teambild
 * nebeneinander lesbar bleiben.
 *
 * "DARUEBER HABE ICH NICHTS GESAGT" IST DIE WICHTIGSTE FARBE. Bei 53 Bereichen
 * und einer Handvoll Eintraegen ist sie der Normalfall, nicht der Mangel. Sie
 * wird deshalb blass gezeichnet und nie wie eine Luecke - eine Luecke waere
 * eine Aussage ueber den Menschen, das hier ist eine ueber den Umfang des
 * Gespraechs.
 */

/**
 * Was zu einem Bereich gesagt wurde - in der Reihenfolge, in der die Angaben
 * im Gespraech entstehen. Keine Rangfolge: `named` ist nicht "schlechter" als
 * `answered`, es ist nur weniger weit beantwortet.
 */
export const COVERAGE_STATES = ["answered", "levelled", "named", "unspoken"] as const;
export type CoverageState = (typeof COVERAGE_STATES)[number];

export type CoverageArea = { areaId: string; state: CoverageState };

export type CoverageFamily = {
  familyId: string;
  areas: CoverageArea[];
  counts: Record<CoverageState, number>;
  /** Wie viele Bereiche der Familie ueberhaupt eingetragen sind. */
  enteredCount: number;
};

export type FounderProfileCoverage = {
  families: CoverageFamily[];
  /** Nur die Familien, zu denen es ueberhaupt einen Eintrag gibt. */
  touchedFamilyCount: number;
  familyCount: number;
  enteredCount: number;
};

function stateOf(entry: CapabilityEntry | undefined): CoverageState {
  if (!entry) return "unspoken";
  if (entry.application_level === null) return "named";
  // Der Verantwortungswunsch ist die zweite Frage zu einem Bereich. Dass
  // jemand `prefer_external` gesagt hat, zaehlt hier genauso als beantwortet
  // wie `own` - CAN ist nicht WANT TO OWN, und beides ist eine Antwort.
  if (entry.ownership_wish === null) return "levelled";
  return "answered";
}

export function buildFounderProfileCoverage(
  entries: CapabilityEntry[],
  areas: CapabilityArea[],
  families: CapabilityFamily[]
): FounderProfileCoverage {
  const byArea = new Map(entries.map((entry) => [entry.area_id, entry]));

  const coverageFamilies = families
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((family) => {
      const familyAreas = areas
        .filter((area) => area.family_id === family.family_id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((area) => ({ areaId: area.area_id, state: stateOf(byArea.get(area.area_id)) }));

      const counts = { answered: 0, levelled: 0, named: 0, unspoken: 0 } as Record<
        CoverageState,
        number
      >;
      for (const area of familyAreas) counts[area.state] += 1;

      return {
        familyId: family.family_id,
        areas: familyAreas,
        counts,
        enteredCount: familyAreas.length - counts.unspoken,
      };
    });

  return {
    families: coverageFamilies,
    touchedFamilyCount: coverageFamilies.filter((family) => family.enteredCount > 0).length,
    familyCount: coverageFamilies.length,
    enteredCount: coverageFamilies.reduce((sum, family) => sum + family.enteredCount, 0),
  };
}
