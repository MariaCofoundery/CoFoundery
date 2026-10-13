import assert from "node:assert/strict";
import test from "node:test";

import { matchConnect, rankConnectOffers } from "@/lib/matching/v01/connectMatcher";
import { matchFindPair, rankFindCandidates } from "@/lib/matching/v01/findMatcher";
import { createIdfIndex } from "@/lib/matching/v01/idf";
import type { ConnectContext, Ranked } from "@/lib/matching/v01/types";
import {
  NOW,
  findPerson,
  listingsById,
  offerInput,
  profilesById,
  regression,
  seekInput,
  synthetic,
  syntheticIdfSnapshot,
} from "@/lib/matching/v01/__tests__/helpers/synthetic";

/**
 * Regression (Spec §18): bekannte NICHT-Holdout-Stressfälle.
 *   v01-Paare: syn-pair0003 zugelassen und oben; 0102 und 0104 vom Gate ausgeschlossen; 0206 auf Rang 1.
 *   CONNECT-Stressfälle aus v02 ohne C4 (Holdout): Erwartung C1 10 von 12; C3 und C5 sind bekannte Fehlschläge.
 * syn-pair0297 und C4 liegen im (verbrauchten) Holdout und sind bewusst nicht enthalten.
 * Pool: synthetische Profile ohne Holdout-Personen. Vergleich zusätzlich mit dem eingefrorenen Python-Lauf.
 */
const pool = new Set(regression.pool_ids);
const findPool = synthetic.profiles.filter((p) => pool.has(p.id) && p.find_profile?.status === "active").map((p) => findPerson(p));
const CTX = { familyOfArea: synthetic.family_of, idfCorpusVersion: "synthetic-v03-all-listings", computedAt: null, blockedPersonIds: new Set<string>() };

function ranks<R>(ranked: readonly Ranked<R>[], score: (r: R) => number, isTarget: (r: R) => boolean) {
  const target = ranked.find((x) => isTarget(x.result));
  if (!target) return null;
  const s = score(target.result);
  return {
    optimistic: 1 + ranked.filter((x) => !isTarget(x.result) && score(x.result) > s).length,
    pessimistic: ranked.filter((x) => score(x.result) >= s).length,
  };
}

test("FIND-Stresspaare aus v01 (ohne syn-pair0297)", () => {
  assert.deepEqual(Object.keys(regression.find).sort(), ["syn-pair0003", "syn-pair0102", "syn-pair0104"]);
  for (const [pid, exp] of Object.entries(regression.find)) {
    const a = findPerson(profilesById.get(exp.pair.a)!);
    const b = findPerson(profilesById.get(exp.pair.b)!);
    const r = matchFindPair(a, b, { ...CTX, blocked: false });
    assert.equal(r.eligibility.status, exp.gate_state === "not_eligible" ? "ineligible" : exp.gate_state, pid);
    const forA = rankFindCandidates(a, findPool.filter((p) => p.personId !== a.personId), CTX);
    const forB = rankFindCandidates(b, findPool.filter((p) => p.personId !== b.personId), CTX);
    assert.deepEqual(ranks(forA, (x) => x.relevance.mutuality, (x) => x.subject.b === b.personId), exp.rank_b_for_a, `${pid} Rang für A`);
    assert.deepEqual(ranks(forB, (x) => x.relevance.mutuality, (x) => x.subject.b === a.personId), exp.rank_a_for_b, `${pid} Rang für B`);
  }
  // Erwartungen der Spec
  assert.equal(regression.find["syn-pair0003"].gate_state, "eligible");
  assert.deepEqual(regression.find["syn-pair0003"].rank_b_for_a, { optimistic: 1, pessimistic: 1 });
  assert.equal(regression.find["syn-pair0102"].gate_state, "not_eligible");
  assert.equal(regression.find["syn-pair0104"].gate_state, "not_eligible");
});

test("CONNECT-Stresspaar syn-pair0206: Rang 1", () => {
  const idf = createIdfIndex(syntheticIdfSnapshot());
  const ctx: ConnectContext = { now: NOW, viewerIsNetworkMember: true, purpose: "listing_match", blockedOwnerIds: new Set(), computedAt: null };
  const exp = regression.connect["syn-pair0206"];
  const s = seekInput(exp.pair.a_listing);
  const offers = [...listingsById.values()]
    .filter(({ raw, owner }) => raw.direction === "offering" && pool.has(owner.id) && owner.id !== s.ownerId)
    .map(({ raw }) => offerInput(raw.id));
  const ranked = rankConnectOffers(s, offers, ctx, idf);
  assert.equal(matchConnect(s, offerInput(exp.pair.b_listing), ctx, idf).eligibility.status, exp.gate_state);
  const rank = ranks(ranked, (x) => x.relevance.score, (x) => x.subject.offerListing === exp.pair.b_listing);
  assert.deepEqual(rank, exp.rank);
  assert.deepEqual(rank, { optimistic: 1, pessimistic: 1 });
});

test("CONNECT-Stressfälle v02 ohne C4: identisch mit Python; 10 von 12, C3 und C5 bekannte Fehlschläge", () => {
  const idf = createIdfIndex(syntheticIdfSnapshot("idf-synthetic-v03-all-listings-with-stress-v02.json"));
  const ctx: ConnectContext = { now: NOW, viewerIsNetworkMember: true, purpose: "listing_match", blockedOwnerIds: new Set(), computedAt: null };
  const stressOwners = new Set(regression.stress_owners.map((o) => o.id));
  assert.ok(!regression.stress.some((c) => c.case === "C4"));
  const passed: string[] = [];
  for (const c of regression.stress) {
    const s = seekInput(c.seek);
    const offers = [...listingsById.values()]
      .filter(({ raw, owner }) => raw.direction === "offering" && (pool.has(owner.id) || stressOwners.has(owner.id)) && owner.id !== s.ownerId)
      .map(({ raw }) => offerInput(raw.id));
    const ranked = rankConnectOffers(s, offers, ctx, idf);
    const score = new Map(ranked.map((r) => [r.result.subject.offerListing, r.result.relevance.score]));
    const pess = (x: string) => (score.has(x) ? 1 + [...score].filter(([k, v]) => k !== x && v >= score.get(x)!).length : 1e6);
    const opt = (x: string) => (score.has(x) ? 1 + [...score].filter(([k, v]) => k !== x && v > score.get(x)!).length : 1e6);
    const ok = c.criteria.every(([kind, x, y]) => {
      if (kind === "order") return score.has(x as string) && (!score.has(y as string) || score.get(x as string)! > score.get(y as string)!);
      if (kind === "top") return pess(x as string) <= (y as number);
      if (kind === "not_top") return opt(x as string) > (y as number);
      if (kind === "gated") return !score.has(x as string);
      if (kind === "eligible") return score.has(x as string);
      throw new Error(`unbekanntes Kriterium ${kind}`);
    });
    assert.equal(ok, c.python_passed, `${c.case} wie Python`);
    if (ok) passed.push(c.case);
  }
  assert.equal(regression.stress.length, 12);
  assert.deepEqual(regression.stress.filter((c) => !passed.includes(c.case)).map((c) => c.case), ["C3", "C5"]);
});
