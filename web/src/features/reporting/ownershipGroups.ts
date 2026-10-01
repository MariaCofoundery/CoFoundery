import type { CapabilityArea, CapabilityEntry } from "@/features/capability/capabilityTypes";

/**
 * Was jemand verantworten will — nach seiner eigenen Antwort gruppiert.
 *
 * ---------------------------------------------------------------------------
 * KÖNNEN UND WOLLEN SIND ZWEI VERSCHIEDENE DINGE
 * ---------------------------------------------------------------------------
 *
 * Das ist der tragende Satz des Capability-Modells, und diese Gruppierung ist
 * die Stelle, an der man ihn sieht. Eine hohe Erfahrungsstufe zusammen mit
 * „lieber jemand anders" ist ein gültiger Zustand und kein Widerspruch —
 * deshalb wird die Stufe hier **nicht** verrechnet. Sie kommt in dieser Datei
 * nicht einmal vor.
 *
 * ---------------------------------------------------------------------------
 * VIER GRUPPEN, KEINE FÜNF BEFUNDE
 * ---------------------------------------------------------------------------
 *
 * Daneben liegt `capabilityReadout.ts` mit fünf Befunden, bei denen der erste
 * zutreffende gewinnt — „kann es, gibt es ab", „wächst hinein" und so weiter.
 * Das ist eine Deutung und an ihrem Ort richtig.
 *
 * Hier wird nicht gedeutet. Jede Gruppe ist genau eine Antwort aus dem
 * Formular, zurückübersetzt. Wer `own` angekreuzt hat, steht unter `own` —
 * unabhängig davon, wie weit er dort gekommen ist.
 *
 * ---------------------------------------------------------------------------
 * `grow_into` GEHÖRT NICHT HIERHER
 * ---------------------------------------------------------------------------
 *
 * „Da will ich hineinwachsen" ist eine Absicht und noch keine übernommene
 * Verantwortung. Es hat einen eigenen Abschnitt auf der Seite, und dort liest
 * es sich als Vorhaben statt als Einschränkung.
 */

export const OWNERSHIP_GROUP_KEYS = ["own", "contribute", "handsOver", "open"] as const;
export type OwnershipGroupKey = (typeof OWNERSHIP_GROUP_KEYS)[number];

export type OwnershipGroup = {
  key: OwnershipGroupKey;
  areaIds: string[];
};

/** Welche Antwort in welche Gruppe fällt. */
const GROUP_OF_WISH: Record<string, OwnershipGroupKey> = {
  own: "own",
  contribute: "contribute",
  prefer_other: "handsOver",
  prefer_external: "handsOver",
  unclear: "open",
};

/**
 * Antworten, die hier NICHT vorkommen - und zwar nicht aus Versehen.
 *
 * Eine eigene Liste, weil der Unterschied zum unbekannten Wert wichtig ist:
 * Ein Wunsch, den diese Datei nicht kennt, zählt als „noch offen" - lieber
 * falsch einsortiert als verschwunden. `grow_into` dagegen ist bekannt und
 * gehört woandershin; es unter „noch offen" zu führen, wäre eine falsche
 * Auskunft über eine Antwort, die jemand gegeben hat.
 */
const GEHOERT_WOANDERSHIN: readonly string[] = ["grow_into"];

/**
 * Die eingetragenen Bereiche, nach Verantwortungswunsch.
 *
 * Leere Gruppen kommen nicht vor: Eine Überschrift ohne Inhalt behauptet eine
 * Leerstelle, und „du hast nichts, das du abgeben willst" ist keine Auskunft,
 * die jemand gegeben hat.
 *
 * Ohne Wunsch (`null`) zählt als „noch offen" — dieselbe Gruppe wie `unclear`.
 * Beides heißt: Dazu ist die zweite Frage noch nicht beantwortet.
 */
export function buildOwnershipGroups(
  entries: readonly CapabilityEntry[],
  areas: readonly CapabilityArea[]
): OwnershipGroup[] {
  // Die Reihenfolge des Vokabulars, nicht die des Eintragens - sonst stehen
  // die Bereiche in der Folge, in der jemand sie angeklickt hat, und das
  // liest sich wie eine Rangfolge.
  const order = new Map(areas.map((area) => [area.area_id, area.sort_order]));

  const byGroup = new Map<OwnershipGroupKey, string[]>(
    OWNERSHIP_GROUP_KEYS.map((key) => [key, []])
  );

  for (const entry of entries) {
    if (entry.ownership_wish && GEHOERT_WOANDERSHIN.includes(entry.ownership_wish)) continue;

    const group = entry.ownership_wish ? GROUP_OF_WISH[entry.ownership_wish] : "open";
    // Ein unbekannter Wert - etwa aus einer späteren Fassung des Formulars -
    // verschwindet nicht still, er zählt als offen.
    byGroup.get(group ?? "open")?.push(entry.area_id);
  }

  return OWNERSHIP_GROUP_KEYS.map((key) => ({
    key,
    areaIds: (byGroup.get(key) ?? [])
      .slice()
      .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)),
  })).filter((group) => group.areaIds.length > 0);
}
