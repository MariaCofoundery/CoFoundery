import assert from "node:assert/strict";
import test from "node:test";

import { matchConnect } from "@/lib/matching/v01/connectMatcher";
import { matchFindPair } from "@/lib/matching/v01/findMatcher";
import { createIdfIndex } from "@/lib/matching/v01/idf";
import type { ConnectContext, FindContext } from "@/lib/matching/v01/types";
import { NOW, findPerson, offerInput, profilesById, readFixture, seekInput, synthetic, syntheticIdfSnapshot } from "@/lib/matching/v01/__tests__/helpers/synthetic";

/**
 * Parität mit dem eingefrorenen Python-Code (F3_PH1_min60_DICT, C1_topic_required_DICT, N-DICTIONARY).
 * Die erwarteten Werte sind Modellausgaben, keine Labels. Personen und Einträge aus den 40 Holdout-Paaren
 * und der Holdout-Stressfall C4 sind ausgeschlossen (siehe build_parity_fixtures_v01.py).
 * Toleranz 1e-12: Python summiert über Mengen in Hash-Reihenfolge, die Engine in sortierter Reihenfolge.
 */
const EPS = 1e-12;
const STATE: Record<string, string> = { eligible: "eligible", uncertain: "uncertain", not_eligible: "ineligible" };

function close(actual: number | null, expected: number | null, label: string) {
  if (expected === null || actual === null) return assert.equal(actual, expected, label);
  assert.ok(Math.abs(actual - expected) <= EPS, `${label}: ${actual} != ${expected}`);
}

type FindRec = {
  a: string; b: string; score: number; gate_state: string; a_to_b: number; b_to_a: number; need_a_to_b: number; need_b_to_a: number;
  role_cover_a_to_b: number | null; cap_cover_a_to_b: number | null; role_cover_b_to_a: number | null; cap_cover_b_to_a: number | null;
  context: number | null; intent: number | null; confidence: number; consent_b?: boolean;
};
const find = readFixture<{ meta: { matching_version: string }; pairs: FindRec[]; no_consent_pairs: FindRec[] }>("parity-find-v01.json");
const FIND_CTX: FindContext = { familyOfArea: synthetic.family_of, idfCorpusVersion: "synthetic-v03-all-listings", blocked: false, computedAt: null };

function checkFind(rec: FindRec, consentB: boolean) {
  const a = findPerson(profilesById.get(rec.a)!);
  const b = findPerson(profilesById.get(rec.b)!, { consent: consentB });
  const r = matchFindPair(a, b, FIND_CTX);
  const label = `${rec.a}→${rec.b}`;
  assert.equal(r.eligibility.status, STATE[rec.gate_state], `${label} gate`);
  close(r.relevance.mutuality, rec.score, `${label} mutuality`);
  close(r.relevance.aToB, rec.a_to_b, `${label} aToB`);
  close(r.relevance.bToA, rec.b_to_a, `${label} bToA`);
  close(r.relevance.components.aToB.need, rec.need_a_to_b, `${label} need a→b`);
  close(r.relevance.components.bToA.need, rec.need_b_to_a, `${label} need b→a`);
  close(r.relevance.components.aToB.roleCover, rec.role_cover_a_to_b, `${label} role a→b`);
  close(r.relevance.components.aToB.capCover, rec.cap_cover_a_to_b, `${label} cap a→b`);
  close(r.relevance.components.bToA.roleCover, rec.role_cover_b_to_a, `${label} role b→a`);
  close(r.relevance.components.bToA.capCover, rec.cap_cover_b_to_a, `${label} cap b→a`);
  close(r.relevance.components.modulator.context, rec.context, `${label} context`);
  close(r.relevance.components.modulator.intent, rec.intent, `${label} intent`);
  close(r.confidence.score, rec.confidence, `${label} confidence`);
}

test("FIND: alle Paare identisch mit dem eingefrorenen F3 (Gate, A→B, B→A, Gegenseitigkeit, Komponenten, Confidence)", () => {
  assert.equal(find.meta.matching_version, "matching-v0.1");
  assert.ok(find.pairs.length >= 1500);
  for (const rec of find.pairs) checkFind(rec, true);
});

test("FIND ohne Capability-Freigabe: identisch mit Python bei entfernten Capabilities (Spec §5)", () => {
  assert.ok(find.no_consent_pairs.length >= 200);
  for (const rec of find.no_consent_pairs) checkFind(rec, false);
});

type ConnectRec = { seek: string; offer: string; score: number; gate_state: string; confidence: number; topic: number; text: number;
  industry: number; category: number };
const connect = readFixture<{ meta: { now: string }; pairs: ConnectRec[] }>("parity-connect-v01.json");

test("CONNECT: alle Paare identisch mit dem eingefrorenen C1 (Gate, Komponenten, Score, Confidence)", () => {
  const idf = createIdfIndex(syntheticIdfSnapshot());
  const ctx: ConnectContext = { now: NOW, viewerIsNetworkMember: true, purpose: "listing_match", blockedOwnerIds: new Set(), computedAt: null };
  assert.ok(connect.pairs.length >= 1500);
  for (const rec of connect.pairs) {
    const r = matchConnect(seekInput(rec.seek), offerInput(rec.offer), ctx, idf);
    const label = `${rec.seek}→${rec.offer}`;
    assert.equal(r.eligibility.status, STATE[rec.gate_state], `${label} gate`);
    close(r.relevance.score, rec.score, `${label} score`);
    close(r.relevance.components.topic, rec.topic, `${label} topic`);
    close(r.relevance.components.text, rec.text, `${label} text`);
    close(r.relevance.components.industry, rec.industry, `${label} industry`);
    close(r.relevance.components.category, rec.category, `${label} category`);
    close(r.confidence.score, rec.confidence, `${label} confidence`);
  }
});
