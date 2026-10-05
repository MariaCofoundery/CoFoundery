import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { conversationPoints, type ConversationProfile } from "@/features/find/conversationPrompts";
import { AREAS } from "@/features/reporting/workstyle/model";

/**
 * Phase 11 - FIND Product Cleanup.
 *
 * FIND beantwortet "Gibt es genug Anknuepfungspunkte fuer ein Gespraech - und
 * was sollte man frueh klaeren?", nicht "Wie gut passt ihr?". Diese Tests
 * halten fest: Gespraechspunkte nur aus echten, freigegebenen Angaben; kein
 * Score, keine Rangfolge, keine Fit-Sprache; Capability-Ebenen getrennt; der
 * aktuelle Weg nach dem Intro fuehrt in den Teambereich, nicht in alte
 * Matching-Sessions.
 */

const src = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const json = (p: string) => JSON.parse(src(p));

const person = (over: Partial<ConversationProfile> = {}): ConversationProfile => ({
  displayName: "Mia",
  ownRoles: [],
  seekingRoles: [],
  industries: [],
  remoteMode: "flexible",
  availabilityHoursPerWeek: null,
  searchIntent: null,
  startHorizon: null,
  ...over,
});

test("leere Angaben erzeugen keinen Punkt", () => {
  const out = conversationPoints({ viewer: person(), candidate: person() });
  assert.deepEqual(out, { why: [], discuss: [] });
  // Ohne eigenes Profil gibt es keine profilbasierten Punkte.
  assert.deepEqual(conversationPoints({ viewer: null, candidate: person({ seekingRoles: ["tech"] }) }), { why: [], discuss: [] });
});

test("Warum ein Gespräch: Rollen in beide Richtungen, Branche, gesuchte Bereiche", () => {
  const out = conversationPoints({
    viewer: person({ ownRoles: ["tech"], seekingRoles: ["sales"], industries: ["Climate"] }),
    candidate: person({ ownRoles: ["sales"], seekingRoles: ["tech"], industries: ["climate", "Health"] }),
    viewerSearchAreas: ["b2b_sales"],
    candidateCapability: [{ area_id: "b2b_sales", ownership_wish: null }],
  });
  assert.deepEqual(out.why.map((p) => p.claim), [
    "FIND.WHY.ROLE_SOUGHT_BY_THEM",
    "FIND.WHY.ROLE_SOUGHT_BY_YOU",
    "FIND.WHY.CAPABILITY_IN_YOUR_SEARCH",
    "FIND.WHY.SHARED_INDUSTRY",
  ]);
  assert.deepEqual(out.why[2].values.areas, ["b2b_sales"]);
  assert.deepEqual(out.why[3].values.industries, ["climate"]);
});

test("Verantwortungswunsch nur, wenn er sichtbar ist - Wunsch gegen Wunsch, keine Fähigkeit", () => {
  const base = {
    viewer: person(),
    candidate: person(),
    viewerCapability: [{ area_id: "finance", ownership_wish: "prefer_other" }, { area_id: "product", ownership_wish: "own" }],
  };
  // Vor einem angenommenen Kontakt liefert get_disclosed_capability keinen Wunsch.
  const hidden = conversationPoints({ ...base, candidateCapability: [{ area_id: "finance", ownership_wish: null }, { area_id: "product", ownership_wish: null }] });
  assert.equal(hidden.why.length + hidden.discuss.length, 0);
  const visible = conversationPoints({ ...base, candidateCapability: [{ area_id: "finance", ownership_wish: "own" }, { area_id: "product", ownership_wish: "own" }] });
  assert.deepEqual(visible.why.map((p) => p.claim), ["FIND.WHY.OWNERSHIP_YOU_HAND_OVER"]);
  assert.deepEqual(visible.discuss.map((p) => p.claim), ["FIND.DISCUSS.BOTH_WANT_TO_OWN"]);
  // Ein Bereich ohne Wunsch, aber mit hoher Erfahrung, ist keine Verantwortung.
  const experienceOnly = conversationPoints({ ...base, candidateCapability: [{ area_id: "product", ownership_wish: "contribute" }] });
  assert.equal(experienceOnly.discuss.length, 0);
});

test("Früh besprechen: nur aus ausdrücklichen Unterschieden", () => {
  const out = conversationPoints({
    viewer: person({ ownRoles: ["product"], searchIntent: "ready_now", startHorizon: "now", availabilityHoursPerWeek: 40, remoteMode: "onsite" }),
    candidate: person({ ownRoles: ["product"], searchIntent: "open_later", startHorizon: "later_or_flexible", availabilityHoursPerWeek: 10, remoteMode: "remote" }),
  });
  assert.deepEqual(out.discuss.map((p) => p.claim), [
    "FIND.DISCUSS.SAME_OWN_ROLE",
    "FIND.DISCUSS.SEARCH_INTENT_DIFFERS",
    "FIND.DISCUSS.START_HORIZON_DIFFERS",
    "FIND.DISCUSS.AVAILABILITY_DIFFERS",
  ], "höchstens vier Punkte, feste Reihenfolge");
  // Kleine Zeitunterschiede sind kein Klärungspunkt; "flexibel" ist kein Gegensatz.
  const small = conversationPoints({
    viewer: person({ availabilityHoursPerWeek: 20, remoteMode: "flexible" }),
    candidate: person({ availabilityHoursPerWeek: 29, remoteMode: "remote" }),
  });
  assert.equal(small.discuss.length, 0);
});

test("Workstyle: nur das bestehende Discovery-Signal DISCUSSION_POINT, höchstens zwei", () => {
  const out = conversationPoints({
    viewer: person(),
    candidate: person(),
    workstyleSignals: [
      { area_key: "EVI", pattern: "SIMILAR_PATTERN" },
      { area_key: "EL", pattern: "DISCUSSION_POINT" },
      { area_key: "VOICE", pattern: "INSUFFICIENT_DATA" },
      { area_key: "AMB", pattern: "DISCUSSION_POINT" },
      { area_key: "ORG", pattern: "DISCUSSION_POINT" },
    ],
  });
  assert.equal(out.why.length, 0, "Ähnlichkeit ist kein Grund, der als Vorteil formuliert wird");
  assert.deepEqual(out.discuss.map((p) => p.claim), ["FIND.DISCUSS.WORKSTYLE.EL", "FIND.DISCUSS.WORKSTYLE.AMB"]);
});

test("kein Score, keine Gewichtung, keine Sortierung im Baustein", () => {
  const promptModule = code("src/features/find/conversationPrompts.ts");
  assert.doesNotMatch(promptModule, /score|weight|rank|relevance|\.sort\(|Math\.(max|min)\(/i);
  const points = conversationPoints({
    viewer: person({ ownRoles: ["tech"], seekingRoles: ["sales"] }),
    candidate: person({ ownRoles: ["sales"], seekingRoles: ["tech"] }),
  });
  for (const point of [...points.why, ...points.discuss]) assert.deepEqual(Object.keys(point).sort(), ["claim", "key", "values"]);
});

// --- Claim-Grenzen in der sichtbaren Copy ---

function values(o: unknown): string[] {
  return typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(values) : [];
}
const FIT = /passt gut|passt zu dir|zu dir passen|kompatib|compatib|hohes Potenzial|high potential|perfekte[rn]? Co-?Founder|perfect co-?founder|Konfliktrisiko|conflict risk|starke Ergänzung|strong complement|Synergie|synerg|Matchpunkt|match score|\d+\s*%/i;

for (const locale of ["de", "en"]) {
  test(`${locale}: FIND-Copy ohne Fit-, Score- oder Konfliktsprache`, () => {
    const find = json(`messages/${locale}/find.json`);
    const discovery = json(`messages/${locale}/discovery.json`);
    const { readiness: _r, feedback: _f, ...journey } = discovery.matchingPreparation;
    // Der Consent-Text verneint die Zahl ausdruecklich - er wird gesondert geprueft.
    const { consentText, ...workstyle } = find.workstyle;
    assert.match(consentText, locale === "de" ? /keine Kompatibilitätszahl und kein Ranking/ : /no compatibility score or working-style ranking/i);
    const visible = values({
      conversation: find.conversation,
      workstyle,
      detail: discovery.detail,
      cards: discovery.v2.cards,
      explore: discovery.v2.explore,
      results: discovery.v2.results,
      sortNote: discovery.v2.sortNote,
      title: discovery.v2.title,
      visibility: discovery.profile.visibility,
      journey,
    }).join("\n");
    assert.doesNotMatch(visible, FIT);
    // Die Unterzeile verneint den Match ausdrücklich.
    assert.match(discovery.v2.subtitle, locale === "de" ? /^Nicht der perfekte Match/ : /^Not the perfect match/);
    // Sortierung wird offen gesagt.
    assert.match(discovery.v2.sortNote, locale === "de" ? /keine Rangfolge nach Passung und keinen Score/ : /no ranking by fit and no score/);
  });

  test(`${locale}: Capability-Texte behaupten keine Kompetenz und keine Rolle`, () => {
    const find = json(`messages/${locale}/find.json`);
    const discovery = json(`messages/${locale}/discovery.json`);
    assert.doesNotMatch(find.conversation.why.capabilityInYourSearch, /Erfahrung|Expert|kompetent|kann |experience|expert|skilled/i);
    assert.doesNotMatch(values(discovery.detail.capability).join(" "), /Expert|Lead\b|Leitung/i);
    // Fremdes Profil: Verantwortungswünsche in der dritten Person.
    assert.doesNotMatch(values(discovery.detail.capability.ownership).join(" "), /\b(ich|mein)\b|\bI\b|\bmy\b/i);
    assert.match(discovery.detail.capability.note, locale === "de" ? /keine geprüfte Kompetenz und keine vereinbarte Rolle/ : /not verified competence and not an agreed role/);
  });

  test(`${locale}: Suchintention wird nicht als Motivation gedeutet`, () => {
    const find = json(`messages/${locale}/find.json`);
    assert.doesNotMatch(values(find.conversation.discuss).join(" "), /unmotiviert|nicht ernst|halbherzig|ernsthafter|unmotivated|not serious|half-hearted/i);
  });
}

test("DE/EN-Parität der neuen FIND-Texte", () => {
  const keys = (o: unknown, p = ""): string[] =>
    o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k)) : [p];
  for (const [file, pick] of [
    ["find.json", (d: Record<string, unknown>) => d.conversation],
    ["discovery.json", (d: Record<string, Record<string, unknown>>) => ({ detail: d.detail, mp: d.matchingPreparation, vis: (d.profile as Record<string, unknown>).visibility })],
  ] as const) {
    const de = keys(pick(json(`messages/de/${file}`))).sort();
    const en = keys(pick(json(`messages/en/${file}`))).sort();
    assert.deepEqual(de, en, file);
  }
});

test("Workstyle-Bereichsnamen in FIND entsprechen dem Bericht (Phase 10B)", () => {
  for (const locale of ["de"]) {
    const areas = json(`messages/${locale}/find.json`).workstyle.areas;
    for (const area of AREAS) assert.equal(areas[area.key], area.team, area.key);
  }
});

// --- Seitenstruktur ---

const DETAIL = "src/app/(product)/discovery/[profileId]/page.tsx";
const LIST = "src/app/(product)/discovery/page.tsx";
const MATCHING = "src/app/(product)/discovery/intros/[introRequestId]/matching/page.tsx";
const PROFILE = "src/app/(product)/discovery/profile/page.tsx";

test("Detailseite: Gesprächspunkte aus echten Daten, eigene Suche bleibt privat", () => {
  const page = code(DETAIL);
  assert.match(page, /conversationPoints\(\{/);
  assert.match(page, /viewerSearchAreas: ownSearch\?\.mustHaves\.requiredCapabilityAreasAny/);
  assert.match(page, /candidateCapability: disclosedCapability/);
  assert.match(page, /getDisclosedCapability\(supabase, profile\.userId, "discovery"\)/);
  assert.match(page, /getDiscoveryWorkstyleSignals\(supabase, profile\.userId\)/);
  assert.match(src("src/features/find/ConversationPoints.tsx"), /data-claim=\{point\.claim\}/);
  // Verantwortungswünsche in dritter Person, nicht die Ich-Labels des eigenen Profils.
  assert.match(page, /ownershipLabel: \(wish\) => t\(`detail\.capability\.ownership\.\$\{wish\}`\)/);
});

test("keine doppelte Anfrage: eingehende Anfrage ersetzt das Anfrageformular", () => {
  const page = code(DETAIL);
  assert.match(page, /getIncomingDiscoveryIntroRequestFromUser\(user\.id, profile\.userId\)/);
  assert.match(page, /isOwner \|\| introRequest \|\| incomingRequest \? null : \(/);
  assert.match(page, /<IncomingIntroCard request=\{incomingRequest\}/);
  const data = code("src/features/discovery/discoveryIntroData.ts");
  assert.match(data, /\.eq\("requester_user_id", normalizedRequester\)\s*\.eq\("recipient_user_id", normalizedUserId\)\s*\.in\("status", \["pending", "accepted"\]\)/);
});

test("Liste: neutrale Sortierung offen gelegt, keine Rangfolge-Logik", () => {
  assert.match(code(LIST), /t\("v2\.sortNote"\)/);
  const migration = src("../supabase/migrations/20261091120000_search_by_frame.sql");
  assert.match(migration, /order by profile\.published_at desc nulls last, profile\.id/);
  for (const gone of ["src/features/discovery/discoveryRecommendation.ts", "src/features/find/matchData.ts"])
    assert.equal(existsSync(gone), false, `${gone} ist entfernt`);
  for (const file of [LIST, DETAIL, "src/features/discovery/FounderDiscoveryCard.tsx", "src/features/discovery/discoveryData.ts"])
    assert.doesNotMatch(code(file), /rankingScore|discoveryRecommendation|getCandidateMatch|SUPABASE_SERVICE_ROLE_KEY/, file);
});

test("Founder Card: höchstens zwei Gesprächsanlässe, kein Score", () => {
  const card = code("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.match(card, /<ConversationPoints points=\{why\} kind="why" candidateName=\{profile\.displayName\} variant="card" \/>/);
  assert.match(src("src/features/find/ConversationPoints.tsx"), /points\.slice\(0, 2\)/);
  assert.doesNotMatch(card, /score|percent|%\s*Match/i);
});

test("nach dem Intro: aktueller Teambereich, keine alte Matching-Session, keine hartkodierten Texte", () => {
  const page = code(MATCHING);
  assert.match(page, /open_discovery_workstyle_team/);
  assert.doesNotMatch(page, /createMatchingSessionFromDiscoveryStartAction|createMatchingReportRunFromSessionAction|getMatchingSessionForDiscoveryStart/);
  assert.doesNotMatch(page, /Euer Zusammenspiel öffnen|Zu euren Anfragen|Der Teambereich konnte nicht/);
  assert.match(page, /t\("matchingPreparation\.team\.title", \{ name: otherProfile\.displayName \}\)/);
});

test("eigenes FIND-Profil: kein Prozentbalken, klar was andere sehen", () => {
  const page = code(PROFILE);
  assert.doesNotMatch(page, /role="progressbar"|percent/);
  assert.match(page, /t\("profile\.visibility\.title"\)/);
  assert.match(page, /capability_disclosure/);
  assert.match(page, /workstyle_discovery_consent_version/);
  assert.match(page, /photo_visible_to_members/);
});
