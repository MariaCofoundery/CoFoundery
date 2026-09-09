import type { CapabilityArea, CapabilityEntry, CapabilityFamily } from "./capabilityTypes";

/**
 * Die Auswertung des eigenen Snapshots.
 *
 * Bis hierher hat die Seite nur zurueckgegeben, was jemand eingetragen hat -
 * eine Liste, kein Ergebnis. Wer drei Schritte ausfuellt und danach seinen
 * eigenen Text wiedersieht, hat keinen Grund, das gut zu finden.
 *
 * Diese Auswertung braucht kein Modell. Sie entsteht aus zwei Feldern, die
 * schon da sind - Anwendungsstufe und Verantwortungswunsch - und aus der einen
 * Unterscheidung, auf der das ganze Modell steht:
 *
 *   Koennen ist nicht Wollen.
 *
 * Genau daraus kommt der Befund, der in einem Gruendungsgespraech etwas wert
 * ist: "Das kannst du, willst es aber nicht dauerhaft verantworten." Das ist
 * kein Widerspruch, sondern eine Verhandlungsinformation - und niemand fragt
 * Founder danach.
 *
 * Alles hier ist eine Umformung von Eingegebenem, keine Interpretation. Die
 * Befunde sagen nichts, was die Person nicht selbst angegeben hat; sie stellen
 * es nur nebeneinander. Deshalb gibt es auch keinen Befund ueber fehlende
 * Bereiche: Ein leeres Feld heisst, dass dort nichts steht - nicht, dass dort
 * nichts ist.
 */

/** Ab hier gilt eine Angabe als Tiefe, nicht als Beruehrung. */
export const DEPTH_LEVEL = 4;

/** Wuensche, die "jemand anders soll das dauerhaft haben" bedeuten. */
const HANDS_OVER = ["prefer_other", "prefer_external"] as const;

export type ReadoutFindingKey =
  /** Tiefe angegeben und will es auch verantworten. */
  | "anchor"
  /** Kann es, will es aber abgeben. Der interessanteste Fall. */
  | "canButHandsOver"
  /** Will hineinwachsen - Wunsch vorhanden, Tiefe noch nicht. */
  | "growingInto"
  /** Beruehrung, ohne Anspruch darauf. */
  | "contributes"
  /** Wunsch noch offen. Kein Urteil, nur eine offene Stelle. */
  | "undecided";

export type ReadoutFinding = {
  key: ReadoutFindingKey;
  areaIds: string[];
};

export type CapabilityReadout = {
  /** Familie mit den meisten Eintraegen; null bei Gleichstand oder leer. */
  focusFamilyId: string | null;
  areaCount: number;
  depthCount: number;
  /** Wie viele Eintraege ueberhaupt eine Stufe bzw. einen Wunsch tragen. */
  levelledCount: number;
  wishedCount: number;
  findings: ReadoutFinding[];
};

export function buildCapabilityReadout(
  entries: CapabilityEntry[],
  areas: CapabilityArea[],
  families: CapabilityFamily[]
): CapabilityReadout {
  const familyOfArea = new Map(areas.map((area) => [area.area_id, area.family_id]));
  const areaOrder = new Map(areas.map((area) => [area.area_id, area.sort_order]));
  const inOrder = (areaIds: string[]) =>
    areaIds.slice().sort((a, b) => (areaOrder.get(a) ?? 0) - (areaOrder.get(b) ?? 0));

  const hasDepth = (entry: CapabilityEntry) =>
    entry.application_level !== null && entry.application_level >= DEPTH_LEVEL;
  const handsOver = (entry: CapabilityEntry) =>
    entry.ownership_wish !== null && (HANDS_OVER as readonly string[]).includes(entry.ownership_wish);

  const bucket: Record<ReadoutFindingKey, string[]> = {
    anchor: [],
    canButHandsOver: [],
    growingInto: [],
    contributes: [],
    undecided: [],
  };

  for (const entry of entries) {
    // Die Reihenfolge ist die Aussagekraft: Der erste zutreffende Befund
    // gewinnt, damit ein Bereich nicht in zwei Listen auftaucht und die
    // Auswertung sich selbst widerspricht.
    //
    // Der Wunsch steht dabei vor der Stufe, weil er ausdruecklich angegeben
    // ist. Eine fehlende Stufe darf nicht zu einer Aussage werden: Wer
    // "verantworten" angibt und die Stufe leer laesst, will verantworten -
    // ob mit oder ohne Tiefe, steht dann eben nicht da. Nur eine
    // ausdruecklich niedrige Stufe macht daraus Hineinwachsen.
    if (hasDepth(entry) && handsOver(entry)) {
      bucket.canButHandsOver.push(entry.area_id);
    } else if (
      entry.ownership_wish === "own" &&
      entry.application_level !== null &&
      entry.application_level < DEPTH_LEVEL
    ) {
      bucket.growingInto.push(entry.area_id);
    } else if (entry.ownership_wish === "own") {
      bucket.anchor.push(entry.area_id);
    } else if (entry.ownership_wish === "grow_into") {
      bucket.growingInto.push(entry.area_id);
    } else if (entry.ownership_wish === "contribute" || handsOver(entry)) {
      bucket.contributes.push(entry.area_id);
    } else {
      // Bleibt: kein Wunsch angegeben oder ausdruecklich "noch unklar".
      bucket.undecided.push(entry.area_id);
    }
  }

  const perFamily = new Map<string, number>();
  for (const entry of entries) {
    const familyId = familyOfArea.get(entry.area_id);
    if (!familyId) continue;
    perFamily.set(familyId, (perFamily.get(familyId) ?? 0) + 1);
  }

  const familyOrder = new Map(families.map((family) => [family.family_id, family.sort_order]));
  const ranked = [...perFamily.entries()].sort(
    (a, b) => b[1] - a[1] || (familyOrder.get(a[0]) ?? 0) - (familyOrder.get(b[0]) ?? 0)
  );
  // Bei Gleichstand keinen Schwerpunkt behaupten. Zwei gleich grosse Familien
  // sind kein Schwerpunkt, und "vor allem X" waere dann schlicht falsch.
  const focusFamilyId =
    ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : null;

  const findings = (Object.keys(bucket) as ReadoutFindingKey[])
    .filter((key) => bucket[key].length > 0)
    .map((key) => ({ key, areaIds: inOrder(bucket[key]) }));

  return {
    focusFamilyId,
    areaCount: entries.length,
    depthCount: entries.filter(hasDepth).length,
    levelledCount: entries.filter((entry) => entry.application_level !== null).length,
    wishedCount: entries.filter((entry) => entry.ownership_wish !== null).length,
    findings,
  };
}
