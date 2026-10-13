import assert from "node:assert/strict";
import test from "node:test";

import { matchConnect, rankConnectOffers } from "@/lib/matching/v01/connectMatcher";
import { buildIdfSnapshot, createIdfIndex, idfSnapshotHash } from "@/lib/matching/v01/idf";
import { CONNECT_CTX, offer, seek } from "@/lib/matching/v01/__tests__/helpers/builders";
import { syntheticIdfSnapshot } from "@/lib/matching/v01/__tests__/helpers/synthetic";

const CORPUS = [
  { title: "Suche Hilfe im Vertrieb", summary: "Erste Kunden gewinnen", topics: ["Vertrieb"] },
  { title: "Biete Vertriebsaufbau", summary: "Gespräch zum Markteintritt", topics: ["Sales"] },
  { title: "Biete Batteriechemie", summary: "Zellchemie für Speicher", topics: ["Batteriechemie"] },
  { title: "Biete Gespräch", summary: "Gerne ein Gespräch", topics: [] },
];
const idf = createIdfIndex(buildIdfSnapshot(CORPUS, "test-connect-idf-1"));

test("Themenbezug: Suchthema = Angebotsthema -> topic 1; Reason mit Originalwerten", () => {
  const r = matchConnect(seek("s", { topics: ["Vertrieb"] }), offer("o", { topics: ["Vertrieb"] }), CONNECT_CTX, idf);
  assert.equal(r.relevance.components.topic, 1);
  assert.ok(r.explanations.some((e) => e.code === "CONNECT_TOPIC_MATCH" && e.params.seek_topic === "Vertrieb"));
});

test("Synonym über das Wörterbuch: Vertrieb ~ Sales", () => {
  const r = matchConnect(seek("s", { topics: ["Vertrieb"] }), offer("o", { topics: ["Sales"] }), CONNECT_CTX, idf);
  assert.equal(r.relevance.components.topic, 1);
  const e = r.explanations.find((x) => x.code === "CONNECT_TOPIC_MATCH");
  assert.deepEqual(e?.params, { seek_topic: "Vertrieb", offer_topic: "Sales" });
});

test("kein Wörterbuch-Treffer: Kundenakquise vs. Neukundengewinnung -> topic 0 (bekannte Grenze C5)", () => {
  const r = matchConnect(seek("s", { topics: ["Kundenakquise"] }), offer("o", { topics: ["Neukundengewinnung"] }), CONNECT_CTX, idf);
  assert.equal(r.relevance.components.topic, 0);
});

test("nur Profil-Expertise trifft das Suchthema -> 0,7", () => {
  const r = matchConnect(seek("s", { topics: ["Fundraising"] }), offer("o", { topics: ["Pricing"] }, { expertise: ["Finanzierung"] }), CONNECT_CTX, idf);
  assert.equal(r.relevance.components.topic, 0.7);
  assert.ok(r.explanations.some((e) => e.code === "CONNECT_TOPIC_VIA_EXPERTISE" && e.params.topic === "Finanzierung"));
});

test("Thema fehlt, Branche gleich: gedeckelt bei 0,10; Kategorie allein: 0,10", () => {
  const r = matchConnect(seek("s", { topics: ["Pricing"], industries: ["SaaS"] }), offer("o", { topics: ["Legal"], industries: ["Software"] }), CONNECT_CTX, idf);
  assert.equal(r.relevance.components.industry, 1);
  assert.equal(r.relevance.components.topic, 0);
  assert.equal(r.relevance.components.cappedNoTopic, true);
  assert.equal(r.relevance.score, 0.1);
  assert.equal(r.eligibility.status, "eligible", "Themen-Fehlpassung ist kein Gate");

  const cat = matchConnect(seek("s", { category: "sparring" }), offer("o", { category: "sparring" }), CONNECT_CTX, idf);
  assert.equal(cat.relevance.score, 0.1);
  assert.ok(cat.explanations.some((e) => e.code === "CONNECT_SAME_CATEGORY"));
});

test("exakte Gewichtung 0,55 / 0,20 / 0,15 / 0,10", () => {
  const r = matchConnect(
    seek("s", { topics: ["Vertrieb"], industries: ["SaaS"], category: "expertise", title: "Vertrieb", summary: "" }),
    offer("o", { topics: ["Vertrieb"], industries: ["Software"], category: "expertise", title: "Vertrieb", summary: "" }),
    CONNECT_CTX,
    idf,
  );
  const c = r.relevance.components;
  assert.equal(c.text, 1);
  assert.equal(r.relevance.score, 0 + 0.55 * c.topic + 0.2 * c.text + 0.15 * c.industry + 0.1 * c.category);
  assert.equal(Math.round(r.relevance.score * 1e12) / 1e12, 1);
});

test("Textbezug: IDF-gewichtet, Reason mit Originalwörtern", () => {
  const r = matchConnect(
    seek("s", { title: "Suche Batteriechemie-Expertise", summary: "Zellchemie für unseren Speicher" }),
    offer("o", { title: "Biete Batteriechemie", summary: "Zellchemie" }),
    CONNECT_CTX,
    idf,
  );
  assert.ok(r.relevance.components.text > 0.1);
  const e = r.explanations.find((x) => x.code === "CONNECT_TEXT_OVERLAP");
  assert.ok(e && /Zellchemie/.test(e.params.terms), JSON.stringify(e));
});

test("Laufzeit-Gate: abgelaufen -> ineligible, heute gültig, ohne Ablauf gültig, pausiert -> ineligible", () => {
  const s = seek("s", { topics: ["Vertrieb"] });
  assert.equal(matchConnect(s, offer("o", { expiresAt: "2026-10-12" }), CONNECT_CTX, idf).eligibility.status, "ineligible");
  assert.equal(matchConnect(s, offer("o", { expiresAt: "2026-10-13" }), CONNECT_CTX, idf).eligibility.status, "eligible");
  assert.equal(matchConnect(s, offer("o", { expiresAt: null }), CONNECT_CTX, idf).eligibility.status, "eligible");
  assert.equal(matchConnect(s, offer("o", { status: "paused" }), CONNECT_CTX, idf).eligibility.status, "ineligible");
  assert.equal(matchConnect(s, offer("o", {}, { profileStatus: "paused" }), CONNECT_CTX, idf).eligibility.status, "ineligible");
});

test("Orts-Gate: regional + onsite mit konkretem Ort, Gegenseite anderswo -> ineligible; Ort fehlt -> uncertain", () => {
  const s = seek("s", { geographicScope: "regional", remoteMode: "onsite", locations: ["Leipzig"] });
  assert.equal(matchConnect(s, offer("o", { locations: ["Stuttgart"] }), CONNECT_CTX, idf).eligibility.status, "ineligible");
  assert.equal(matchConnect(s, offer("o", { locations: ["DACH"] }), CONNECT_CTX, idf).eligibility.status, "ineligible");
  const unknown = matchConnect(s, offer("o", { locations: [] }), CONNECT_CTX, idf);
  assert.equal(unknown.eligibility.status, "uncertain");
  assert.ok(unknown.explanations.some((e) => e.code === "CONNECT_UNKNOWN_LOCATION"));
  assert.equal(matchConnect(seek("s", { geographicScope: "regional", remoteMode: "hybrid", locations: ["Leipzig"] }), offer("o", { locations: ["Stuttgart"] }), CONNECT_CTX, idf).eligibility.status, "eligible");
});

test("Produktregeln: eigener Eintrag, Blockierung, Sichtbarkeit, suggestable nur für Personen-Vorschläge – ohne sichtbaren Grund", () => {
  const s = seek("s");
  const own = matchConnect(s, offer("o", { ownerId: s.ownerId }), CONNECT_CTX, idf);
  const blocked = matchConnect(s, offer("o"), { ...CONNECT_CTX, blockedOwnerIds: new Set(["owner-o"]) }, idf);
  const hidden = matchConnect(s, offer("o"), { ...CONNECT_CTX, viewerIsNetworkMember: false }, idf);
  for (const r of [own, blocked, hidden]) {
    assert.equal(r.eligibility.status, "ineligible");
    assert.ok(r.eligibility.reasons.every((x) => x.visibleTo.length === 0));
  }
  const notSuggestable = offer("o", {}, { suggestable: false });
  assert.equal(matchConnect(s, notSuggestable, CONNECT_CTX, idf).eligibility.status, "eligible");
  assert.equal(matchConnect(s, notSuggestable, { ...CONNECT_CTX, purpose: "person_suggestion" }, idf).eligibility.status, "ineligible");
});

test("IDF-Snapshot: Version im Ergebnis, unbekanntes Token = ln(N+1), falsche Version oder Hash wird abgelehnt", () => {
  const snap = buildIdfSnapshot(CORPUS, "test-connect-idf-1");
  assert.equal(snap.n, 4);
  assert.equal(createIdfIndex(snap).idf("unbekanntestoken"), Math.log(5));
  assert.equal(matchConnect(seek("s"), offer("o"), CONNECT_CTX, idf).idfCorpusVersion, "test-connect-idf-1");
  assert.throws(() => createIdfIndex({ ...snap, normalizationVersion: "matching-normalization-v0.2" }), /normalization/);
  assert.throws(() => createIdfIndex({ ...snap, df: { ...snap.df, extra: 1 } }), /Hash/);
  assert.throws(() => createIdfIndex({ ...snap, idfCorpusVersion: " " }), /idf_corpus_version/);
  assert.throws(() => buildIdfSnapshot(CORPUS, ""), /idf_corpus_version/);
  assert.deepEqual(buildIdfSnapshot([...CORPUS].reverse(), "test-connect-idf-1").sha256, snap.sha256, "Reihenfolge ändert den Snapshot nicht");
  assert.ok(!JSON.stringify(snap).includes("Suche Hilfe"), "nur Zählwerte, keine Texte");
});

test("IDF-Snapshot des synthetischen Korpus: Hash wie im Python-Generator", () => {
  const s = syntheticIdfSnapshot();
  assert.equal(idfSnapshotHash(s.n, s.df), s.sha256);
  assert.equal(createIdfIndex(s).idfCorpusVersion, "synthetic-v03-all-listings");
});

test("Gleichstände: gleicher Score -> gleiche tieGroup; Anzeige-Reihenfolge Veröffentlichung, dann ID", () => {
  const s = seek("s", { topics: ["Vertrieb"] });
  const offers = [
    offer("o-b", { topics: ["Vertrieb"], publishedAt: "2026-09-01" }),
    offer("o-a", { topics: ["Vertrieb"], publishedAt: "2026-09-01" }),
    offer("o-c", { topics: ["Vertrieb"], publishedAt: "2026-10-01" }),
    offer("o-d", { topics: ["Legal"] }),
  ];
  const ranked = rankConnectOffers(s, offers, CONNECT_CTX, idf);
  assert.deepEqual(ranked.map((r) => r.result.subject.offerListing), ["o-c", "o-a", "o-b", "o-d"]);
  assert.deepEqual(ranked.map((r) => r.tieGroup), ["tie-1", "tie-1", "tie-1", null]);
  assert.equal(ranked[0].secondaryOrder, "2026-10-01|o-c");
  assert.deepEqual(rankConnectOffers(s, [...offers].reverse(), CONNECT_CTX, idf), ranked);
});

test("gerichtet ohne Gegenseitigkeit; Confidence getrennt von der Relevanz", () => {
  const r = matchConnect(seek("s", { topics: ["Vertrieb"] }), offer("o", { topics: ["Vertrieb"] }), CONNECT_CTX, idf);
  const sparse = matchConnect(seek("s", { topics: ["Vertrieb"] }), offer("o", { topics: ["Vertrieb"], industries: ["SaaS"], locations: ["Berlin"], geographicScope: "germany" }), CONNECT_CTX, idf);
  assert.equal(r.relevance.components.topic, sparse.relevance.components.topic);
  assert.equal(r.confidence.score, 0.25);
  assert.equal(r.relevance.score, sparse.relevance.score);
});
