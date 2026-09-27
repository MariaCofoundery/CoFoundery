import type {
  AreaSourcing,
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

/**
 * Welche Rollen jemand abdeckt - nach Faltin.
 *
 * GEWUENSCHT AM 27.09.2026: "Ich haette das gerne auch im Gesamtbild, dass
 * drinsteht, welche Rollen ich im Prinzip schon abdecke [...] und vor allem
 * wird es cool, wenn man dann schaut: ich matche mit zwei weiteren, welche
 * Sachen sind in dem Startup dann schon vorhanden."
 *
 * ZWEI BEDINGUNGEN MUESSEN ZUSAMMENKOMMEN, und erst zusammen sagen sie etwas:
 *
 *   Der Bereich GEHOERT INS TEAM (`internal_only`). Was einkaufbar ist,
 *   braucht niemanden im Team - dort ist eine Luecke eine Bestellung.
 *
 *   Die Person WILL IHN VERANTWORTEN (`own` oder `contribute`). Etwas zu
 *   koennen ist nicht dasselbe wie es zu uebernehmen: Eine hohe Stufe mit
 *   `prefer_other` ist ein ausdruecklich gueltiger Zustand.
 *
 * WAS ES NICHT SAGT: dass jemand es gut kann. Die Anwendungsstufe steht
 * daneben und wird hier nicht verrechnet - eine "Rollendeckung" mit einer
 * Note waere wieder eine Bewertung von Menschen.
 */
export type RoleCoverage = {
  /** Gehoert ins Team UND soll verantwortet werden. */
  covered: string[];
  /** Gehoert ins Team, ist besprochen, aber niemand will es uebernehmen. */
  spokenNotOwned: string[];
  /** Zaehlwerte ueber die eingetragenen Bereiche, je Herkunftsart. */
  bySourcing: Record<AreaSourcing, number>;
};

export type FounderProfileCoverage = {
  families: CoverageFamily[];
  roles: RoleCoverage;
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

  // Verantwortung heisst hier `own` oder `contribute`. `grow_into` zaehlt
  // bewusst nicht mit: "da will ich hineinwachsen" ist eine Absicht und noch
  // keine abgedeckte Rolle.
  const wantsIt = (wish: string | null) => wish === "own" || wish === "contribute";
  const sourcingOf = new Map(areas.map((area) => [area.area_id, area.sourcing ?? "unclassified"]));

  const covered: string[] = [];
  const spokenNotOwned: string[] = [];
  const bySourcing = {
    internal_only: 0,
    component: 0,
    depends: 0,
    unclassified: 0,
  } as Record<AreaSourcing, number>;

  for (const entry of entries) {
    const sourcing = (sourcingOf.get(entry.area_id) ?? "unclassified") as AreaSourcing;
    bySourcing[sourcing] = (bySourcing[sourcing] ?? 0) + 1;
    if (sourcing !== "internal_only") continue;
    if (wantsIt(entry.ownership_wish)) covered.push(entry.area_id);
    else spokenNotOwned.push(entry.area_id);
  }

  const order = new Map(areas.map((area) => [area.area_id, area.sort_order]));
  const bySortOrder = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0);

  return {
    families: coverageFamilies,
    roles: {
      covered: covered.sort(bySortOrder),
      spokenNotOwned: spokenNotOwned.sort(bySortOrder),
      bySourcing,
    },
    touchedFamilyCount: coverageFamilies.filter((family) => family.enteredCount > 0).length,
    familyCount: coverageFamilies.length,
    enteredCount: coverageFamilies.reduce((sum, family) => sum + family.enteredCount, 0),
  };
}
