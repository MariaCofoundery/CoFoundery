import { answerableOf } from "@/features/instruments/align/questionnaireData";
import { VENTURE_ALIGNMENT, type RegistryItemV22 } from "@/features/instruments/align/registries";
import { findBetaItem } from "@/features/modules/ventureBeta/registry";

/**
 * Uebernahme aus `venture-alignment-v1` - nur fuer WIRKLICH identische Items.
 *
 * Identisch heisst: Wortlaut, Hinweis, Optionen (Text und Eigenschaften, in dieser Reihenfolge),
 * Format, Einheit, Obergrenze UND die angebotenen Auslassungsgruende. Jede Abweichung - auch eine
 * zusaetzliche exklusive Option (C03, E03) oder ein neues Limit (O01) - nimmt dem Item die
 * Uebernahmefaehigkeit. Produktqualitaet geht vor Uebernahmefaehigkeit: Es wird kein v2-Item
 * schlechter gebaut, damit es uebernommen werden kann.
 *
 * Die Pruefung laeuft beim Laden und steht im Test; ein Item, das sie nicht besteht, wird nie
 * angeboten. Uebernommen wird nie automatisch, sondern nur auf ausdrueckliche Aktion - als
 * editierbarer Ausgangspunkt. Die Beta wird neu bestaetigt und abgegeben.
 */
export const TAKEOVER_PAIRS: readonly (readonly [betaId: string, v1Id: string])[] = [
  ["E01", "U01"],
  ["E02", "G01"],
  ["C01", "R01"],
  ["C02", "R02"],
  ["C04", "R09"],
  ["F02", "S03"],
];

const suffix = (optionId: string) => optionId.replace(/^[A-Z]\d+[a-z]?_o/, "");

export function itemsAreIdentical(beta: RegistryItemV22, v1: RegistryItemV22): boolean {
  const a = answerableOf(beta);
  const b = answerableOf(v1);
  const optionKey = (item: RegistryItemV22) =>
    JSON.stringify(
      item.options.map((o) => [suffix(o.optionId), o.label, o.requiresText, o.exclusive, o.requiresDate ?? false])
    );
  return (
    beta.prompt === v1.prompt &&
    beta.hint === v1.hint &&
    beta.answerFormat === v1.answerFormat &&
    (beta.unit ?? null) === (v1.unit ?? null) &&
    (beta.conditionHint ?? null) === (v1.conditionHint ?? null) &&
    (a.maxChoices ?? null) === (b.maxChoices ?? null) &&
    optionKey(beta) === optionKey(v1) &&
    JSON.stringify(beta.missing) === JSON.stringify(v1.missing)
  );
}

/** Die Paare, die die Identitaetspruefung bestehen. */
export const TAKEOVER_ELIGIBLE: readonly (readonly [string, string])[] = TAKEOVER_PAIRS.filter(([betaId, v1Id]) => {
  const beta = findBetaItem(betaId);
  const v1 = VENTURE_ALIGNMENT.items.find((item) => item.itemId === v1Id);
  return Boolean(beta && v1 && itemsAreIdentical(beta, v1));
});

export function takeoverSourceOf(betaId: string): string | null {
  return TAKEOVER_ELIGIBLE.find(([id]) => id === betaId)?.[1] ?? null;
}

/**
 * Eine v1-Antwort in die Beta-IDs uebersetzen: nur die Option-Kennungen aendern sich (U01_o3 -> E01_o3).
 * Alles andere (Datum, Text, Zahl, Einheit) bleibt wie gespeichert.
 */
export function translateV1Value(
  betaId: string,
  value: Record<string, unknown> | null
): Record<string, unknown> | null {
  const v1Id = takeoverSourceOf(betaId);
  if (!v1Id || value === null) return value;
  return JSON.parse(JSON.stringify(value).replace(new RegExp(`"${v1Id}_o(\\d+)"`, "g"), `"${betaId}_o$1"`));
}
