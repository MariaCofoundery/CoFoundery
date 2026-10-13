/**
 * FIND – PH1-Richtungsrelevanz und Gegenseitigkeit (Spec §8, §9). Exakte Portierung von
 * matching_models_v01.find_components / Person.coverage und matching_models_v03.directional_ph1.
 *
 *   role_cover(X→Y) = |seeking(X) ∩ own(Y)| / |seeking(X)|                    (UNKNOWN ohne gesuchte Rollen)
 *   cap_cover(X→Y)  = Mittel über abzugebende Bereiche von X der BESTEN Abdeckung durch Y
 *   need            = Mittel der bekannten Teile; beide UNKNOWN -> 0
 *   mod             = Mittel der bekannten Teile aus {context, intent}; beide UNKNOWN -> 0,5
 *   rel(X→Y)        = need × (0,5 + 0,5 × mod)
 *   mutuality       = 0,6 × min + 0,4 × mittel
 *
 * NUR ownership_wish === "own" ist Ownership. grow_into und contribute sind es nicht.
 * Ort, Remote, Stunden, Commitment, Expertise-Ähnlichkeit, Workstyle und Confidence gehen nicht ein.
 */
import { countCovered, normalizeTerms } from "@/lib/matching/v01/normalization";
import { matchableCapabilities } from "@/lib/matching/v01/permissions";
import type { CapabilityEntryInput, DirectionalComponents, FamilyOfArea, FindPersonInput, Modulator } from "@/lib/matching/v01/types";
import {
  FIND_CONSTANTS,
  GOAL_GROUP,
  SEARCH_INTENT_ORDER,
  STAGES_WITH_IDEA,
  START_HORIZON_ORDER,
} from "@/lib/matching/v01/version";

const C = FIND_CONSTANTS;

function meanOrNull(values: ReadonlyArray<number | null>): number | null {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return null;
  let sum = 0;
  for (const v of known) sum += v;
  return sum / known.length;
}

/** Wert EINES Eintrags für Bereich `area` – Erfahrung und Verantwortungswunsch getrennt bewertet. */
export function entryValue(entry: CapabilityEntryInput): number {
  const level = entry.applicationLevel ?? 0;
  const wish = entry.ownershipWish;
  if (wish === "own" && level >= C.coverage.depthLevel) return C.coverage.ownLevelGe3;
  if (wish === "contribute" && level >= C.coverage.depthLevel) return C.coverage.contributeLevelGe3;
  if (wish === "own") return C.coverage.ownLevelLt3OrUnknown;
  if ((wish === "contribute" || wish === "unclear" || wish === null) && level >= C.coverage.depthLevel) {
    return C.coverage.contributeUnclearOrEmptyLevelGe3;
  }
  return C.coverage.otherwise; // grow_into, prefer_other, prefer_external, sonst: deckt nicht ab
}

/** Gleiche Familie, nicht derselbe Bereich, Familie bekannt und nicht working_style/other. */
function sameFamily(entryArea: string, area: string, familyOf: FamilyOfArea): boolean {
  const family = familyOf[area];
  return (
    entryArea !== area &&
    family !== undefined &&
    familyOf[entryArea] === family &&
    !(C.familyExcluded as readonly string[]).includes(family)
  );
}

/** Beste EINZELNE Abdeckung eines Bereichs (keine Summe, Capability-Breite bringt nichts). */
export function capabilityCoverage(entries: readonly CapabilityEntryInput[], area: string, familyOf: FamilyOfArea): number {
  let best = 0;
  for (const e of entries) {
    const same = e.areaId === area;
    const related = sameFamily(e.areaId, area, familyOf);
    if (!same && !related) continue;
    const v = related ? entryValue(e) * C.coverage.sameFamilyFactor : entryValue(e);
    if (v > best) best = v;
  }
  return best;
}

/** Bereiche, die X abgeben will (prefer_other / prefer_external). Sortiert für deterministische Summen. */
export function handoverAreas(entries: readonly CapabilityEntryInput[]): string[] {
  const out = new Set<string>();
  for (const e of entries) if (e.ownershipWish !== null && (C.handoverWishes as readonly string[]).includes(e.ownershipWish)) out.add(e.areaId);
  return [...out].sort();
}

export function roleCover(x: FindPersonInput, y: FindPersonInput): number | null {
  if (x.seekingRoles.length === 0) return null;
  const hit = new Set(x.seekingRoles.filter((r) => y.ownRoles.includes(r)));
  return hit.size / x.seekingRoles.length;
}

export function capCover(x: FindPersonInput, y: FindPersonInput, familyOf: FamilyOfArea): number | null {
  const handover = handoverAreas(matchableCapabilities(x));
  const offer = matchableCapabilities(y);
  if (handover.length === 0 || offer.length === 0) return null;
  let sum = 0;
  for (const area of handover) sum += capabilityCoverage(offer, area, familyOf);
  return sum / handover.length;
}

export function directionalComponents(x: FindPersonInput, y: FindPersonInput, familyOf: FamilyOfArea): DirectionalComponents {
  const rc = roleCover(x, y);
  const cc = capCover(x, y, familyOf);
  return { roleCover: rc, capCover: cc, need: meanOrNull([rc, cc]) ?? 0 };
}

function distance(order: readonly string[], a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const i = order.indexOf(a);
  const j = order.indexOf(b);
  return i < 0 || j < 0 ? null : Math.abs(i - j);
}

function ventureStagePart(a: string | null, b: string | null): number | null {
  if (!a || !b || a === "undecided" || b === "undecided") return null;
  if ((a === "already_building" && b === "already_building") || (a === "no_idea_open_to_join" && b === "no_idea_open_to_join")) {
    return C.stage.bothSame;
  }
  const ideaA = (STAGES_WITH_IDEA as readonly string[]).includes(a);
  const ideaB = (STAGES_WITH_IDEA as readonly string[]).includes(b);
  return ideaA !== ideaB ? C.stage.oneWithIdea : C.stage.otherwise;
}

/** Modulator – symmetrisch für das Paar. */
export function pairModulator(a: FindPersonInput, b: FindPersonInput): Modulator {
  const ia = normalizeTerms(a.industries, "industry");
  const ib = normalizeTerms(b.industries, "industry");
  const context = ia.length === 0 || ib.length === 0 ? null : countCovered(ia, ib) > 0 ? 1 : 0;

  const di = distance(SEARCH_INTENT_ORDER, a.searchIntent, b.searchIntent);
  const dh = distance(START_HORIZON_ORDER, a.startHorizon, b.startHorizon);
  const ga = a.ventureGoal && a.ventureGoal !== "undecided" ? GOAL_GROUP[a.ventureGoal] : undefined;
  const gb = b.ventureGoal && b.ventureGoal !== "undecided" ? GOAL_GROUP[b.ventureGoal] : undefined;
  const intentParts = {
    searchIntent: di === null ? null : C.searchIntentDistance[di],
    startHorizon: dh === null ? null : C.startHorizonDistance[dh],
    ventureGoal: ga === undefined || gb === undefined ? null : C.goalGroupDistance[Math.abs(ga - gb)],
    ventureStage: ventureStagePart(a.ventureStage, b.ventureStage),
  };
  const intent = meanOrNull([intentParts.searchIntent, intentParts.startHorizon, intentParts.ventureGoal, intentParts.ventureStage]);
  const mod = meanOrNull([context, intent]) ?? C.modulatorUnknown;
  return { context, intent, intentParts, mod };
}

export function directionalRelevance(need: number, mod: number): number {
  return need * (C.directionalBase + C.directionalModWeight * mod);
}

/** 0,6 × min + 0,4 × mittel – Rechenreihenfolge wie im eingefrorenen Original. */
export function mutuality(aToB: number, bToA: number): number {
  return C.mutualityMinWeight * Math.min(aToB, bToA) + (C.mutualityMeanWeight * (aToB + bToA)) / 2;
}
