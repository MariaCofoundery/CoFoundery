import { DEPTH_LEVEL } from "@/features/capability/capabilityTypes";
import type { CapabilityArea, CapabilityFamily } from "./capabilityTypes";

/**
 * Der Vergleich zweier Snapshots.
 *
 * Fachliche Grundlage: docs/capability-comparison-theory-brief.md. Die dort
 * begruendeten Entscheidungen, die hier im Code sichtbar sein muessen:
 *
 *   Kein Score. Fit ueber Differenzwerte zu rechnen verwirft Information und
 *   ist methodisch kritisiert (Edwards). Ausgegeben wird das Muster der
 *   Kombination beider Angaben, nicht ihre Differenz.
 *
 *   Unterschied wird nicht belohnt. Funktionale Vielfalt hilft, aber umgekehrt
 *   U-foermig - deshalb sind hohe und niedrige Ueberlappung beide nur eine
 *   Lagebeschreibung.
 *
 *   Ziel ist Rollenklarheit. Die Zustaende sind nach Dringlichkeit sortiert:
 *   was vor einer Gruendung geklaert werden muss, steht oben.
 *
 *   Ein doppelter Anspruch ist keine gesunde Reibung. De Dreu & Weingart
 *   (2003) finden auch fuer Aufgabenkonflikt negative Zusammenhaenge; er wird
 *   also als offene Frage benannt, nicht als Qualitaet.
 *
 * Und die Grenze, die aus der Freigabeleiter folgt: Stufe und Wunsch der
 * anderen Person kommen als null zurueck, wenn sie die Tiefe nicht freigegeben
 * hat - absichtlich ununterscheidbar von "nicht eingetragen". Fehlende
 * Angaben ergeben deshalb `noBasis` und nie eine Aussage.
 */

/** Eine Seite des Vergleichs, so wie sie vorliegt - Luecken eingeschlossen. */
export type ComparisonSide = {
  areaId: string;
  applicationLevel: number | null;
  ownershipWish: string | null;
};

export type ComparisonStateKey =
  /** Beide wollen verantworten. Rollenambiguitaet in Reinform. */
  | "contested"
  /** Niemand will verantworten. Eine Zustaendigkeit, die es nicht gibt. */
  | "openPosition"
  /** Mindestens einer will, keiner hat Tiefe. Das Team ist hier duenn. */
  | "bothShallow"
  /** Einer kann und gibt ab, der andere will und ist noch nicht tief. */
  | "handoverPath"
  /** Einer will und kann, der andere will nicht. Sitzt schon. */
  | "settled"
  /** Zu wenig Angaben. Kein Zustand, und das wird auch so gesagt. */
  | "noBasis";

export type ComparisonArea = {
  areaId: string;
  familyId: string;
  state: ComparisonStateKey;
  /** Wessen Rolle es waere - nur wo der Zustand das hergibt. */
  owner: "a" | "b" | null;
  /** Die Angaben, aus denen der Zustand entstand. Nie eine Blackbox. */
  a: { level: number | null; wish: string | null } | null;
  b: { level: number | null; wish: string | null } | null;
};

export type CapabilityComparison = {
  /** Nach Dringlichkeit gruppiert; leere Gruppen entfallen. */
  groups: { state: ComparisonStateKey; areas: ComparisonArea[] }[];
  coverage: {
    together: number;
    shared: number;
    onlyA: number;
    onlyB: number;
  };
  /**
   * Lagebeschreibung, kein Urteil. Null, solange zu wenige Bereiche
   * vorliegen, um ueberhaupt etwas zu sagen.
   */
  overlap: "high" | "balanced" | "low" | null;
};

/**
 * Die Wuensche in drei Lager, und die Einteilung ist die ganze Logik.
 *
 * `unclear` gehoert ausdruecklich zu keinem der beiden entschiedenen Lager.
 * "Noch unklar" ist eine Angabe, aber keine Entscheidung - daraus "niemand
 * will es verantworten" zu machen waere genau die Deutung, die dieses Modell
 * nicht vornimmt.
 */
/** Beansprucht die Zustaendigkeit - jetzt oder auf Sicht. */
const CLAIMS = ["own", "grow_into"];
/** Hat entschieden, sie nicht zu wollen. */
const DECLINES = ["contribute", "prefer_other", "prefer_external"];

/**
 * Reihenfolge der Ausgabe. Nicht die Vokabular-Sortierung, sondern die
 * Dringlichkeit: Was vor einer Gruendung geklaert werden muss, steht oben.
 */
const STATE_ORDER: ComparisonStateKey[] = [
  "contested",
  "openPosition",
  "bothShallow",
  "handoverPath",
  "settled",
  "noBasis",
];

/** Ab wie vielen gemeinsamen Bereichen eine Lage ueberhaupt beschreibbar ist. */
const MIN_AREAS_FOR_OVERLAP = 4;
const HIGH_OVERLAP = 0.7;
const LOW_OVERLAP = 0.3;

export function buildCapabilityComparison(
  sideA: ComparisonSide[],
  sideB: ComparisonSide[],
  areas: CapabilityArea[],
  families: CapabilityFamily[]
): CapabilityComparison {
  const familyOfArea = new Map(areas.map((area) => [area.area_id, area.family_id]));
  const areaOrder = new Map(areas.map((area) => [area.area_id, area.sort_order]));
  const familyOrder = new Map(families.map((family) => [family.family_id, family.sort_order]));

  const byAreaA = new Map(sideA.map((side) => [side.areaId, side]));
  const byAreaB = new Map(sideB.map((side) => [side.areaId, side]));

  const areaIds = [...new Set([...byAreaA.keys(), ...byAreaB.keys()])]
    // Ein Bereich ausserhalb des Vokabulars kann nicht dargestellt werden;
    // ihn zu zeigen waere ein Label-Fehler auf einer Seite ueber Menschen.
    .filter((areaId) => familyOfArea.has(areaId));

  const compared: ComparisonArea[] = areaIds.map((areaId) => {
    const a = byAreaA.get(areaId) ?? null;
    const b = byAreaB.get(areaId) ?? null;
    const { state, owner } = deriveState(a, b);
    return {
      areaId,
      familyId: familyOfArea.get(areaId) as string,
      state,
      owner,
      a: a ? { level: a.applicationLevel, wish: a.ownershipWish } : null,
      b: b ? { level: b.applicationLevel, wish: b.ownershipWish } : null,
    };
  });

  const groups = STATE_ORDER.flatMap((state) => {
    const inState = compared
      .filter((area) => area.state === state)
      .sort(
        (x, y) =>
          (familyOrder.get(x.familyId) ?? 0) - (familyOrder.get(y.familyId) ?? 0) ||
          (areaOrder.get(x.areaId) ?? 0) - (areaOrder.get(y.areaId) ?? 0)
      );
    return inState.length ? [{ state, areas: inState }] : [];
  });

  const shared = areaIds.filter((areaId) => byAreaA.has(areaId) && byAreaB.has(areaId)).length;
  const coverage = {
    together: areaIds.length,
    shared,
    onlyA: areaIds.filter((areaId) => byAreaA.has(areaId) && !byAreaB.has(areaId)).length,
    onlyB: areaIds.filter((areaId) => byAreaB.has(areaId) && !byAreaA.has(areaId)).length,
  };

  return { groups, coverage, overlap: describeOverlap(coverage) };
}

/**
 * Ein Bereich, ein Zustand. Nach der Entschiedenheit beider Seiten bleiben
 * genau drei Faelle - beide beanspruchen, keiner beansprucht, genau einer -,
 * und nur der letzte teilt sich noch nach der Tiefe auf. Deshalb kann kein
 * Bereich in zwei Gruppen landen und keiner ohne Zustand bleiben.
 */
function deriveState(
  a: ComparisonSide | null,
  b: ComparisonSide | null
): { state: ComparisonStateKey; owner: "a" | "b" | null } {
  const wishA = a?.ownershipWish ?? null;
  const wishB = b?.ownershipWish ?? null;

  const claimsA = wishA !== null && CLAIMS.includes(wishA);
  const claimsB = wishB !== null && CLAIMS.includes(wishB);
  const declinesA = wishA !== null && DECLINES.includes(wishA);
  const declinesB = wishB !== null && DECLINES.includes(wishB);

  // Solange eine Seite sich nicht entschieden hat, gibt es keinen Zustand.
  // Das trifft drei Faelle, die absichtlich nicht auseinanderzuhalten sind:
  // nichts eingetragen, "noch unklar", oder die Tiefe nicht freigegeben.
  if ((!claimsA && !declinesA) || (!claimsB && !declinesB)) {
    return { state: "noBasis", owner: null };
  }

  // Ab hier haben beide sich entschieden, also gilt genau eines von drei:
  // beide beanspruchen, keiner beansprucht, oder genau einer.
  if (claimsA && claimsB) return { state: "contested", owner: null };
  if (declinesA && declinesB) return { state: "openPosition", owner: null };

  const claimer = claimsA ? "a" : "b";
  const claimerHasDepth = claimsA ? hasDepth(a) : hasDepth(b);
  const otherHasDepth = claimsA ? hasDepth(b) : hasDepth(a);

  // Wer es will und kann, hat die Rolle - der andere will sie nicht.
  if (claimerHasDepth) return { state: "settled", owner: claimer };

  // Wer es will, kann es noch nicht, und die Tiefe liegt beim anderen, der
  // sie nicht behalten will: ein Weg, der sich planen laesst.
  if (otherHasDepth) return { state: "handoverPath", owner: claimer === "a" ? "b" : "a" };

  // Gewollt, und keiner hat Tiefe angegeben.
  return { state: "bothShallow", owner: null };
}

function hasDepth(side: ComparisonSide | null) {
  return side?.applicationLevel !== null && side?.applicationLevel !== undefined
    ? side.applicationLevel >= DEPTH_LEVEL
    : false;
}

/**
 * Beide Extreme sind eine Lage, keine Empfehlung: Der Zusammenhang von
 * funktionaler Vielfalt und Leistung ist umgekehrt U-foermig, "moeglichst
 * unterschiedlich" waere also genauso falsch wie "moeglichst gleich".
 */
function describeOverlap(coverage: CapabilityComparison["coverage"]) {
  if (coverage.together < MIN_AREAS_FOR_OVERLAP) return null;
  const ratio = coverage.shared / coverage.together;
  if (ratio >= HIGH_OVERLAP) return "high" as const;
  if (ratio <= LOW_OVERLAP) return "low" as const;
  return "balanced" as const;
}

/** Fuer Tests und Oberflaeche: alle Zustaende in Ausgabereihenfolge. */
export const COMPARISON_STATES = STATE_ORDER;
