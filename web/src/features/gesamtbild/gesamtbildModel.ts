/**
 * Das Gesamtbild „Ich, Du, Unser Startup“ (Entwurf vom 12.11.2026, freigegeben).
 *
 * Diese Datei ist rein und enthält die Regeln, die sich prüfen lassen. Sie kennt keine Datenbank.
 *
 * DIE DREI KAPITEL SIND DREI EBENEN MIT DREI SICHTBARKEITEN:
 *   Ich            nur die lesende Person.
 *   Du             was die anderen Mitglieder fuer GENAU dieses Team ausdruecklich geteilt haben.
 *   Unser Startup  das ganze Team (Teamkarte aus geteilten Faehigkeiten, vereinbarte Themen).
 *
 * KEINE ZAHL UND KEIN URTEIL: Gemeinsamkeiten und Unterschiede sind Gespraechsstoff, nie Passung.
 * Wer nichts geteilt hat, erscheint nur als „hat das nicht geteilt“ - ohne Inhalt, ohne Vermutung.
 */

import type { OwnershipWish } from "@/features/capability/capabilityTypes";

export type CapabilityGroupKey = "own" | "grow" | "handOff";

const GROUP_OF_WISH: Partial<Record<OwnershipWish, CapabilityGroupKey>> = {
  own: "own",
  grow_into: "grow",
  contribute: "handOff",
  prefer_other: "handOff",
  prefer_external: "handOff",
};

/**
 * Die eigenen Faehigkeiten nach dem, was die Person damit vorhat. `application_level` (wie tief) bleibt
 * ausser Acht - es ist eine eigene Achse, und nur `own` zaehlt als Verantwortung. `unclear` und
 * fehlende Angaben erscheinen nicht: Ohne Entscheidung gibt es keine Aussage.
 */
export function capabilityGroups(entries: { areaId: string; ownershipWish: OwnershipWish | null }[]) {
  const groups: Record<CapabilityGroupKey, string[]> = { own: [], grow: [], handOff: [] };
  for (const entry of entries) {
    const group = entry.ownershipWish ? GROUP_OF_WISH[entry.ownershipWish] : undefined;
    if (group && !groups[group].includes(entry.areaId)) groups[group].push(entry.areaId);
  }
  return groups;
}

export const TALKING_POINTS_MAX = 4;

export type TalkingPoint =
  | { kind: "workstyle"; area: string; question: string | null }
  | { kind: "freeField"; familyId: string };

/**
 * „Worueber ihr sprechen koennt“: zuerst die Bereiche der Arbeitsweise, in denen ihr gegensaetzlich oder
 * nuanciert antwortet, dann freie Felder der Teamkarte. Hoechstens vier; die Reihenfolge ist eine
 * Reihenfolge der Quellen, keine Rangfolge der Wichtigkeit.
 */
export function talkingPoints(
  findings: { area: string; kind: "insufficient" | "similar" | "nuance" | "opposite"; question: string | null }[],
  freeFamilies: string[],
): TalkingPoint[] {
  const different = [
    ...findings.filter((finding) => finding.kind === "opposite"),
    ...findings.filter((finding) => finding.kind === "nuance"),
  ].map((finding): TalkingPoint => ({ kind: "workstyle", area: finding.area, question: finding.question }));
  const free = freeFamilies.map((familyId): TalkingPoint => ({ kind: "freeField", familyId }));
  return [...different, ...free].slice(0, TALKING_POINTS_MAX);
}

export type SharedPart = "workstyle" | "capability" | "strengths";

/**
 * Was ein anderes Mitglied geteilt hat. Stärken und Richtung sind EINE Freigabe (`strengths_direction`),
 * deshalb gibt es hier keinen getrennten Teil „Richtung“ - „Stärken geteilt, Richtung nicht“ kann es nicht geben.
 */
export function sharedParts(input: { workstyle: boolean; capability: boolean; strengths: boolean }): SharedPart[] {
  const parts: SharedPart[] = [];
  if (input.workstyle) parts.push("workstyle");
  if (input.capability) parts.push("capability");
  if (input.strengths) parts.push("strengths");
  return parts;
}

/** Die Zeitangabe fuer die Titelseite: lokales Datum in Berlin, nie die Serverzeit. */
export function berlinDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}
