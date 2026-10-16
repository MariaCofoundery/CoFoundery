import "server-only";

import type { ConnectMatchResult, ConnectReasonCode, FindMatchResult, FindReasonCode, Side } from "@/lib/matching/v01/types";

/**
 * Präsentationsschicht zwischen Matching Engine v0.1 und Oberfläche (Spec §5, §14, §15).
 *
 * Die Engine rechnet unverändert. Hier wird nur entschieden, was eine Person von
 * einem Ergebnis sehen darf - und alles andere fällt weg:
 *
 *   - Gate-Gründe (eigene wie fremde private Must-haves, Blockierung, Status)
 *     sind immer intern. Ein ausgeschlossenes Paar wird nicht gezeigt und nicht
 *     begründet.
 *   - Scores, Komponenten, Confidence, IDF-Version, Eingabe-Versionen, Rang,
 *     Gleichstandsgruppe und sekundäre Reihenfolge verlassen diese Schicht nie.
 *   - Workstyle ist kein Matching-Reason; der Gesprächskontext bleibt getrennt.
 *   - Nur Reason-Codes mit fester Richtlinie und nur deren erlaubte Parameter;
 *     unbekannte Codes oder unerwartete Werte lassen den Reason ganz entfallen.
 *
 * Texte kommen über Message Keys (find.matchingReasons.*, connect.matchingReasons.*),
 * nie aus der Engine. Noch von keinem Produktpfad eingebunden.
 *
 * Matrix: docs/research/matching-v0.1-explainability-privacy.md
 */

/**
 * Sichtbarkeitsklassen eines Reason-Codes.
 *   both      jede Seite sieht ihn aus eigener Sicht (Engine: `audience` = Betrachter)
 *   searcher  nur die betrachtende Person, weil er ihre eigene Angabe/Bedingung betrifft
 *   candidate nur die vorgeschlagene Person - in v0.1 erzeugt die Engine keinen solchen Code
 *   internal  nur Server/Tests, nie Oberfläche
 */
export type ReasonVisibility = "searcher" | "candidate" | "both" | "internal";

/** Ein Parameter ist entweder ein Enum-Schlüssel (übersetzt über `labelNamespace`) oder ein angezeigter Originalwert. */
type ParamRule = Readonly<{ kind: "label"; labelNamespace: string } | { kind: "text" }>;

type ReasonPolicy = Readonly<{
  visibility: ReasonVisibility;
  params: Readonly<Record<string, ParamRule>>;
}>;

const label = (labelNamespace: string): ParamRule => ({ kind: "label", labelNamespace });
const text: ParamRule = { kind: "text" };

export const FIND_REASON_POLICY: Readonly<Record<FindReasonCode, ReasonPolicy>> = Object.freeze({
  FIND_ROLE_NEED_COVERED: { visibility: "both", params: { role: label("discovery.roles") } },
  FIND_ROLE_NEED_COVERED_REVERSE: { visibility: "both", params: { role: label("discovery.roles") } },
  // Die Engine erzeugt sie nur mit beidseitiger Matching-Freigabe UND Tiefen-Sichtbarkeit des Gegenübers.
  FIND_AREA_OWN_COVERED: { visibility: "both", params: { area: label("capability.areaLabels") } },
  FIND_AREA_CONTRIBUTE: { visibility: "both", params: { area: label("capability.areaLabels") } },
  FIND_SAME_INDUSTRY: { visibility: "both", params: { industry: text } },
  FIND_START_ALIGNED: { visibility: "both", params: { horizon: label("discovery.startHorizons") } },
  FIND_STAGE_COMPLEMENT: {
    visibility: "both",
    params: { stage_a: label("discovery.ventureStages"), stage_b: label("discovery.ventureStages") },
  },
  FIND_DIFF_START: { visibility: "both", params: { a: label("discovery.startHorizons"), b: label("discovery.startHorizons") } },
  FIND_DIFF_COMMITMENT: { visibility: "both", params: { a: label("discovery.commitmentLevels"), b: label("discovery.commitmentLevels") } },
  FIND_DIFF_GOAL: { visibility: "both", params: { a: label("discovery.ventureGoals"), b: label("discovery.ventureGoals") } },
  // Nur, wessen eigene Bedingung offen ist (oder die Paarregel „beide vor Ort“) - die Engine setzt `audience` so.
  FIND_UNKNOWN_LOCATION: { visibility: "searcher", params: {} },
  // Spec §14: Anzeigeregel ohne Schwellenmodell, „bis dahin wird er nicht angezeigt“.
  FIND_LIMITED_EVIDENCE: { visibility: "internal", params: {} },
});

export const CONNECT_REASON_POLICY: Readonly<Record<ConnectReasonCode, ReasonPolicy>> = Object.freeze({
  CONNECT_TOPIC_MATCH: { visibility: "searcher", params: { seek_topic: text, offer_topic: text } },
  CONNECT_TOPIC_VIA_EXPERTISE: { visibility: "searcher", params: { topic: text } },
  // Originalwörter aus dem eigenen Gesuch, in Textreihenfolge - keine Token, keine IDF-Werte.
  CONNECT_TEXT_OVERLAP: { visibility: "searcher", params: { terms: text } },
  CONNECT_SAME_INDUSTRY: { visibility: "searcher", params: { industry: text } },
  CONNECT_SAME_CATEGORY: { visibility: "searcher", params: { category: label("connect.categories") } },
  CONNECT_REMOTE_POSSIBLE: { visibility: "searcher", params: {} },
  CONNECT_UNKNOWN_LOCATION: { visibility: "searcher", params: {} },
  CONNECT_LIMITED_EVIDENCE: { visibility: "internal", params: {} },
});

export type PresentedReason = Readonly<{
  code: string;
  visibility: Exclude<ReasonVisibility, "internal">;
  /** z. B. find.matchingReasons.FIND_ROLE_NEED_COVERED */
  messageKey: string;
  /** Nur die erlaubten Parameter. Enum-Werte als Schlüssel, Texte als Originalwert. */
  data: Readonly<Record<string, string>>;
  /** Parameter -> Namespace, unter dem die Oberfläche den Enum-Schlüssel übersetzt. */
  labels: Readonly<Record<string, string>>;
}>;

/** `visible: false` = das Paar erscheint nicht; es gibt bewusst keinen Grund dazu. */
export type PresentedMatch = Readonly<{ visible: boolean; reasons: readonly PresentedReason[] }>;

const HIDDEN: PresentedMatch = Object.freeze({ visible: false, reasons: Object.freeze([]) });
const ENUM_KEY = /^[a-z0-9_]{1,64}$/;
const MAX_TEXT = 120;

function presentOne(
  code: string,
  params: Readonly<Record<string, unknown>>,
  policy: ReasonPolicy | undefined,
  messageNamespace: string,
): PresentedReason | null {
  if (!policy || policy.visibility === "internal") return null;
  const data: Record<string, string> = {};
  const labels: Record<string, string> = {};
  for (const [name, rule] of Object.entries(policy.params)) {
    const value = params[name];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (rule.kind === "label") {
      if (!ENUM_KEY.test(trimmed)) return null;
      labels[name] = rule.labelNamespace;
    } else if (trimmed.length === 0 || trimmed.length > MAX_TEXT) {
      return null;
    }
    data[name] = trimmed;
  }
  return { code, visibility: policy.visibility, messageKey: `${messageNamespace}.${code}`, data, labels };
}

/**
 * FIND: Was die Person auf Seite `viewer.side` von diesem Paar sieht.
 * Ausgeschlossene Paare: nicht sichtbar, ohne Grund - egal, ob die eigene oder die
 * private Bedingung der Gegenseite, eine Blockierung oder ein Status dahintersteht.
 */
export function presentFindReasons(result: FindMatchResult, viewer: Readonly<{ side: Side }>): PresentedMatch {
  if (result.eligibility.status === "ineligible") return HIDDEN;
  const reasons: PresentedReason[] = [];
  for (const explanation of result.explanations) {
    if (explanation.audience !== viewer.side) continue;
    const presented = presentOne(
      explanation.code,
      explanation.params,
      FIND_REASON_POLICY[explanation.code as FindReasonCode],
      "find.matchingReasons",
    );
    if (presented) reasons.push(presented);
  }
  return { visible: true, reasons };
}

/**
 * CONNECT: gerichtet, Reasons nur für die Person, deren Gesuch bewertet wird.
 * Die anbietende Seite bekommt in v0.1 keine Reasons.
 */
export function presentConnectReasons(
  result: ConnectMatchResult,
  viewer: Readonly<{ role: "seeker" | "offerer" }>,
): PresentedMatch {
  if (result.eligibility.status === "ineligible") return HIDDEN;
  if (viewer.role !== "seeker") return { visible: true, reasons: [] };
  const reasons: PresentedReason[] = [];
  for (const explanation of result.explanations) {
    if (explanation.audience !== "seeker") continue;
    const presented = presentOne(
      explanation.code,
      explanation.params,
      CONNECT_REASON_POLICY[explanation.code as ConnectReasonCode],
      "connect.matchingReasons",
    );
    if (presented) reasons.push(presented);
  }
  return { visible: true, reasons };
}
