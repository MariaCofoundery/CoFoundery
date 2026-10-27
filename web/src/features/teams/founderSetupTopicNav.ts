import {
  FOUNDER_SETUP_PHASE_KEYS,
  getFounderSetupCatalogItem,
  type FounderSetupItemKey,
  type FounderSetupPhaseKey,
} from "@/features/teams/founderSetupCatalog";
import type { FounderSetupItem, FounderSetupStage } from "@/features/teams/founderSetupModel";

/**
 * Die Themenleiste und das Weiterblaettern auf der Themenseite.
 *
 * Reine Sicht auf das, was das Setup schon weiss: keine neue Angabe, keine
 * Rangfolge. Die Reihenfolge ist die der Seite (Phase, dann Katalog).
 */
export type FounderSetupRailState = "open" | "discussing" | "waiting_for_you" | "awaiting_others" | "settled";

export type FounderSetupRailEntry = { key: FounderSetupItemKey; state: FounderSetupRailState };
export type FounderSetupRailGroup = { phase: FounderSetupPhaseKey; entries: FounderSetupRailEntry[] };

/**
 * "Wartet auf dich" ist die Stufe "Bestaetigung offen", wenn DEINE Zustimmung
 * zum offenen Vorschlag fehlt. Hast du schon bestaetigt, wartet es auf die
 * anderen - das ist fuer dich nichts mehr zu tun.
 */
export function founderSetupRailState(item: FounderSetupItem, userId: string): FounderSetupRailState {
  const stage: FounderSetupStage = item.stage;
  if (stage === "awaiting_confirmation") {
    const confirmedByMe = item.pendingRevision?.confirmations.some((entry) => entry.userId === userId) ?? false;
    return confirmedByMe ? "awaiting_others" : "waiting_for_you";
  }
  return stage;
}

export function buildFounderSetupRail(items: readonly FounderSetupItem[], userId: string): FounderSetupRailGroup[] {
  return FOUNDER_SETUP_PHASE_KEYS.map((phase) => ({
    phase,
    entries: items
      .filter((item) => getFounderSetupCatalogItem(item.key)?.phase === phase)
      .map((item) => ({ key: item.key, state: founderSetupRailState(item, userId) })),
  })).filter((group) => group.entries.length > 0);
}

export function founderSetupTopicPosition(groups: readonly FounderSetupRailGroup[], key: FounderSetupItemKey) {
  const order = groups.flatMap((group) => group.entries.map((entry) => entry.key));
  const index = order.indexOf(key);
  return {
    index: index + 1,
    total: order.length,
    previous: index > 0 ? order[index - 1] : null,
    next: index >= 0 && index < order.length - 1 ? order[index + 1] : null,
  };
}
