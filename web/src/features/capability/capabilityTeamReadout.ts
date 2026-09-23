// Der Wert-Import ueber den Alias, der Typ-Import relativ: Genauso macht es
// `capabilityComparison.ts`, und der Testloader loest nur die Alias-Form
// wirklich auf (Typen werden ohnehin entfernt).
import { DEPTH_LEVEL } from "@/features/capability/capabilityTypes";
import type { AreaSourcing, CapabilityArea, CapabilityFamily } from "./capabilityTypes";

/**
 * Die Rollenlage eines Teams.
 *
 * GEWUENSCHT AM 21.09.2026: "Dass dann die ganzen Rollen und
 * Verantwortlichkeiten von dem Founder-Team gut gezeigt werden können [...]
 * und zum Beispiel wenn dann auffällt, ey, euch beiden fehlt HR oder Finance."
 *
 * DAS IST DIE VERALLGEMEINERUNG VON `capabilityComparison.ts` auf beliebig
 * viele Menschen, und sie hält sich an dieselben Entscheidungen - sie stehen
 * ausführlich in `docs/capability-comparison-theory-brief.md`:
 *
 *   KEIN SCORE. Fit über Differenzwerte zu rechnen verwirft Information und
 *   ist methodisch kritisiert (Edwards). Ausgegeben wird das Muster der
 *   Angaben, nicht ihre Distanz. Es gibt hier deshalb keine Prozentzahl,
 *   keine Note und keine Rangliste von Teams.
 *
 *   UNTERSCHIED WIRD NICHT BELOHNT. Funktionale Vielfalt hilft, aber umgekehrt
 *   U-förmig - "möglichst verschieden" wäre genauso falsch wie "möglichst
 *   gleich".
 *
 *   EIN DOPPELTER ANSPRUCH IST KEINE GESUNDE REIBUNG. De Dreu & Weingart
 *   (2003) finden auch für Aufgabenkonflikt negative Zusammenhänge; er wird
 *   benannt, nicht gefeiert.
 *
 * DIE ZUSTÄNDE, und ihr Verhältnis zur paarweisen Fassung:
 *
 *   contested        wie dort: mehr als einer beansprucht.
 *   settled          wie dort: genau einer beansprucht und hat Tiefe.
 *   handoverPath     wie dort: einer will, kann noch nicht, und die Tiefe
 *                    liegt bei jemandem, der sie nicht behalten will.
 *   claimedShallow   entspricht `bothShallow`: gewollt, aber niemand tief.
 *                    Umbenannt, weil "both" bei fünf Menschen nichts sagt.
 *   openPosition     NEU AUFGETEILT: niemand will, aber jemand KANN.
 *   gap              NEU AUFGETEILT: niemand will, und niemand kann.
 *                    Die paarweise Fassung kennt nur `openPosition` für beides.
 *                    Für ein Team ist der Unterschied der eigentliche Befund:
 *                    "Können wir, will nur keiner" ist eine Absprache,
 *                    "können wir nicht" ist eine Einstellung oder ein Auftrag.
 *   noBasis          wie dort: weniger als zwei haben sich entschieden.
 *
 * UND DIE GRENZE, DIE BLEIBT: Was jemand nicht freigegeben hat, kommt als
 * null herein - absichtlich ununterscheidbar von "nicht eingetragen". Fehlende
 * Angaben ergeben deshalb `noBasis` und nie eine Aussage über einen Menschen.
 */

/** Eine Person, so wie sie vorliegt - Lücken eingeschlossen. */
export type TeamMemberSides = {
  userId: string;
  /** Wie die Person im Team genannt wird. Aussagen ohne Namen sind unbrauchbar. */
  name: string;
  entries: { areaId: string; applicationLevel: number | null; ownershipWish: string | null }[];
};

export type TeamAreaStateKey =
  | "contested"
  | "openPosition"
  | "gap"
  | "claimedShallow"
  | "handoverPath"
  | "settled"
  | "noBasis";

export type TeamAreaState = {
  areaId: string;
  familyId: string;
  /**
   * Nach Faltins Komponentenmodell - siehe Migration 20261041120000.
   *
   * SIE STEHT AM BEFUND UND NICHT NUR AM BEREICH, weil sie genau dort etwas
   * ändert: Eine Lücke bei etwas Einkaufbarem ist eine Bestellung, eine Lücke
   * bei etwas, das ins Team gehört, ist eine Entscheidung über die Gründung.
   */
  sourcing: AreaSourcing;
  state: TeamAreaStateKey;
  /** Wer die Zuständigkeit beansprucht. Bei `contested` mehrere. */
  claimants: string[];
  /** Wer Tiefe angegeben hat - unabhängig vom Wunsch. */
  deep: string[];
  /** Wer sich ausdrücklich gegen die Zuständigkeit entschieden hat. */
  declining: string[];
  /** Wie viele sich zu diesem Bereich noch nicht entschieden haben. */
  undecided: number;
};

export type TeamFamilyStateKey = "covered" | "contested" | "open" | "gap" | "unspoken";

export type TeamFamilyState = {
  familyId: string;
  state: TeamFamilyStateKey;
  /** Die Bereiche dieser Familie, zu denen es überhaupt Angaben gibt. */
  areas: TeamAreaState[];
  /** Wer in dieser Familie eine Zuständigkeit beansprucht. */
  claimants: string[];
  /** Zählwerte für die Darstellung. Zahlen, keine Bewertung. */
  counts: Record<TeamAreaStateKey, number>;
};

export type TeamReadout = {
  members: { userId: string; name: string }[];
  families: TeamFamilyState[];
  /** Die Befunde, nach Dringlichkeit. Leere Gruppen entfallen. */
  findings: { state: TeamAreaStateKey; areas: TeamAreaState[] }[];
  /**
   * Familien, über die niemand etwas gesagt hat. Das ist keine Aussage über
   * Können, sondern über das Gespräch - und so muss es auch dastehen.
   */
  unspokenFamilies: string[];
};

/** Beansprucht die Zuständigkeit - jetzt oder auf Sicht. Wie paarweise. */
const CLAIMS = ["own", "grow_into"];
/** Hat entschieden, sie nicht zu wollen. Wie paarweise. */
const DECLINES = ["contribute", "prefer_other", "prefer_external"];

/**
 * Ausgabereihenfolge: Dringlichkeit, nicht Vokabular.
 *
 * `contested` und `gap` stehen oben, weil beide vor einer Gründung geklärt
 * werden müssen - das eine durch ein Gespräch, das andere durch eine
 * Entscheidung über Einstellen, Auslagern oder Lassen.
 */
const STATE_ORDER: TeamAreaStateKey[] = [
  "contested",
  "gap",
  "openPosition",
  "claimedShallow",
  "handoverPath",
  "settled",
  "noBasis",
];

/** Ab wie vielen Entschiedenen ein Bereich überhaupt einen Zustand hat. */
const MIN_DECIDED = 2;

export function buildCapabilityTeamReadout(
  members: TeamMemberSides[],
  areas: CapabilityArea[],
  families: CapabilityFamily[]
): TeamReadout {
  const familyOfArea = new Map(areas.map((area) => [area.area_id, area.family_id]));
  const sourcingOfArea = new Map(areas.map((area) => [area.area_id, area.sourcing ?? "depends"]));
  const areaOrder = new Map(areas.map((area) => [area.area_id, area.sort_order]));
  const orderedFamilies = [...families].sort((a, b) => a.sort_order - b.sort_order);

  // Alle Bereiche, zu denen irgendwer etwas gesagt hat. Ein Bereich außerhalb
  // des Vokabulars kann nicht dargestellt werden; ihn zu zeigen wäre ein
  // Label-Fehler auf einer Seite über Menschen.
  const touchedAreaIds = [
    ...new Set(
      members.flatMap((member) => member.entries.map((entry) => entry.areaId))
    ),
  ].filter((areaId) => familyOfArea.has(areaId));

  const areaStates = touchedAreaIds
    .map((areaId) =>
      deriveAreaState(
        areaId,
        familyOfArea.get(areaId) as string,
        sourcingOfArea.get(areaId) ?? "depends",
        members
      )
    )
    .sort((a, b) => (areaOrder.get(a.areaId) ?? 0) - (areaOrder.get(b.areaId) ?? 0));

  const byFamily = new Map<string, TeamAreaState[]>();
  for (const state of areaStates) {
    byFamily.set(state.familyId, [...(byFamily.get(state.familyId) ?? []), state]);
  }

  const familyStates: TeamFamilyState[] = orderedFamilies.map((family) => {
    const inFamily = byFamily.get(family.family_id) ?? [];
    const counts = emptyCounts();
    for (const area of inFamily) counts[area.state] += 1;

    return {
      familyId: family.family_id,
      state: deriveFamilyState(inFamily, counts),
      areas: inFamily,
      claimants: [...new Set(inFamily.flatMap((area) => area.claimants))],
      counts,
    };
  });

  const findings = STATE_ORDER.flatMap((state) => {
    const inState = areaStates.filter((area) => area.state === state);
    return inState.length > 0 ? [{ state, areas: inState }] : [];
  });

  return {
    members: members.map((member) => ({ userId: member.userId, name: member.name })),
    families: familyStates,
    findings,
    unspokenFamilies: familyStates
      .filter((family) => family.state === "unspoken")
      .map((family) => family.familyId),
  };
}

function emptyCounts(): Record<TeamAreaStateKey, number> {
  return {
    contested: 0,
    gap: 0,
    openPosition: 0,
    claimedShallow: 0,
    handoverPath: 0,
    settled: 0,
    noBasis: 0,
  };
}

/**
 * Ein Bereich, ein Zustand.
 *
 * Die Reihenfolge der Prüfungen ist die ganze Logik, und sie ist dieselbe wie
 * paarweise: erst die Frage, ob überhaupt genug entschieden ist, dann die drei
 * Fälle nach der Zahl der Ansprüche - mehrere, keiner, genau einer -, und nur
 * der letzte teilt sich noch nach der Tiefe auf. Deshalb kann kein Bereich in
 * zwei Gruppen landen und keiner ohne Zustand bleiben.
 */
function deriveAreaState(
  areaId: string,
  familyId: string,
  sourcing: AreaSourcing,
  members: TeamMemberSides[]
): TeamAreaState {
  const claimants: string[] = [];
  const declining: string[] = [];
  const deep: string[] = [];
  let undecided = 0;

  for (const member of members) {
    const entry = member.entries.find((candidate) => candidate.areaId === areaId);
    if (!entry) {
      // Kein Eintrag ist keine Absage. Diese Person hat zu dem Bereich
      // schlicht nichts gesagt.
      undecided += 1;
      continue;
    }

    if (entry.applicationLevel !== null && entry.applicationLevel >= DEPTH_LEVEL) {
      deep.push(member.userId);
    }

    const wish = entry.ownershipWish;
    if (wish !== null && CLAIMS.includes(wish)) claimants.push(member.userId);
    else if (wish !== null && DECLINES.includes(wish)) declining.push(member.userId);
    // `unclear` und null gehören zu keinem Lager: "Noch unklar" ist eine
    // Angabe, aber keine Entscheidung. Daraus "will es niemand" zu machen wäre
    // genau die Deutung, die dieses Modell nicht vornimmt.
    else undecided += 1;
  }

  const base = { areaId, familyId, sourcing, claimants, deep, declining, undecided };
  const decided = claimants.length + declining.length;

  if (decided < MIN_DECIDED) return { ...base, state: "noBasis" };
  if (claimants.length > 1) return { ...base, state: "contested" };

  if (claimants.length === 0) {
    // HIER TEILT SICH AUF, was die paarweise Fassung zusammenfasst - und das
    // ist der Befund, um den Maria gebeten hat: "Können wir, will nur keiner"
    // ist eine Absprache; "können wir nicht" ist eine Einstellung, ein Auftrag
    // oder die Entscheidung, es zu lassen.
    return { ...base, state: deep.length > 0 ? "openPosition" : "gap" };
  }

  const claimant = claimants[0];
  if (deep.includes(claimant)) return { ...base, state: "settled" };

  // Wer es will, kann es noch nicht, und die Tiefe liegt bei jemandem, der sie
  // nicht behalten will: ein Weg, der sich planen lässt.
  if (deep.some((userId) => declining.includes(userId))) {
    return { ...base, state: "handoverPath" };
  }

  return { ...base, state: "claimedShallow" };
}

/**
 * Eine Familie, ein Zustand - für den Überblick.
 *
 * MARIAS BEISPIEL IST EINE FAMILIENAUSSAGE, nicht eine über einen Bereich:
 * "Euch fehlt HR oder Finance." Deshalb gibt es diese Ebene überhaupt - mit
 * zweiundvierzig Bereichen einzeln sieht man den Wald nicht.
 *
 * `unspoken` IST DER WICHTIGSTE UND HEIKELSTE ZUSTAND: Niemand hat zu dieser
 * Familie etwas eingetragen. Das ist KEINE Aussage über Können - es ist eine
 * über das Gespräch, und es muss auch so dastehen. Bei zweiundvierzig
 * Bereichen und einer Handvoll Einträgen je Person ist er am Anfang der
 * Normalfall; ihn als "Lücke" zu beschriften wäre eine Behauptung über
 * Menschen, die nur noch nicht dazu gekommen sind.
 */
function deriveFamilyState(
  areas: TeamAreaState[],
  counts: Record<TeamAreaStateKey, number>
): TeamFamilyStateKey {
  if (areas.length === 0) return "unspoken";
  if (counts.settled > 0) return "covered";
  if (counts.contested > 0) return "contested";
  if (counts.openPosition > 0 || counts.claimedShallow > 0 || counts.handoverPath > 0) {
    return "open";
  }
  if (counts.gap > 0) return "gap";
  // Nur `noBasis`: Es gibt Einträge, aber zu wenige Entscheidungen.
  return "unspoken";
}

/** Für Tests und Oberfläche: alle Zustände in Ausgabereihenfolge. */
export const TEAM_AREA_STATES = STATE_ORDER;
export const TEAM_FAMILY_STATES: TeamFamilyStateKey[] = [
  "covered",
  "contested",
  "open",
  "gap",
  "unspoken",
];
