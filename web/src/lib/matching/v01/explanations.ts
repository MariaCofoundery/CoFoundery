/**
 * Explainability (Spec §15). Reasons entstehen nur aus konkreten Eingabefeldern und tragen
 * Originalwerte (RAW VALUE). Fehlt die Grundlage, entfällt der Reason. Lokalisierbar: Code + Parameter,
 * die Texte stehen später in den Sprachbündeln.
 *
 * DATENSCHUTZ:
 *   - Private Must-haves erscheinen nie als Reason-Inhalt (sie wirken nur im Gate).
 *   - Capability-Reasons nur, wenn das Gegenüber Bereich und Tiefe sehen darf; sonst gar keiner.
 *   - Familien-Teilgutschrift hat keinen Reason (Spec §8.1).
 *   - FIND_UNKNOWN_LOCATION sieht nur, wessen Bedingung offen ist (sonst verriete er ein privates Kriterium).
 *   - *_LIMITED_EVIDENCE erzeugt die Engine nicht (Anzeigeregel außerhalb des Matchings, Spec §14).
 */
import { CONNECT_CONSTANTS, FIND_CONSTANTS, GOAL_GROUP, STAGES_WITH_IDEA, START_HORIZON_ORDER } from "@/lib/matching/v01/version";
import { generic2Tokens, normalizeTerms, sameTerm, tokenMatch } from "@/lib/matching/v01/normalization";
import { handoverAreas } from "@/lib/matching/v01/findRelevance";
import { canExplainCapabilityDepth, matchableCapabilities } from "@/lib/matching/v01/permissions";
import type {
  ConnectListingInput,
  ConnectOfferInput,
  ConnectReasonCode,
  Explanation,
  FindEligibility,
  FindPersonInput,
  FindReasonCode,
  GateStatus,
  Side,
} from "@/lib/matching/v01/types";

type FindExplanation = Explanation<FindReasonCode, Side>;
type ConnectExplanation = Explanation<ConnectReasonCode, "seeker">;

const DEPTH = FIND_CONSTANTS.coverage.depthLevel;

function viewerReasons(viewer: FindPersonInput, counterpart: FindPersonInput, side: Side, gate: FindEligibility): FindExplanation[] {
  const out: FindExplanation[] = [];
  const push = (code: FindReasonCode, params: Record<string, string>) => out.push({ code, params, audience: side });

  for (const role of [...new Set(viewer.seekingRoles)].filter((r) => counterpart.ownRoles.includes(r))) {
    push("FIND_ROLE_NEED_COVERED", { role });
  }
  for (const role of [...new Set(counterpart.seekingRoles)].filter((r) => viewer.ownRoles.includes(r))) {
    push("FIND_ROLE_NEED_COVERED_REVERSE", { role });
  }

  // Capability: nur dieselben Bereiche, nur wenn beide freigegeben haben und das Gegenüber die Tiefe zeigen darf.
  if (viewer.capabilities.matchingAllowed && canExplainCapabilityDepth(counterpart)) {
    const offered = matchableCapabilities(counterpart);
    for (const area of handoverAreas(matchableCapabilities(viewer))) {
      const entries = offered.filter((e) => e.areaId === area);
      if (entries.some((e) => e.ownershipWish === "own" && (e.applicationLevel ?? 0) >= DEPTH)) {
        push("FIND_AREA_OWN_COVERED", { area });
      } else if (entries.some((e) => e.ownershipWish === "contribute" && (e.applicationLevel ?? 0) >= DEPTH)) {
        push("FIND_AREA_CONTRIBUTE", { area });
      }
    }
  }

  const theirs = normalizeTerms(counterpart.industries, "industry");
  for (const mine of normalizeTerms(viewer.industries, "industry")) {
    if (theirs.some((t) => sameTerm(mine, t))) push("FIND_SAME_INDUSTRY", { industry: mine.raw });
  }

  const hv = viewer.startHorizon;
  const hc = counterpart.startHorizon;
  if (hv && hc) {
    if (hv === hc) push("FIND_START_ALIGNED", { horizon: hv });
    const i = (START_HORIZON_ORDER as readonly string[]).indexOf(hv);
    const j = (START_HORIZON_ORDER as readonly string[]).indexOf(hc);
    if (i >= 0 && j >= 0 && Math.abs(i - j) >= 2) push("FIND_DIFF_START", { a: hv, b: hc });
  }

  const sv = viewer.ventureStage;
  const sc = counterpart.ventureStage;
  if (sv && sc && sv !== "undecided" && sc !== "undecided") {
    const ideaV = (STAGES_WITH_IDEA as readonly string[]).includes(sv);
    const ideaC = (STAGES_WITH_IDEA as readonly string[]).includes(sc);
    if (ideaV !== ideaC) push("FIND_STAGE_COMPLEMENT", { stage_a: sv, stage_b: sc });
  }

  if (viewer.commitmentLevel && counterpart.commitmentLevel && viewer.commitmentLevel !== counterpart.commitmentLevel) {
    push("FIND_DIFF_COMMITMENT", { a: viewer.commitmentLevel, b: counterpart.commitmentLevel });
  }

  const gv = viewer.ventureGoal && viewer.ventureGoal !== "undecided" ? GOAL_GROUP[viewer.ventureGoal] : undefined;
  const gc = counterpart.ventureGoal && counterpart.ventureGoal !== "undecided" ? GOAL_GROUP[counterpart.ventureGoal] : undefined;
  if (gv !== undefined && gc !== undefined && gv !== gc) {
    push("FIND_DIFF_GOAL", { a: viewer.ventureGoal as string, b: counterpart.ventureGoal as string });
  }

  const locationOpen = gate.reasons.some(
    (r) =>
      r.kind === "unknown" &&
      r.visibleTo.includes(side) &&
      (r.code === "GATE_LOCATION" || r.code === "GATE_REMOTE_MODE" || r.code === "GATE_BOTH_ONSITE_DIFFERENT_PLACE"),
  );
  if (locationOpen) push("FIND_UNKNOWN_LOCATION", {});
  return out;
}

/** Reasons für beide Personen. Für ausgeschlossene Paare gibt es keine (das Paar erscheint nicht). */
export function findExplanations(a: FindPersonInput, b: FindPersonInput, gate: FindEligibility): FindExplanation[] {
  if (gate.status === "ineligible") return [];
  return [...viewerReasons(a, b, "a", gate), ...viewerReasons(b, a, "b", gate)];
}

// ---------------------------------------------------------------------------
// CONNECT
// ---------------------------------------------------------------------------
/** Originalwörter aus dem Gesuch, deren Token im Angebot gefunden wurden (max. 3, deterministisch). */
function matchedRawWords(seek: ConnectListingInput, haveTokens: readonly string[]): string[] {
  const words: string[] = [];
  for (const text of [seek.title, seek.summary, ...seek.topics]) {
    for (const word of (text ?? "").split(/\s+/)) {
      const clean = word.replace(/^[^0-9A-Za-zÀ-ÖØ-öø-ÿ]+|[^0-9A-Za-zÀ-ÖØ-öø-ÿ]+$/g, "");
      if (!clean || words.includes(clean)) continue;
      if (generic2Tokens(clean).some((t) => t.length >= 3 && haveTokens.some((h) => tokenMatch(t, h)))) words.push(clean);
    }
  }
  return words.slice(0, 3);
}

export function connectExplanations(
  seek: ConnectListingInput,
  offer: ConnectOfferInput,
  status: GateStatus,
  components: { text: number },
  haveTokens: readonly string[],
): ConnectExplanation[] {
  if (status === "ineligible") return [];
  const out: ConnectExplanation[] = [];
  const push = (code: ConnectReasonCode, params: Record<string, string>) => out.push({ code, params, audience: "seeker" });

  const offerTopics = normalizeTerms(offer.listing.topics, "topic");
  const expertise = normalizeTerms(offer.owner.expertise, "topic");
  for (const t of normalizeTerms(seek.topics, "topic")) {
    const hit = offerTopics.find((o) => sameTerm(t, o));
    if (hit) {
      push("CONNECT_TOPIC_MATCH", { seek_topic: t.raw, offer_topic: hit.raw });
      continue;
    }
    const viaExpertise = expertise.find((e) => sameTerm(t, e));
    if (viaExpertise) push("CONNECT_TOPIC_VIA_EXPERTISE", { topic: viaExpertise.raw });
  }
  if (components.text >= CONNECT_CONSTANTS.textOverlapReasonMin) {
    const words = matchedRawWords(seek, haveTokens);
    if (words.length > 0) push("CONNECT_TEXT_OVERLAP", { terms: words.join(", ") });
  }
  const offerIndustries = normalizeTerms(offer.listing.industries, "industry");
  const sharedIndustry = normalizeTerms(seek.industries, "industry").find((s) => offerIndustries.some((o) => sameTerm(s, o)));
  if (sharedIndustry) push("CONNECT_SAME_INDUSTRY", { industry: sharedIndustry.raw });
  if (seek.category === offer.listing.category) push("CONNECT_SAME_CATEGORY", { category: seek.category });
  if (offer.listing.remoteMode === "remote" || offer.listing.remoteMode === "flexible") push("CONNECT_REMOTE_POSSIBLE", {});
  if (status === "uncertain") push("CONNECT_UNKNOWN_LOCATION", {});
  return out;
}
