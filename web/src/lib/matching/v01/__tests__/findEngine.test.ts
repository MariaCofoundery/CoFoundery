import assert from "node:assert/strict";
import test from "node:test";

import { matchFindPair, rankFindCandidates } from "@/lib/matching/v01/findMatcher";
import { capabilityCoverage, entryValue, mutuality } from "@/lib/matching/v01/findRelevance";
import { FAMILY_OF, FIND_CTX, cap, person } from "@/lib/matching/v01/__tests__/helpers/builders";

const codes = (r: ReturnType<typeof matchFindPair>, side: "a" | "b") =>
  r.explanations.filter((e) => e.audience === side).map((e) => e.code);

test("Rollen: Bedarf -> Angebot; gleiche eigene Rollen zählen nicht", () => {
  const a = person("a", { seekingRoles: ["tech"], ownRoles: ["sales"] });
  const b = person("b", { ownRoles: ["tech"], seekingRoles: ["sales"] });
  const r = matchFindPair(a, b, FIND_CTX);
  assert.equal(r.relevance.components.aToB.roleCover, 1);
  assert.equal(r.relevance.components.bToA.roleCover, 1);
  assert.ok(codes(r, "a").includes("FIND_ROLE_NEED_COVERED"));
  assert.ok(codes(r, "a").includes("FIND_ROLE_NEED_COVERED_REVERSE"));

  const same = matchFindPair(person("x", { ownRoles: ["tech"] }), person("y", { ownRoles: ["tech"] }), FIND_CTX);
  assert.equal(same.relevance.mutuality, 0, "gleiche eigene Rollen ohne Bedarf: keine Relevanz");
});

test("Rollen: mehr eigene Rollen erhöhen nichts ohne getroffenen Bedarf", () => {
  const a = person("a", { seekingRoles: ["tech"] });
  const one = matchFindPair(a, person("b", { ownRoles: ["tech"] }), FIND_CTX);
  const many = matchFindPair(a, person("c", { ownRoles: ["tech", "sales", "design", "finance", "growth"] }), FIND_CTX);
  assert.equal(one.relevance.aToB, many.relevance.aToB);
});

test("einseitiger Bedarf: A→B > 0, B→A = 0; PH1 senkt die Gegenseitigkeit", () => {
  const a = person("a", { seekingRoles: ["tech"] });
  const b = person("b", { ownRoles: ["tech"] });
  const r = matchFindPair(a, b, FIND_CTX);
  assert.ok(r.relevance.aToB > 0);
  assert.equal(r.relevance.bToA, 0);
  assert.equal(r.relevance.components.bToA.need, 0, "beide Bedarfsteile UNKNOWN -> need 0");
  assert.equal(r.relevance.mutuality, mutuality(r.relevance.aToB, 0));

  const mutual = matchFindPair(person("c", { seekingRoles: ["tech"], ownRoles: ["sales"] }), person("d", { ownRoles: ["tech"], seekingRoles: ["sales"] }), FIND_CTX);
  assert.ok(mutual.relevance.mutuality > r.relevance.mutuality, "gegenseitiger Bedarf steht vor einseitigem");
});

test("Gegenseitigkeit: exakt 0,6·min + 0,4·mittel", () => {
  assert.equal(mutuality(1, 0.5), 0.6 * 0.5 + (0.4 * 1.5) / 2);
  assert.equal(mutuality(0.8, 0.8), 0.6 * 0.8 + (0.4 * 1.6) / 2);
  assert.equal(mutuality(0, 1), 0.2);
});

test("PH1: Bedarf als Faktor, Modulator symmetrisch, fehlend -> 0,5", () => {
  const a = person("a", { seekingRoles: ["tech"] });
  const b = person("b", { ownRoles: ["tech"] });
  const r = matchFindPair(a, b, FIND_CTX);
  assert.equal(r.relevance.components.modulator.context, null);
  assert.equal(r.relevance.components.modulator.intent, null);
  assert.equal(r.relevance.components.modulator.mod, 0.5);
  assert.equal(r.relevance.aToB, 1 * (0.5 + 0.5 * 0.5));

  const ind = matchFindPair(person("a", { seekingRoles: ["tech"], industries: ["HealthTech"] }), person("b", { ownRoles: ["tech"], industries: ["Healthcare"] }), FIND_CTX);
  assert.equal(ind.relevance.components.modulator.context, 1);
  assert.equal(ind.relevance.aToB, 1);
  assert.ok(ind.explanations.some((e) => e.code === "FIND_SAME_INDUSTRY" && e.params.industry === "HealthTech"), "RAW VALUE im Reason");
});

test("Gate Stunden: Minimum unterschritten -> ineligible; Stunden fehlen -> uncertain; Erfüllung ohne Bonus", () => {
  const a = person("a", { seekingRoles: ["tech"], mustHaves: { minimumAvailabilityHoursPerWeek: 20 } });
  assert.equal(matchFindPair(a, person("b", { ownRoles: ["tech"], availabilityHoursPerWeek: 10 }), FIND_CTX).eligibility.status, "ineligible");
  assert.equal(matchFindPair(a, person("b", { ownRoles: ["tech"], availabilityHoursPerWeek: null }), FIND_CTX).eligibility.status, "uncertain");
  const ok = matchFindPair(a, person("b", { ownRoles: ["tech"], availabilityHoursPerWeek: 40 }), FIND_CTX);
  const none = matchFindPair(person("a", { seekingRoles: ["tech"] }), person("b", { ownRoles: ["tech"], availabilityHoursPerWeek: 40 }), FIND_CTX);
  assert.equal(ok.eligibility.status, "eligible");
  assert.equal(ok.relevance.mutuality, none.relevance.mutuality, "kein Bonus für eine erfüllte Bedingung");
});

test("Gate Ort (Spec §7.1): konkreter Ort, Gegenseite eindeutig anderswo, nicht remote-kompatibel", () => {
  const leipzig = { remoteMode: "onsite", locationRegion: "Leipzig", mustHaves: { desiredLocationRegion: "Leipzig" } };
  assert.equal(matchFindPair(person("a", leipzig), person("b", { locationRegion: "Stuttgart" }), FIND_CTX).eligibility.status, "ineligible");
  assert.equal(matchFindPair(person("a", leipzig), person("b", { locationRegion: "DACH" }), FIND_CTX).eligibility.status, "ineligible", "Platzhalter erfüllt keinen Ort");
  assert.equal(matchFindPair(person("a", leipzig), person("b", { locationRegion: "Mitteldeutschland (Leipzig)" }), FIND_CTX).eligibility.status, "eligible");
  const flexible = { ...leipzig, remoteMode: "flexible" };
  assert.equal(matchFindPair(person("a", flexible), person("b", { locationRegion: "Stuttgart" }), FIND_CTX).eligibility.status, "eligible", "remote-kompatibel: kein Konflikt");
  const acceptsRemote = { ...leipzig, mustHaves: { ...leipzig.mustHaves, acceptedRemoteModes: ["remote", "onsite", "hybrid"] } };
  assert.equal(matchFindPair(person("a", acceptsRemote), person("b", { locationRegion: "Stuttgart" }), FIND_CTX).eligibility.status, "eligible");
  assert.equal(matchFindPair(person("a", { remoteMode: "hybrid", locationRegion: "Berlin" }), person("b", { remoteMode: "flexible", locationRegion: "Hamburg" }), FIND_CTX).eligibility.status, "eligible", "hybrid/flexibel an verschiedenen Orten: kein Konflikt");
  assert.equal(matchFindPair(person("a", { remoteMode: "onsite", locationRegion: "Berlin" }), person("b", { remoteMode: "onsite", locationRegion: "Hamburg" }), FIND_CTX).eligibility.status, "ineligible", "beide onsite an verschiedenen Orten");
  // BEKANNTE EIGENSCHAFT der eingefrorenen Normalisierung (identisch im Python-Original, nicht korrigiert):
  // Ein Ort mit Wörterbuch-Schlüssel ("Leipzig" -> loc:leipzig) und ein nur tokenisierter Ort
  // ("Leipzig / Mitteldeutschland") gelten nie als gleich. Das Must-have schließt dann eine Person in Leipzig aus.
  const mixed = { ...leipzig, mustHaves: { desiredLocationRegion: "Leipzig / Mitteldeutschland" } };
  assert.equal(matchFindPair(person("a", mixed), person("b", { locationRegion: "Leipzig" }), FIND_CTX).eligibility.status, "ineligible");
  assert.equal(matchFindPair(person("a", mixed), person("b", { locationRegion: "Leipzig-Plagwitz" }), FIND_CTX).eligibility.status, "eligible");
  assert.equal(matchFindPair(person("a", { remoteMode: "onsite", locationRegion: "Stuttgart, BW" }), person("b", { remoteMode: "onsite", locationRegion: "Region Stuttgart" }), FIND_CTX).eligibility.status, "eligible");
});

test("Ort fehlt: UNKNOWN -> uncertain, Hinweis nur für die Person mit der Bedingung; kein Ortsbonus", () => {
  const a = person("a", { remoteMode: "onsite", locationRegion: "Leipzig", mustHaves: { desiredLocationRegion: "Leipzig" }, seekingRoles: ["tech"] });
  const r = matchFindPair(a, person("b", { locationRegion: null, ownRoles: ["tech"] }), FIND_CTX);
  assert.equal(r.eligibility.status, "uncertain");
  assert.deepEqual(codes(r, "a").filter((c) => c === "FIND_UNKNOWN_LOCATION"), ["FIND_UNKNOWN_LOCATION"]);
  assert.ok(!codes(r, "b").includes("FIND_UNKNOWN_LOCATION"), "B erfährt nichts über A's private Ortsbedingung");
  const same = matchFindPair(person("x", { seekingRoles: ["tech"], locationRegion: "Berlin" }), person("y", { ownRoles: ["tech"], locationRegion: "Berlin" }), FIND_CTX);
  const diff = matchFindPair(person("x", { seekingRoles: ["tech"], locationRegion: "Berlin" }), person("y", { ownRoles: ["tech"], locationRegion: "München" }), FIND_CTX);
  assert.equal(same.relevance.mutuality, diff.relevance.mutuality, "Ortsnähe ist nie ein Relevanzbonus");
});

test("Start: Must-have schließt aus, fehlt -> uncertain; ohne Must-have nur Modulator und Unterschieds-Reason", () => {
  const a = person("a", { startHorizon: "now", mustHaves: { acceptedStartHorizons: ["now", "next_3_months"] } });
  assert.equal(matchFindPair(a, person("b", { startHorizon: "later_or_flexible" }), FIND_CTX).eligibility.status, "ineligible");
  assert.equal(matchFindPair(a, person("b", { startHorizon: null }), FIND_CTX).eligibility.status, "uncertain");
  const free = matchFindPair(person("a", { startHorizon: "now", seekingRoles: ["tech"] }), person("b", { startHorizon: "later_or_flexible", ownRoles: ["tech"] }), FIND_CTX);
  assert.equal(free.eligibility.status, "eligible");
  assert.equal(free.relevance.components.modulator.intentParts.startHorizon, 0.2);
  assert.ok(codes(free, "a").includes("FIND_DIFF_START"));
});

test("Founder-Intent: nur ausdrückliches Must-have schließt aus", () => {
  const a = person("a", { mustHaves: { acceptedSearchIntents: ["ready_now"] } });
  assert.equal(matchFindPair(a, person("b", { searchIntent: "open_later" }), FIND_CTX).eligibility.status, "ineligible");
  assert.equal(matchFindPair(person("a"), person("b", { searchIntent: "open_later" }), FIND_CTX).eligibility.status, "eligible");
});

test("privates Must-have: wirkt im Gate, Grund nur für die setzende Person sichtbar, kein Inhalt in Reasons", () => {
  const b = person("b", { mustHaves: { requiredRolesAny: ["finance"], desiredLocationRegion: "Geheimort Leipzig" }, remoteMode: "onsite", locationRegion: "Leipzig" });
  const a = person("a", { ownRoles: ["tech"], locationRegion: "Stuttgart" });
  const r = matchFindPair(a, b, FIND_CTX);
  assert.equal(r.eligibility.status, "ineligible");
  for (const reason of r.eligibility.reasons) assert.deepEqual(reason.visibleTo, ["b"]);
  assert.equal(r.explanations.length, 0, "ausgeschlossene Paare haben keine Reasons");
  assert.ok(!JSON.stringify(r.explanations).includes("Geheimort"));
});

test("Capability-Freigabe false: wie nicht vorhanden – cap_cover UNKNOWN, Confidence-Feld fehlt, Pflichtbereich -> uncertain", () => {
  const a = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")], seekingRoles: ["sales"] });
  const bNo = person("b", { caps: [cap("b2b_sales", 5, "own")], ownRoles: ["sales"], capabilityMatchingAllowed: false });
  const r = matchFindPair(a, bNo, FIND_CTX);
  assert.equal(r.relevance.components.aToB.capCover, null);
  assert.equal(r.relevance.components.aToB.need, r.relevance.components.aToB.roleCover);
  assert.ok(r.confidence.evidence.b.missing.includes("capabilities"));
  assert.ok(!r.explanations.some((e) => e.code === "FIND_AREA_OWN_COVERED"));

  const required = person("c", { mustHaves: { requiredCapabilityAreasAny: ["b2b_sales"] } });
  assert.equal(matchFindPair(required, bNo, FIND_CTX).eligibility.status, "uncertain", "ohne Freigabe nie ineligible über Bereiche");

  const aNo = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")], capabilityMatchingAllowed: false });
  assert.equal(matchFindPair(aNo, person("b", { caps: [cap("b2b_sales", 5, "own")] }), FIND_CTX).relevance.components.aToB.capCover, null,
    "auch die eigene Abgabe-Angabe zählt ohne Freigabe nicht");
});

test("Capability-Freigabe true: own mit Stufe ≥ 3 deckt voll", () => {
  const a = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")] });
  const r = matchFindPair(a, person("b", { caps: [cap("b2b_sales", 4, "own")] }), FIND_CTX);
  assert.equal(r.relevance.components.aToB.capCover, 1);
  assert.ok(codes(r, "a").includes("FIND_AREA_OWN_COVERED"));
});

test("grow_into ist keine Ownership und deckt nichts ab", () => {
  assert.equal(entryValue(cap("x", 5, "grow_into")), 0);
  const a = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")] });
  const r = matchFindPair(a, person("b", { caps: [cap("b2b_sales", 5, "grow_into")] }), FIND_CTX);
  assert.equal(r.relevance.components.aToB.capCover, 0);
  assert.ok(!r.explanations.some((e) => e.code === "FIND_AREA_OWN_COVERED" || e.code === "FIND_AREA_CONTRIBUTE"));
});

test("contribute ist keine Ownership: 0,6 bei Stufe ≥ 3, Reason CONTRIBUTE statt OWN", () => {
  assert.equal(entryValue(cap("x", 4, "contribute")), 0.6);
  assert.equal(entryValue(cap("x", 2, "own")), 0.4);
  assert.equal(entryValue(cap("x", null, "own")), 0.4);
  assert.equal(entryValue(cap("x", 3, "unclear")), 0.3);
  assert.equal(entryValue(cap("x", 3, null)), 0.3);
  assert.equal(entryValue(cap("x", 5, "prefer_other")), 0);
  const a = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")] });
  const r = matchFindPair(a, person("b", { caps: [cap("b2b_sales", 4, "contribute")] }), FIND_CTX);
  assert.equal(r.relevance.components.aToB.capCover, 0.6);
  assert.deepEqual(codes(r, "a").filter((c) => c.startsWith("FIND_AREA")), ["FIND_AREA_CONTRIBUTE"]);
});

test("Familien-Teilgutschrift: × 0,5 in derselben Familie, nie working_style/other, kein Reason", () => {
  assert.equal(capabilityCoverage([cap("partnerships", 4, "own")], "b2b_sales", FAMILY_OF), 0.5);
  assert.equal(capabilityCoverage([cap("partnerships", 4, "contribute")], "b2b_sales", FAMILY_OF), 0.3);
  assert.equal(capabilityCoverage([cap("backend_engineering", 5, "own")], "b2b_sales", FAMILY_OF), 0, "andere Familie");
  assert.equal(capabilityCoverage([cap("conflict_handling", 5, "own")], "feedback_culture", FAMILY_OF), 0, "working_style ausgenommen");
  assert.equal(capabilityCoverage([cap("unknown_area", 5, "own")], "other_unknown", FAMILY_OF), 0, "ohne bekannte Familie keine Gutschrift");
  const r = matchFindPair(person("a", { caps: [cap("b2b_sales", 2, "prefer_other")] }), person("b", { caps: [cap("partnerships", 5, "own")] }), FIND_CTX);
  assert.equal(r.relevance.components.aToB.capCover, 0.5);
  assert.ok(!r.explanations.some((e) => e.code.startsWith("FIND_AREA")), "Familien-Treffer erscheinen in keinem Reason");
});

test("best match je Bedarf: keine Summe, Breite bringt nichts", () => {
  const entries = [cap("b2b_sales", 4, "own"), cap("b2b_sales", 4, "contribute"), cap("partnerships", 5, "own")];
  assert.equal(capabilityCoverage(entries, "b2b_sales", FAMILY_OF), 1);
  const a = person("a", { caps: [cap("b2b_sales", 2, "prefer_other")] });
  const narrow = matchFindPair(a, person("b", { caps: [cap("b2b_sales", 4, "own")] }), FIND_CTX);
  const broad = matchFindPair(a, person("c", {
    caps: [cap("b2b_sales", 4, "own"), ...Array.from({ length: 19 }, (_, i) => cap(`area_${i}`, 5, "own"))],
  }), FIND_CTX);
  assert.equal(broad.relevance.aToB, narrow.relevance.aToB);
});

test("dünnes Profil: nicht ausgeschlossen, Confidence niedrig, Relevanz nur über mod = 0,5 (bekannte Wirkung, Spec §13)", () => {
  const sparse = person("s", { ownRoles: ["tech"], locationRegion: null, remoteMode: null, commitmentLevel: null });
  const a = person("a", { seekingRoles: ["tech"], industries: ["SaaS"], searchIntent: "ready_now", startHorizon: "now" });
  const r = matchFindPair(a, sparse, FIND_CTX);
  assert.equal(r.eligibility.status, "eligible");
  assert.equal(r.relevance.components.modulator.mod, 0.5);
  assert.ok(r.confidence.score < 0.5);
  assert.equal(r.relevance.aToB, 0.75, "fehlende Daten sind kein negativer Relevanzwert");
});

test("Pool: Profil nicht aktiv, keine Founder-Rolle, dieselbe Person, blockiert -> ineligible ohne sichtbaren Grund", () => {
  const a = person("a");
  for (const [b, ctx] of [
    [person("b", { findProfileStatus: "paused" }), FIND_CTX],
    [person("b", { isFounder: false }), FIND_CTX],
    [person("a"), FIND_CTX],
    [person("b"), { ...FIND_CTX, blocked: true }],
  ] as const) {
    const r = matchFindPair(a, b, ctx);
    assert.equal(r.eligibility.status, "ineligible");
    assert.ok(r.eligibility.reasons.every((x) => x.visibleTo.length === 0));
  }
});

test("Rangliste: ineligible fehlt, Gleichstände ausgewiesen, Reihenfolge deterministisch und unabhängig von der Eingabereihenfolge", () => {
  const viewer = person("v", { seekingRoles: ["tech"], mustHaves: { minimumAvailabilityHoursPerWeek: 10 } });
  const candidates = [
    person("c3", { ownRoles: ["tech"], publishedAt: "2026-09-01" }),
    person("c1", { ownRoles: ["tech"], publishedAt: "2026-10-01" }),
    person("c2", { ownRoles: ["tech"], availabilityHoursPerWeek: 5 }),
    person("c4", { ownRoles: ["sales"] }),
  ];
  const ctx = { familyOfArea: FAMILY_OF, idfCorpusVersion: "test-idf-v1", computedAt: null, blockedPersonIds: new Set<string>() };
  const ranked = rankFindCandidates(viewer, candidates, ctx);
  assert.deepEqual(ranked.map((r) => r.result.subject.b), ["c1", "c3", "c4"]);
  assert.equal(ranked[0].tieGroup, "tie-1");
  assert.equal(ranked[1].tieGroup, "tie-1");
  assert.equal(ranked[2].tieGroup, null);
  assert.deepEqual(rankFindCandidates(viewer, [...candidates].reverse(), ctx), ranked);
  assert.deepEqual(rankFindCandidates(viewer, candidates, ctx), ranked, "gleiche Eingaben -> gleiches Ergebnis");
});

test("Ergebnis trägt alle Versionen und keine Prozent- oder Kompatibilitätsangaben", () => {
  const r = matchFindPair(person("a", { seekingRoles: ["tech"] }), person("b", { ownRoles: ["tech"] }), FIND_CTX);
  assert.equal(r.matchingVersion, "matching-v0.1");
  assert.equal(r.normalizationVersion, "matching-normalization-v0.1");
  assert.equal(r.idfCorpusVersion, "test-idf-v1");
  assert.doesNotMatch(JSON.stringify(r), /percent|%|compatib|kompatib|fit/i);
});
