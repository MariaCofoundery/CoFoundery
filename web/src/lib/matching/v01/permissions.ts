/**
 * Datenschutz-Schicht (Spec §5): exists / visible / usable_for_matching getrennt.
 *
 *   A  existiert    – die Daten sind in der Eingabe
 *   B  sichtbar     – darf das Gegenüber es sehen? Wirkt NUR auf Reasons.
 *   C  verwendbar   – darf es ins Matching? Für Capabilities nur mit ausdrücklicher Freigabe.
 *
 * Keine Frage folgt aus einer anderen.
 */
import type { CapabilityEntryInput, FindPersonInput, Side } from "@/lib/matching/v01/types";

/**
 * Frage C: Capability-Einträge, die das Matching verwenden darf.
 * Ohne Freigabe gelten sie als nicht vorhanden (Spec §5): cap_cover UNKNOWN, Confidence-Feld fehlt,
 * ein requiredCapabilityAreasAny der Gegenseite ergibt `uncertain`.
 */
export function matchableCapabilities(person: FindPersonInput): readonly CapabilityEntryInput[] {
  return person.capabilities.matchingAllowed ? person.capabilities.entries : [];
}

/**
 * Frage B für Capability-Reasons: Bereich UND Erfahrung/Wunsch dürfen gezeigt werden.
 * Ohne diese Sichtbarkeit entfällt der Reason ganz – kein generischer Ersatz (Spec §5).
 */
export function canExplainCapabilityDepth(owner: FindPersonInput): boolean {
  return owner.capabilities.matchingAllowed && owner.capabilities.visibleToCounterpart === "areas_and_depth";
}

/** Ein Gate-Grund aus einem privaten Must-have ist nur für die Person sichtbar, die es gesetzt hat. */
export function gateReasonVisibleTo(conditionOwner: Side | "pair"): readonly Side[] {
  if (conditionOwner === "pair") return ["a", "b"];
  return [conditionOwner];
}

export function other(side: Side): Side {
  return side === "a" ? "b" : "a";
}
