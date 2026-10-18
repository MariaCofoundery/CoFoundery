import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";

/**
 * „So willst du gründen" - die eigene Sicht auf EIN Vorhaben, kompakt (Phase 1.1).
 *
 * WAS ES IST: die eigenen Antworten aus dem Vorhaben-Abgleich
 * (`venture-alignment-v1`), nach Themen auf ein paar Karten verteilt. Jede
 * Angabe ist eine Antwort genau so, wie sie gegeben wurde - umsortiert, nicht
 * verrechnet.
 *
 * WAS ES NICHT IST: kein Gesamtwert, kein Prozent, kein Radar, keine Rangfolge,
 * kein gut/schlecht. Eine Skala erscheint nur dort, wo die Frage selbst
 * geordnete Antworten hat (`ordinal`) - dann als die gewaehlte Stufe unter
 * den angebotenen, nie als Messwert. Wo die Frage keine Ordnung hat, steht ein
 * Satz. Wo keine Antwort ist (auch „kann ich noch nicht einschätzen"), steht
 * nichts - die ausfuehrliche Auswertung zeigt auch das.
 *
 * PERSON, NICHT TEAM: Nur die eigenen Antworten zu genau einem Vorhaben; der
 * Teamvergleich bleibt im Team. Archivierte Vorhaben kommen gar nicht erst an
 * (`profileVentures`).
 */

export type SnapshotCardKey = "time" | "money" | "decisions" | "collaboration" | "goals" | "limits";

export type SnapshotFact =
  /** Eine Zahl oder ein Betrag, so wie angegeben. */
  | { kind: "figure"; itemId: string; number: number; unit: string }
  | { kind: "money"; itemId: string; amount: number; currency: string }
  /** Die gewaehlte Stufe einer Frage mit geordneten Antworten. */
  | { kind: "scale"; itemId: string; label: string; position: number; of: number }
  /** Eine Wahl ohne Ordnung - als kurzer Satz. `detail` z. B. das Datum bei „ab Datum". */
  | { kind: "statement"; itemId: string; text: string; detail: string | null }
  | { kind: "chips"; itemId: string; chips: string[] }
  | { kind: "quote"; itemId: string; text: string };

export type SnapshotCard = { key: SnapshotCardKey; facts: SnapshotFact[] };

/** Welche Fragen auf welcher Karte stehen - in dieser Reihenfolge. */
export const SNAPSHOT_LAYOUT: readonly { key: SnapshotCardKey; itemIds: readonly string[] }[] = [
  { key: "time", itemIds: ["R01", "R02", "R10"] },
  { key: "money", itemIds: ["R04", "R05", "B01", "B04"] },
  { key: "decisions", itemIds: ["U01", "U04", "U03", "U05", "G01"] },
  { key: "collaboration", itemIds: ["K01", "K03", "K04"] },
  { key: "goals", itemIds: ["S01_top", "S04", "S03"] },
  { key: "limits", itemIds: ["L01"] },
];

export const SNAPSHOT_ITEM_IDS: readonly string[] = SNAPSHOT_LAYOUT.flatMap((card) => card.itemIds);

function factOf(entry: ReadoutEntry): SnapshotFact | null {
  const value = entry.value;
  if (!value) return null;
  switch (value.kind) {
    case "number":
      return { kind: "figure", itemId: entry.itemId, number: value.number, unit: value.unit };
    case "money":
      return { kind: "money", itemId: entry.itemId, amount: value.amount, currency: value.currency };
    case "ordinal":
      return { kind: "scale", itemId: entry.itemId, label: value.label, position: value.position, of: value.of };
    case "choice":
      return { kind: "statement", itemId: entry.itemId, text: value.label, detail: value.text?.trim() || null };
    case "choices":
      return value.labels.length > 0 ? { kind: "chips", itemId: entry.itemId, chips: value.labels } : null;
    case "text":
      return value.text.trim() ? { kind: "quote", itemId: entry.itemId, text: value.text.trim() } : null;
    case "entries": {
      const chips = value.entries.map((e) => e.text.trim()).filter(Boolean);
      return chips.length > 0 ? { kind: "chips", itemId: entry.itemId, chips } : null;
    }
    default:
      // Zeitfenster, Abwaegungen, Personenlisten: zu viel fuer eine Karte -
      // sie stehen in der ausfuehrlichen Auswertung.
      return null;
  }
}

/** Nur Karten mit mindestens einer Antwort; leere Karten entfallen. */
export function buildVentureSnapshot(entries: readonly ReadoutEntry[]): SnapshotCard[] {
  const byItem = new Map(entries.map((entry) => [entry.itemId, entry]));
  return SNAPSHOT_LAYOUT.flatMap(({ key, itemIds }) => {
    const facts = itemIds.flatMap((itemId) => {
      const entry = byItem.get(itemId);
      const fact = entry ? factOf(entry) : null;
      return fact ? [fact] : [];
    });
    return facts.length > 0 ? [{ key, facts }] : [];
  });
}
