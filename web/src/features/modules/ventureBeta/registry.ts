import betaJson from "../../../../docs/venture-alignment-v2-beta1-registry.json";

import { toView } from "@/features/instruments/align/questionnaireData";
import { assertRegistryV22, type RegistryItemV22, type RegistryV22 } from "@/features/instruments/align/registries";
import { VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID } from "@/features/instruments/instruments";
import type { ItemView } from "@/features/instruments/v21/questionnaireDataV21";

/**
 * Die Fragen von Venture Alignment v2 (Beta 1) - `venture-alignment-v2-beta1`.
 *
 * EIGENE REGISTRY, NICHT TEIL VON `REGISTRIES`: `registryOf("venture_alignment")` kennt genau
 * `venture-alignment-v1`. Ein zweites Instrument in derselben Speicherfamilie darf dort nicht
 * auftauchen, sonst liefe es in jeden Leser, der ueber den Scope geht (Seite, Abgabe, Report, Team).
 * Wer die Beta lesen will, ruft diese Datei.
 *
 * KURZE IDs: Die Spalte `alignment_answers.block_id` erlaubt nur `[A-Z][0-9]{2}` (+ Suffix). Die
 * Spezifikations-IDs (ZB01 ...) stehen deshalb als `specId` hier; gespeichert wird `Z01` ...
 */
export const VENTURE_ALIGNMENT_BETA = assertRegistryV22(betaJson as unknown as RegistryV22);

if (VENTURE_ALIGNMENT_BETA.instrumentId !== VENTURE_ALIGNMENT_BETA_INSTRUMENT_ID) {
  throw new Error("venture_alignment_beta_registry_instrument_mismatch");
}

/** Die 19 Core-Items - fuer die Abgabe verlangt (Antwort oder Auslassungsgrund). Spiegelt die DB-Allowlist (`required_block_ids`). */
export const BETA_CORE_ITEM_IDS = [
  "Z01", "Z02", "Z03", "F01", "F02", "O01", "C01", "C02", "C03", "C04",
  "M01", "M02", "M03", "T01", "T02", "E01", "E02", "E03", "N01",
] as const;
/** Die privaten Betragsfelder: speicherbar, aber nie team-sichtbar (spiegelt die DB-Allowlist). */
export const BETA_PRIVATE_BLOCK_IDS = ["M01p", "M02p"] as const;
/** Die Spezifikations-IDs (Pretest Candidate) zu den gespeicherten Block-IDs - nur zur Nachvollziehbarkeit. */
export const BETA_SPEC_IDS: Record<string, string> = {
  Z01: "ZB01", Z02: "ZB02", Z03: "ZB03", F01: "BT01", F02: "BT02", O01: "RO01",
  C01: "ZC01", C02: "ZC02", C03: "ZC03", C04: "ZC04", M01: "GR01", M01p: "GR01P",
  M02: "GR02", M02p: "GR02P", M03: "GR03", T01: "TQ01", T02: "TQ02",
  E01: "EN01", E02: "EN02", E03: "EN03", N01: "KO01",
};

export type BetaCoreItemId = (typeof BETA_CORE_ITEM_IDS)[number];

export function isBetaPrivateBlock(blockId: string): boolean {
  return (BETA_PRIVATE_BLOCK_IDS as readonly string[]).includes(blockId);
}

/** Alle 21 Items in der Reihenfolge der Registry. */
export function betaItems(): RegistryItemV22[] {
  return [...VENTURE_ALIGNMENT_BETA.items].sort((a, b) => a.order - b.order);
}

export function betaCoreItems(): RegistryItemV22[] {
  return betaItems().filter((item) => !isBetaPrivateBlock(item.itemId));
}

export function betaViews(): ItemView[] {
  return betaItems().map((item) => toView(item));
}

export function findBetaItem(itemId: string): RegistryItemV22 | null {
  return VENTURE_ALIGNMENT_BETA.items.find((item) => item.itemId === itemId) ?? null;
}

/**
 * Die acht Bloecke der eigenen Zusammenfassung (= die Abschnitte der Registry).
 * `titleKey` zeigt auf `ventureBeta.blocks.<key>` im Sprachbundle.
 */
export const BETA_BLOCKS = [
  { key: "vision", section: "Zielbild und Prioritäten", itemIds: ["Z01", "Z02", "Z03"] },
  { key: "ownership", section: "Beteiligung und Finanzierung", itemIds: ["F01", "F02"] },
  { key: "role", section: "Rolle", itemIds: ["O01"] },
  { key: "time", section: "Zeit und Commitment", itemIds: ["C01", "C02", "C03", "C04"] },
  { key: "money", section: "Geld und Risiko", itemIds: ["M01", "M02", "M03"] },
  { key: "pace", section: "Tempo und Qualität", itemIds: ["T01", "T02"] },
  { key: "deciding", section: "Entscheiden", itemIds: ["E01", "E02", "E03"] },
  { key: "communication", section: "Kommunikation", itemIds: ["N01"] },
] as const;

/**
 * Die fuenf Gruppen des Team-Reports. Nicht 19 gleichartige Karten, sondern Gespraechsthemen.
 */
export const BETA_REPORT_GROUPS = [
  { key: "direction", itemIds: ["Z01", "Z02", "Z03", "F01", "F02"] },
  { key: "role", itemIds: ["O01", "C01", "C02", "C03", "C04"] },
  { key: "money", itemIds: ["M01", "M02", "M03"] },
  { key: "pace", itemIds: ["T01", "T02"] },
  { key: "deciding", itemIds: ["E01", "E02", "E03", "N01"] },
] as const;
