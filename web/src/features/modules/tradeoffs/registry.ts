import tradeoffsJson from "../../../../docs/venture-tradeoffs-registry-v1.json";

import { toView } from "@/features/instruments/align/questionnaireData";
import {
  assertRegistryV22,
  type RegistryItemV22,
  type RegistryV22,
} from "@/features/instruments/align/registries";
import { VENTURE_TRADEOFFS_INSTRUMENT_ID } from "@/features/instruments/instruments";
import type { ItemView } from "@/features/instruments/v21/questionnaireDataV21";

/**
 * Die Fragen von „Werte & Zielkonflikte" (`venture-tradeoffs-v1`).
 *
 * EIGENE REGISTRY, NICHT TEIL VON `REGISTRIES`: `registryOf(scope)` kennt zu
 * `venture_alignment` genau eine Fassung - `venture-alignment-v1`. Ein zweites
 * Instrument in derselben Familie darf dort nicht auftauchen, sonst liefe es in
 * jeden Leser, der ueber den Scope geht (Seite, Abgabe, Report). Hier steht es
 * allein; wer es lesen will, ruft diese Datei.
 *
 * Die vier Situationen sind die bestehenden W03-W06 - Wortlaut, Anliegen, Wege
 * und Stufen unveraendert.
 */
export const VENTURE_TRADEOFFS = assertRegistryV22(tradeoffsJson as unknown as RegistryV22);

/** Die vier Situationen, in der Reihenfolge, in der sie vorgelegt werden. */
export const TRADEOFF_ITEM_IDS = ["W03", "W04", "W05", "W06"] as const;
export type TradeoffItemId = (typeof TRADEOFF_ITEM_IDS)[number];

if (VENTURE_TRADEOFFS.instrumentId !== VENTURE_TRADEOFFS_INSTRUMENT_ID) {
  throw new Error("venture_tradeoffs_registry_instrument_mismatch");
}

export function tradeoffItems(): RegistryItemV22[] {
  return [...VENTURE_TRADEOFFS.items].sort((a, b) => a.order - b.order);
}

export function tradeoffViews(): ItemView[] {
  return tradeoffItems().map((item) => toView(item));
}

export function findTradeoffItem(itemId: string): RegistryItemV22 | null {
  return VENTURE_TRADEOFFS.items.find((item) => item.itemId === itemId) ?? null;
}
