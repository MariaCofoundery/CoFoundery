/**
 * FIND-Matcher (Spec §6): Pool -> Gate -> A→B und B→A (PH1) -> Gegenseitigkeit -> Confidence -> Reasons.
 * Workstyle kommt nicht vor (siehe `workstyle.ts`, nur nachträglicher Gesprächskontext).
 */
import { findPersonEvidence } from "@/lib/matching/v01/confidence";
import { findEligibility } from "@/lib/matching/v01/findEligibility";
import { directionalComponents, directionalRelevance, mutuality, pairModulator } from "@/lib/matching/v01/findRelevance";
import { findExplanations } from "@/lib/matching/v01/explanations";
import { rankWithTies } from "@/lib/matching/v01/ranking";
import type { FindContext, FindMatchResult, FindPersonInput, Ranked } from "@/lib/matching/v01/types";
import { MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

export function matchFindPair(a: FindPersonInput, b: FindPersonInput, ctx: FindContext): FindMatchResult {
  const eligibility = findEligibility(a, b, ctx);
  const ab = directionalComponents(a, b, ctx.familyOfArea);
  const ba = directionalComponents(b, a, ctx.familyOfArea);
  const modulator = pairModulator(a, b);
  const aToB = directionalRelevance(ab.need, modulator.mod);
  const bToA = directionalRelevance(ba.need, modulator.mod);
  const ea = findPersonEvidence(a);
  const eb = findPersonEvidence(b);
  return {
    matchingVersion: MATCHING_VERSION,
    normalizationVersion: NORMALIZATION_VERSION,
    idfCorpusVersion: ctx.idfCorpusVersion,
    context: "find",
    computedAt: ctx.computedAt,
    inputVersions: { a: a.inputVersion, b: b.inputVersion },
    subject: { a: a.personId, b: b.personId },
    eligibility,
    relevance: { aToB, bToA, mutuality: mutuality(aToB, bToA), components: { aToB: ab, bToA: ba, modulator } },
    confidence: { score: Math.min(ea.score, eb.score), evidence: { a: ea, b: eb } },
    explanations: findExplanations(a, b, eligibility),
    workstyleContext: null,
  };
}

/**
 * Rangliste für `viewer` (immer Seite a). Gerankt wird nach Gegenseitigkeit unter `eligible`
 * und `uncertain`; `ineligible` erscheint nicht.
 */
export function rankFindCandidates(
  viewer: FindPersonInput,
  candidates: readonly FindPersonInput[],
  ctx: Omit<FindContext, "blocked"> & Readonly<{ blockedPersonIds: ReadonlySet<string> }>,
): Ranked<FindMatchResult>[] {
  const items = candidates
    .map((c) => ({
      candidate: c,
      result: matchFindPair(viewer, c, {
        familyOfArea: ctx.familyOfArea,
        idfCorpusVersion: ctx.idfCorpusVersion,
        computedAt: ctx.computedAt,
        blocked: ctx.blockedPersonIds.has(c.personId),
      }),
    }))
    .filter(({ result }) => result.eligibility.status !== "ineligible")
    .map(({ candidate, result }) => ({ result, score: result.relevance.mutuality, publishedAt: candidate.publishedAt, id: candidate.personId }));
  return rankWithTies(items);
}
