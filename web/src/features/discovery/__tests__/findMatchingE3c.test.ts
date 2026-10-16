import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { FindCardReason, FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { runGlobalFindMatchingShadow } from "@/features/discovery/findMatchingGlobalShadow";
import { loadFindMatchingPool } from "@/features/discovery/findMatchingPool";
import {
  cardReasonsFromPresented,
  FIND_CARD_REASON_LIMIT,
  getFindCandidatesV01ForCurrentUser,
} from "@/features/discovery/findMatchingRanking";
import { FIND_REASON_POLICY, presentFindReasons, type PresentedMatch } from "@/lib/matching/reasonPresentation";
import { START_HORIZON_ORDER } from "@/lib/matching/v01/version";
import type { FindMatchResult } from "@/lib/matching/v01/types";
import { NOW, rpcClient, uid, V, world, type Row, type World } from "@/features/discovery/__tests__/helpers/findPoolFakes";

/**
 * E3c: sichtbare Produktschicht für FIND v0.1 - rankingMode, Presenter-Reasons nur für die
 * gezeigte Seite, Capability-Freigabe und -Sichtbarkeit, Transparenzhinweis, Legacy unverändert.
 */

const read = (path: string) => readFileSync(path, "utf8");
const json = (path: string) => JSON.parse(read(path));
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/.*$/gm, "");

function sessionClient(w: World) {
  const base = rpcClient(w);
  return Object.assign(Object.create(null), base.client, {
    auth: { getUser: async () => ({ data: { user: { id: V } }, error: null }) },
  }) as never;
}

function loader(w: World) {
  return async (profileIds: string[]): Promise<FounderDiscoveryProfile[]> =>
    profileIds.map((id) => {
      const p = w.profiles.find((x) => x.id === id) as Row;
      return {
        id, userId: p.user_id, status: "active", displayName: `Name ${id}`, headline: "", bio: "", ownRoles: p.own_roles, seekingRoles: p.seeking_roles,
        ownRoleOther: null, seekingRoleOther: null, expertise: [], industries: [], locationRegion: null, remoteMode: "remote",
        availabilityHoursPerWeek: null, availabilityFlexibility: null, availabilityCondition: null, recentStep: null, commitmentLevel: p.commitment_level,
        ventureStage: p.venture_stage, ventureGoal: p.venture_goal, searchIntent: null, startHorizon: p.start_horizon, publishedAt: p.published_at,
        createdAt: "", updatedAt: "",
      } as FounderDiscoveryProfile;
    });
}

async function v01(w: World, page = 1, present?: (r: FindMatchResult) => PresentedMatch) {
  return getFindCandidatesV01ForCurrentUser({
    sessionClient: sessionClient(w),
    expectedUserId: V,
    page,
    loadPageProfiles: loader(w),
    createServiceClient: () => rpcClient(w).client,
    now: NOW,
    presentReasons: present,
  });
}

// ---------------------------------------------------------------------------
// Reasons nur für die gezeigte Seite
// ---------------------------------------------------------------------------
test("Presenter nur für die Kandidaten der Seite - nie für die ganze Population", async () => {
  const w = world(300);
  for (const page of [1, 2]) {
    let calls = 0;
    const result = await v01(w, page, (r) => (calls++, presentFindReasons(r, { side: "a" })));
    assert.ok(result.ok);
    assert.ok(result.page.totalCount > 100, "großer Pool");
    assert.equal(calls, result.page.profiles.length);
    assert.ok(calls <= 12);
    assert.deepEqual([...result.page.reasonsByProfileId.keys()], result.page.profiles.map((p) => p.id), "genau die Karten, in Engine-Reihenfolge");
  }
  let beyond = 0;
  const empty = await v01(w, 999, (r) => (beyond++, presentFindReasons(r, { side: "a" })));
  assert.ok(empty.ok);
  assert.equal(beyond, 0, "leere Seite: kein Presenter");
});

test("Karten-Reasons: nur Presenter-Felder, höchstens drei, je Code einmal, keine internen Codes", async () => {
  const result = await v01(world(120));
  assert.ok(result.ok);
  const all = [...result.page.reasonsByProfileId.values()].flat();
  assert.ok(all.length > 0, "die Fake-Welt erzeugt Reasons");
  for (const reasons of result.page.reasonsByProfileId.values()) {
    assert.ok(reasons.length <= FIND_CARD_REASON_LIMIT);
    assert.equal(new Set(reasons.map((r) => r.messageKey)).size, reasons.length);
  }
  for (const reason of all) {
    assert.deepEqual(Object.keys(reason).sort(), ["data", "labels", "messageKey"]);
    assert.match(reason.messageKey, /^find\.matchingReasons\.FIND_[A-Z_]+$/);
    assert.notEqual(reason.messageKey, "find.matchingReasons.FIND_LIMITED_EVIDENCE");
    const code = reason.messageKey.split(".").pop() as keyof typeof FIND_REASON_POLICY;
    assert.deepEqual(Object.keys(reason.data).sort(), Object.keys(FIND_REASON_POLICY[code].params).sort(), "nur erlaubte Parameter");
  }
  const s = JSON.stringify(all);
  assert.doesNotMatch(s, /score|relevance|mutuality|confidence|eligib|GATE_|tieGroup|secondaryOrder|rank|applicationLevel|application_level|ownership|Geheimbranche|workstyle/i);
});

test("Presenter scheitert -> ganzer v0.1-Pfad scheitert (heutige Suche), nie halbe Reasons", async () => {
  const result = await v01(world(60), 1, () => {
    throw new Error("presenter");
  });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.failure, "presenter_failed");
  assert.ok(!("page" in result), "keine halbe Seite");
});

test("Kürzung für die Karte: Presenter-Reihenfolge, je Code einmal, „anderer Schwerpunkt“ entfällt, ausgeblendet -> nichts", () => {
  const r = (code: string, data: Record<string, string> = {}) => ({ code, visibility: "both" as const, messageKey: `find.matchingReasons.${code}`, data, labels: {} });
  const presented: PresentedMatch = {
    visible: true,
    reasons: [
      r("FIND_ROLE_NEED_COVERED", { role: "other" }),
      r("FIND_ROLE_NEED_COVERED", { role: "tech" }),
      r("FIND_ROLE_NEED_COVERED", { role: "sales" }),
      r("FIND_SAME_INDUSTRY", { industry: "Software" }),
      r("FIND_START_ALIGNED", { horizon: "now" }),
      r("FIND_DIFF_GOAL", { a: "explore", b: "exit_oriented" }),
    ],
  };
  assert.deepEqual(
    cardReasonsFromPresented(presented).map((x) => [x.messageKey.split(".").pop(), x.data]),
    [["FIND_ROLE_NEED_COVERED", { role: "tech" }], ["FIND_SAME_INDUSTRY", { industry: "Software" }], ["FIND_START_ALIGNED", { horizon: "now" }]],
  );
  assert.deepEqual(cardReasonsFromPresented({ visible: false, reasons: presented.reasons }), []);
  assert.deepEqual(cardReasonsFromPresented({ visible: true, reasons: [] }), [], "keine sicheren Reasons -> kein Ersatztext");
});

// ---------------------------------------------------------------------------
// Capability: Freigabe (Wirkung) und Sichtbarkeit (Reason) getrennt
// ---------------------------------------------------------------------------
/** Zwei Personen: V gibt b2b_sales ab, C will es verantworten (Stufe 4). Rollen nur teilweise gedeckt, damit Capability etwas ändern kann. */
function pairWorld(c: { allowed: boolean; disclosure: string; contact?: boolean }, viewerAllowed = true): World {
  const w = world(2);
  const me = w.profiles[0] as Row;
  const other = w.profiles[1] as Row;
  Object.assign(me, { own_roles: ["tech"], seeking_roles: ["sales", "design"] });
  Object.assign(other, { own_roles: ["sales"], seeking_roles: ["tech"] });
  w.core = [
    { ...(w.core[0] as Row), capability_matching_allowed: viewerAllowed, capability_disclosure: "private" },
    { ...(w.core[1] as Row), capability_matching_allowed: c.allowed, capability_disclosure: c.disclosure },
  ];
  w.prefs = [];
  w.entries = [
    { user_id: V, area_id: "b2b_sales", application_level: 1, ownership_wish: "prefer_other" },
    { user_id: uid(2), area_id: "b2b_sales", application_level: 4, ownership_wish: "own" },
  ];
  w.intros = c.contact ? [{ requester_user_id: V, recipient_user_id: uid(2), status: "accepted" }] : [];
  return w;
}
const mutuality = async (w: World) => {
  const pop = (await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V })).population!;
  return runGlobalFindMatchingShadow(pop, V, { now: NOW }).ranked[0].result.relevance.mutuality;
};
const cardReasons = async (w: World): Promise<readonly FindCardReason[]> => {
  const result = await v01(w);
  assert.ok(result.ok);
  return result.page.reasonsByProfileId.get("fdp-2") ?? [];
};
const capabilityReasons = (reasons: readonly FindCardReason[]) => reasons.filter((r) => /FIND_AREA_/.test(r.messageKey));
const withoutEntries = (w: World): World => ({ ...w, entries: w.entries.filter((e) => e.user_id !== uid(2)) });

test("Freigabe an + Sichtbarkeit privat: wirkt im Ranking, aber kein Capability-Reason", async () => {
  const w = pairWorld({ allowed: true, disclosure: "private", contact: true });
  assert.notEqual(await mutuality(w), await mutuality(withoutEntries(w)), "Capability beeinflusst die Reihenfolge");
  assert.deepEqual(capabilityReasons(await cardReasons(w)), []);
});

test("Freigabe an + nur Bereiche sichtbar: kein Capability-Reason (Presenter-Vertrag verlangt Tiefe)", async () => {
  const w = pairWorld({ allowed: true, disclosure: "areas", contact: true });
  assert.notEqual(await mutuality(w), await mutuality(withoutEntries(w)));
  assert.deepEqual(capabilityReasons(await cardReasons(w)), []);
});

test("Freigabe an + Tiefe bei Kontakt: Reason nur mit Kontakt, nur Bereich - keine Stufe, kein Ownership-Rohwert", async () => {
  const noContact = pairWorld({ allowed: true, disclosure: "areas_depth_on_contact", contact: false });
  assert.deepEqual(capabilityReasons(await cardReasons(noContact)), [], "ohne Kontakt nur Bereiche sichtbar");
  const contact = pairWorld({ allowed: true, disclosure: "areas_depth_on_contact", contact: true });
  const reasons = capabilityReasons(await cardReasons(contact));
  assert.equal(reasons.length, 1);
  assert.equal(reasons[0].messageKey, "find.matchingReasons.FIND_AREA_OWN_COVERED");
  assert.deepEqual(reasons[0].data, { area: "b2b_sales" });
  assert.deepEqual(reasons[0].labels, { area: "capability.areaLabels" });
  assert.doesNotMatch(JSON.stringify(reasons), /"4"|\b4\b|"own"|prefer_other|level/);
});

test("Freigabe aus: weder Wirkung im Ranking noch Capability-Reason - auch bei voller Sichtbarkeit", async () => {
  const w = pairWorld({ allowed: false, disclosure: "areas_depth_on_contact", contact: true });
  assert.equal(await mutuality(w), await mutuality(withoutEntries(w)), "nicht freigegeben = nicht vorhanden");
  assert.deepEqual(capabilityReasons(await cardReasons(w)), []);
  const viewerOff = pairWorld({ allowed: true, disclosure: "areas_depth_on_contact", contact: true }, false);
  assert.deepEqual(capabilityReasons(await cardReasons(viewerOff)), [], "eigene Freigabe aus -> kein Reason");
});

// ---------------------------------------------------------------------------
// Labels DE/EN
// ---------------------------------------------------------------------------
const format = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? `{${k}}`);
const lookup = (locale: string, ns: string, value: string) => {
  const [file, key] = ns.split(".");
  return json(`messages/${locale}/${file}.json`)[key]?.[value];
};

test("Labels: jeder Engine-Wert hat in DE/EN eine Beschriftung, die als Satzteil passt", () => {
  const discoveryDe = json("messages/de/discovery.json");
  const values: Record<string, string[]> = {
    "discovery.roles": Object.keys(discoveryDe.roles),
    "find.reasonStartHorizons": [...START_HORIZON_ORDER],
    "find.reasonStagesSelf": Object.keys(discoveryDe.ventureStages),
    "find.reasonStagesOther": Object.keys(discoveryDe.ventureStages),
    "discovery.commitmentLevels": Object.keys(discoveryDe.commitmentLevels),
    "discovery.ventureGoals": Object.keys(discoveryDe.ventureGoals),
    "capability.areaLabels": ["b2b_sales"],
  };
  for (const locale of ["de", "en"]) {
    for (const policy of Object.values(FIND_REASON_POLICY)) {
      for (const rule of Object.values(policy.params)) {
        if (rule.kind !== "label") continue;
        for (const value of values[rule.labelNamespace] ?? assert.fail(`unbekannter Namespace ${rule.labelNamespace}`)) {
          assert.equal(typeof lookup(locale, rule.labelNamespace, value), "string", `${locale}: ${rule.labelNamespace}.${value}`);
        }
      }
    }
  }
  const de = json("messages/de/find.json");
  const en = json("messages/en/find.json");
  const stage = (m: Record<string, Record<string, string>>, tpl: string) =>
    format(tpl, { name: "Anna", stage_a: m.reasonStagesSelf.exploring_ideas, stage_b: m.reasonStagesOther.already_building });
  assert.equal(stage(de, de.matchingReasons.FIND_STAGE_COMPLEMENT), "Anna baut bereits; du prüfst Ideen.");
  assert.equal(stage(en, en.matchingReasons.FIND_STAGE_COMPLEMENT), "Anna is already building; you are exploring ideas.");
  assert.equal(format(de.matchingReasons.FIND_START_ALIGNED, { horizon: de.reasonStartHorizons.next_3_months }), "Ihr wollt beide in den nächsten 3 Monaten starten.");
  assert.equal(format(en.matchingReasons.FIND_START_ALIGNED, { horizon: en.reasonStartHorizons.now }), "You both want to start now or very soon.");
  for (const m of [de, en]) {
    for (const ns of ["reasonStartHorizons", "reasonStagesSelf", "reasonStagesOther"]) {
      assert.deepEqual(Object.keys(m[ns]).sort(), Object.keys(de[ns]).sort(), `${ns}: DE/EN gleich`);
    }
  }
});

test("Copy: Transparenzhinweis und Kartentitel ohne Score-, Fit-, KI- oder Prognose-Sprache", () => {
  const forbidden = /%|score|match|kompatib|compatib|fit\b|passung|beste|best\b|perfekt|perfect|ideal|\bKI\b|\bAI\b|künstlich|artificial|erfolg|success|chance|prognose|predict|\bsterne?\b|\bstars?\b|ampel/i;
  for (const locale of ["de", "en"]) {
    const d = json(`messages/${locale}/discovery.json`).v2;
    const f = json(`messages/${locale}/find.json`);
    for (const text of [d.rankingNote, d.cards.matchingReasons, ...Object.values(f.reasonStartHorizons), ...Object.values(f.reasonStagesSelf), ...Object.values(f.reasonStagesOther)] as string[]) {
      assert.equal(typeof text, "string");
      assert.doesNotMatch(text, forbidden, text);
    }
  }
  const de = json("messages/de/discovery.json").v2.rankingNote as string;
  assert.match(de, /Rollen/);
  assert.match(de, /wenn freigegeben/);
  assert.match(de, /Fehlende Angaben werden nicht automatisch als unpassend gewertet/);
  assert.match(json("messages/en/discovery.json").v2.rankingNote, /Missing details don't automatically count against anyone/);
});

// ---------------------------------------------------------------------------
// rankingMode und Oberfläche (Quelltext - Seiten sind nicht importierbar)
// ---------------------------------------------------------------------------
const searchFn = () => {
  const data = read("src/features/discovery/discoveryData.ts");
  return {
    data,
    search: data.slice(data.indexOf("export async function getDiscoveryCandidatesForCurrentUser"), data.indexOf("export async function getDiscoveryExploreProfilesForCurrentUser")),
    explore: data.slice(data.indexOf("export async function getDiscoveryExploreProfilesForCurrentUser")),
  };
};

test("rankingMode: \"v01\" nur aus dem erfolgreichen v0.1-Zweig, sonst \"legacy\"; kein Fehlergrund", () => {
  const { search, explore } = searchFn();
  const branch = search.slice(search.indexOf("if (v01.ok) {"), search.indexOf('rpc("search_founder_discovery_profiles_v2"'));
  assert.equal((search.match(/rankingMode: "v01"/g) ?? []).length, 1);
  assert.match(branch, /rankingMode: "v01"/);
  assert.match(branch, /matchingReasons: reasons\.get\(profile\.id\) \?\? \[\]/);
  assert.equal((search.match(/rankingMode: "legacy"/g) ?? []).length, 2, "inaktives Profil und heutige Suche");
  assert.match(explore, /rankingMode: "legacy"/);
  assert.doesNotMatch(explore, /rankingMode: "v01"|matchingReasons|isFindV01RankingEnabled/, "Stöbern unverändert");
  // Fehlergrund nur an die Zähler (E3d), nie in eine Rückgabe an die Seite.
  const returns = [...(search.match(/return \{\n[\s\S]*?\n\s*\};/g) ?? []), ...(search.match(/return \{[^\n]*\};/g) ?? [])];
  assert.equal(returns.length, 3, "inaktives Profil, v0.1, heutige Suche");
  for (const r of returns) assert.doesNotMatch(r, /failure|diagnostics/, "kein Fehlergrund und keine Diagnose in der Produktantwort");
  assert.equal((search.match(/v01\.failure/g) ?? []).length, 1);
  assert.match(search, /recordFindRankingObservation\(\s*\{ rankingMode: v01\.ok \? "v01" : "legacy", fallback: v01\.ok \? null : v01\.failure, diagnostics: v01\.diagnostics \}/);
  assert.equal((search.match(/matchingReasons/g) ?? []).length, 1, "Reasons nur im v0.1-Zweig");
  const types = read("src/features/discovery/discoveryTypes.ts");
  assert.match(types, /export type FindRankingMode = "legacy" \| "v01";/);
  assert.match(types, /rankingMode: FindRankingMode;/);
});

test("Suchseite: Transparenzhinweis nur bei rankingMode v01 im Suchmodus; sonst der heutige Satz", () => {
  const page = read("src/app/(product)/discovery/page.tsx");
  assert.match(page, /\{mode === "search" && result\.rankingMode === "v01" \? \(\s*<p[^>]*>\{t\("v2\.rankingNote"\)\}<\/p>\s*\) : \(\s*<p[^>]*>\{t\("v2\.sortNote"\)\}<\/p>\s*\)\}/);
  assert.equal((page.match(/v2\.rankingNote/g) ?? []).length, 1);
  assert.doesNotMatch(page, /isFindV01RankingEnabled|MATCHING_FIND/, "die Seite richtet sich nach der Antwort, nicht nach dem Flag");
});

test("Karte: Reasons nur aus matchingReasons (nur v0.1), ruhig, ohne Ränge, Gleichstände oder Werte", () => {
  const card = read("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.match(card, /\{showMatchReasons && rankingMode === "v01" && \(candidate\.matchingReasons\?\.length \?\? 0\) > 0 \? \(\s*<FindMatchingReasons/);
  const list = read("src/features/discovery/FindMatchingReasons.tsx");
  assert.doesNotMatch(list, /^"use client"/, "Serverkomponente - die Reasons werden nicht als Daten an den Client geschickt");
  assert.match(list, /if \(!t\.has\(reason\.messageKey\)\) return \[\];/, "fehlende Übersetzung -> Reason entfällt");
  assert.match(list, /if \(!t\.has\(key\)\) return \[\];/);
  for (const source of [strip(card), strip(list)]) {
    assert.doesNotMatch(source, /tieGroup|secondaryOrder|\.rank\b|score|mutuality|confidence|percent|%|LIMITED_EVIDENCE|\bSterne?\b|\bstars?\b/i);
  }
});

test("Workstyle bleibt getrennt: kein Matching-Reason, Gesprächsimpulse unverändert", () => {
  assert.ok(Object.keys(FIND_REASON_POLICY).every((code) => !/WORKSTYLE/i.test(code)));
  for (const path of ["src/features/discovery/FindMatchingReasons.tsx", "src/features/discovery/findMatchingRanking.ts"]) {
    assert.doesNotMatch(strip(read(path)), /workstyle/i, path);
  }
  const card = read("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.match(card, /\{showMatchReasons && <DiscoveryWorkstyle candidateId=\{candidate\.profile\.userId\} compact \/>\}/);
});

test("Limited Evidence und Gleichstände bleiben intern", () => {
  assert.equal(FIND_REASON_POLICY.FIND_LIMITED_EVIDENCE.visibility, "internal");
  const presented = presentFindReasons(
    { eligibility: { status: "eligible", reasons: [] }, explanations: [{ code: "FIND_LIMITED_EVIDENCE", params: {}, audience: "a" }] } as unknown as FindMatchResult,
    { side: "a" },
  );
  assert.deepEqual(cardReasonsFromPresented(presented), []);
  const ranking = strip(read("src/features/discovery/findMatchingRanking.ts"));
  assert.doesNotMatch(ranking, /LIMITED_EVIDENCE|tieGroup|secondaryOrder/);
});

// ---------------------------------------------------------------------------
// Kriterien-Chips (einseitig, heutige Suche) und v0.1-Reasons (bilateral) nie gemischt
// ---------------------------------------------------------------------------
test("Karte: legacy -> Kriterien-Chips wie bisher; v01 -> nur „Aus euren Angaben“, keine Chips", () => {
  const card = read("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.match(card, /rankingMode = "legacy",/, "Standard: Karte wie bisher");
  // legacy: der bisherige Chip-Block, unverändert, nur noch an rankingMode === "legacy" gebunden
  assert.match(
    card,
    /\{showMatchReasons && rankingMode === "legacy" && \(candidate\.practicalMatches\?\.length \?\? 0\) > 0 \? \(\s*<section className="mt-5 border-t border-emerald-100 pt-4">\s*<p className="text-xs font-semibold text-emerald-800">\{t\("v2\.cards\.practicalMatches"\)\}<\/p>/,
  );
  // v01: Reasons nur dort; Chips nie
  assert.match(card, /\{showMatchReasons && rankingMode === "v01" && \(candidate\.matchingReasons\?\.length \?\? 0\) > 0 \? \(\s*<FindMatchingReasons/);
  assert.match(card, /title=\{t\("v2\.cards\.matchingReasons"\)\}/);
  assert.equal((card.match(/practicalMatches/g) ?? []).length, 3, "nur der eine Chip-Block (Bedingung, Titel, Liste)");
  // Prop, Typ, Doku, zwei Bedingungen, Rollenpunkte (E3d) - sonst nichts
  assert.equal((card.match(/rankingMode === "v01"/g) ?? []).length, 2, "Reasons und Rollenpunkt-Abgleich");
  assert.equal((card.match(/rankingMode === "legacy"/g) ?? []).length, 1, "nur die Kriterien-Chips");
  // Workstyle und Gesprächsimpulse unabhängig vom Rankingmodus
  assert.match(card, /<ConversationPoints points=\{why\} kind="why" candidateName=\{profile\.displayName\} variant="card" \/>/);
  assert.match(card, /\{showMatchReasons && <DiscoveryWorkstyle candidateId=\{candidate\.profile\.userId\} compact \/>\}/);
  // Reihenfolge der Kartenteile unverändert, Reasons zwischen Gründungsrahmen und Chips
  const order = ['t("v2.cards.brings")', 't("v2.cards.foundingFrame")', "<FindMatchingReasons", 't("v2.cards.practicalMatches")', "<ConversationPoints", "<DiscoveryWorkstyle", 't("common.viewProfile")'];
  const positions = order.map((x) => card.indexOf(x));
  assert.ok(positions.every((x) => x > 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("Suchseite reicht den echten rankingMode an die Karte - Stöbern immer legacy", () => {
  const page = read("src/app/(product)/discovery/page.tsx");
  assert.match(page, /<FounderDiscoveryCard [^>]*showMatchReasons=\{mode === "search"\} viewer=\{profile\} rankingMode=\{mode === "search" \? result\.rankingMode : "legacy"\} \/>/);
  const saved = read("src/app/(product)/discovery/saved/page.tsx");
  assert.doesNotMatch(saved, /rankingMode/, "gemerkte Profile: Karte wie bisher");
});

// ---------------------------------------------------------------------------
// Preview-QA E3d: Gesamtzahl im v0.1-Modus, Status der Freigabe in schmaler Spalte
// ---------------------------------------------------------------------------
test("Gesamtzahl: v0.1 sagt „nach den Angaben beider Seiten“, Legacy-Satz unverändert", () => {
  const page = read("src/app/(product)/discovery/page.tsx");
  assert.match(page, /\{mode === "search" && result\.rankingMode === "v01" \? \(\s*<p className="mt-2 text-sm text-slate-600">\{t\("v2\.results\.countV01", \{ count: result\.totalCount \}\)\}<\/p>\s*\) : \(\s*<p className="mt-2 text-sm text-slate-600">\{t\(mode === "explore" \? "v2\.explore\.count" : "v2\.results\.count", \{ count: result\.totalCount \}\)\}<\/p>\s*\)\}/);
  const de = json("messages/de/discovery.json").v2.results;
  const en = json("messages/en/discovery.json").v2.results;
  // Legacy-Satz bis auf den Singular unverändert (E3d: „Ein Profil entspricht“ statt „entsprechen“).
  assert.equal(de.count, "{count, plural, =0 {Keine Profile entsprechen} =1 {Ein Profil entspricht} other {# Profile entsprechen}} deinen praktischen Filtern.");
  assert.equal(en.count, "{count, plural, =0 {No profiles match} =1 {One profile matches} other {# profiles match}} your practical filters.");
  assert.match(de.countV01, /beider Seiten infrage/);
  assert.match(en.countV01, /both sides' details/);
  for (const text of [de.countV01, en.countV01]) assert.doesNotMatch(text, /%|score|match|kompatib|compatib|fit\b|passung|beste|best\b/i);
});

test("Freigabe: Titel benennt den Schalter, sichtbar nur der Zustand; Farbe wie die übrigen Capability-Eingaben", () => {
  const ui = read("src/features/capability/CapabilityMatchingPermissionSection.tsx");
  assert.match(ui, /aria-labelledby="capability-matching-title"\s*className="h-5 w-5 rounded border-slate-300 accent-violet-600"/);
  assert.match(ui, /<span>\{allowed \? t\("statusOn"\) : t\("statusOff"\)\}<\/span>/);
  assert.doesNotMatch(ui, /toggleLabel/, "keine doppelte Beschriftung");
  for (const locale of ["de", "en"]) assert.equal(json(`messages/${locale}/capability.json`).matchingPermission.toggleLabel, undefined);
  // Benachbarte Radios im Editor tragen dieselbe Farbe.
  assert.match(read("src/app/(product)/profile/page.tsx"), /name="capability_disclosure"[\s\S]{0,200}accent-violet-600/);
});

// ---------------------------------------------------------------------------
// Preview-QA-Bereinigung E3d (zweiter Teil)
// ---------------------------------------------------------------------------
const pr = (code: string, data: Record<string, string> = {}) => ({ code, visibility: "both" as const, messageKey: `find.matchingReasons.${code}`, data, labels: {} });
const codes = (reasons: readonly FindCardReason[]) => reasons.map((r) => r.messageKey.split(".").pop());

test("Reason-Auswahl: drei Unterschiede -> höchstens einer sichtbar", () => {
  const out = cardReasonsFromPresented({
    visible: true,
    reasons: [pr("FIND_DIFF_START", { a: "now", b: "later_or_flexible" }), pr("FIND_DIFF_COMMITMENT", { a: "side_project", b: "full_time" }), pr("FIND_DIFF_GOAL", { a: "explore", b: "venture_scale" })],
  });
  assert.deepEqual(codes(out), ["FIND_DIFF_START"], "der erste in Presenter-Reihenfolge");
});

test("Reason-Auswahl: übrige Reasons zuerst, danach höchstens ein Unterschied - nie von Unterschieden verdrängt", () => {
  // Presenter-Reihenfolge der Engine: Rolle, Start-Unterschied, Phase, Zeit-Unterschied, Ziel-Unterschied
  const reasons = [pr("FIND_ROLE_NEED_COVERED", { role: "product" }), pr("FIND_DIFF_START", { a: "now", b: "next_6_months" }), pr("FIND_STAGE_COMPLEMENT", { stage_a: "idea_validating", stage_b: "exploring_ideas" }), pr("FIND_DIFF_COMMITMENT", { a: "side_project", b: "full_time" }), pr("FIND_DIFF_GOAL", { a: "explore", b: "venture_scale" })];
  assert.deepEqual(codes(cardReasonsFromPresented({ visible: true, reasons })), ["FIND_ROLE_NEED_COVERED", "FIND_STAGE_COMPLEMENT", "FIND_DIFF_START"]);
  const full = [pr("FIND_ROLE_NEED_COVERED", { role: "tech" }), pr("FIND_DIFF_GOAL", { a: "explore", b: "venture_scale" }), pr("FIND_ROLE_NEED_COVERED_REVERSE", { role: "sales" }), pr("FIND_SAME_INDUSTRY", { industry: "Fintech" }), pr("FIND_START_ALIGNED", { horizon: "now" })];
  assert.deepEqual(codes(cardReasonsFromPresented({ visible: true, reasons: full })), ["FIND_ROLE_NEED_COVERED", "FIND_ROLE_NEED_COVERED_REVERSE", "FIND_SAME_INDUSTRY"], "drei übrige -> kein Unterschied");
  assert.deepEqual(codes(cardReasonsFromPresented({ visible: true, reasons: [pr("FIND_UNKNOWN_LOCATION"), pr("FIND_DIFF_GOAL", { a: "explore", b: "venture_scale" })] })), ["FIND_UNKNOWN_LOCATION", "FIND_DIFF_GOAL"]);
});

test("Reason-Auswahl ändert weder Reihenfolge noch Auswahl der Kandidaten", async () => {
  const w = world(120);
  const pop = (await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V })).population!;
  const order = runGlobalFindMatchingShadow(pop, V, { now: NOW }).ranked.map((x) => pop.profiles.get(x.result.subject.b)!.id);
  const ids: string[] = [];
  for (let page = 1; page <= Math.ceil(order.length / 12); page++) {
    const r = await v01(w, page);
    assert.ok(r.ok);
    ids.push(...r.page.profiles.map((p) => p.id));
    for (const reasons of r.page.reasonsByProfileId.values()) {
      assert.ok(reasons.length <= 3);
      assert.ok(codes(reasons).filter((c) => /^FIND_DIFF_/.test(c ?? "")).length <= 1, "höchstens ein Unterschied");
    }
  }
  assert.deepEqual(ids, order, "Engine-Reihenfolge unverändert");
  const sel = read("src/features/discovery/findMatchingRanking.ts");
  assert.match(sel, /FIND_DIFFERENCE_REASON_CODES: ReadonlySet<string> = new Set\(\["FIND_DIFF_START", "FIND_DIFF_COMMITMENT", "FIND_DIFF_GOAL"\]\)/);
});

test("Karte: Rollenpunkt im Gesprächsblock entfällt nur in v0.1 und nur, wenn alle seine Rollen schon als Reason stehen", () => {
  const card = read("src/features/discovery/FounderDiscoveryCard.tsx");
  assert.match(card, /showMatchReasons && rankingMode === "v01"\s*\? \(candidate\.matchingReasons \?\? \[\]\)\.filter\(\(r\) => r\.messageKey === `find\.matchingReasons\.\$\{code\}`\)\.map\(\(r\) => r\.data\.role\)\s*: \[\]/);
  assert.match(card, /\(roles \?\? \[\]\)\.length > 0 && \(roles \?\? \[\]\)\.every\(\(role\) => shown\.has\(role\)\)/);
  assert.match(card, /point\.claim === "FIND\.WHY\.ROLE_SOUGHT_BY_YOU" && coveredBy\("FIND_ROLE_NEED_COVERED", point\.values\.roles\)/);
  assert.match(card, /point\.claim === "FIND\.WHY\.ROLE_SOUGHT_BY_THEM" && coveredBy\("FIND_ROLE_NEED_COVERED_REVERSE", point\.values\.roles\)/);
  assert.equal((card.match(/allWhy\.filter/g) ?? []).length, 1, "nur die zwei Rollen-Claims werden gefiltert");
  assert.match(card, /<ConversationPoints points=\{why\} kind="why"/);
  // Die beiden Claims meinen dieselbe Aussage wie die Reasons:
  const prompts = read("src/features/find/conversationPrompts.ts");
  assert.match(prompts, /soughtByThem = .*\n?[\s\S]*?ROLE_SOUGHT_BY_THEM/);
});

test("Seite außerhalb des Bereichs: neutraler Zustand mit Weg zur ersten Seite; echter Empty State nur bei 0", () => {
  const page = read("src/app/(product)/discovery/page.tsx");
  const i = page.indexOf('(mode === "explore" || isActive) && result.totalCount > 0 ? (');
  assert.ok(i > 0 && i < page.indexOf('t("v2.results.emptyTitle")'), "vor dem echten Empty State");
  const block = page.slice(i, page.indexOf('t("v2.results.emptyTitle")'));
  assert.match(block, /t\("v2\.pagination\.outOfRangeTitle"\)/);
  assert.match(block, /href=\{`\/discovery\?mode=\$\{mode\}`\}/);
  assert.match(block, /t\("v2\.pagination\.firstPage"\)/);
  assert.doesNotMatch(block, /emptyText|reset/);
  const de = json("messages/de/discovery.json").v2.pagination;
  const en = json("messages/en/discovery.json").v2.pagination;
  assert.equal(de.outOfRangeTitle, "Auf dieser Seite gibt es keine Profile mehr.");
  assert.equal(de.firstPage, "Zur ersten Seite");
  assert.equal(en.outOfRangeTitle, "There are no more profiles on this page.");
  assert.equal(en.firstPage, "Go to the first page");
});

test("Ohne eigene Kriterien: v0.1 behauptet nicht „alle Profile“; Legacy-Text unverändert", () => {
  const page = read("src/app/(product)/discovery/page.tsx");
  assert.match(page, /\) : rankingMode === "v01" \? \(\s*<p[^>]*>\{t\("v2\.search\.briefEmptyTextV01"\)\}<\/p>\s*\) : \(\s*<p[^>]*>\{t\("v2\.search\.briefEmptyText"\)\}<\/p>\s*\)\}/);
  assert.match(page, /rankingMode=\{result\.rankingMode\}/);
  const de = json("messages/de/discovery.json").v2.search;
  const en = json("messages/en/discovery.json").v2.search;
  assert.equal(de.briefEmptyTextV01, "Auch ohne eigene Suchkriterien siehst du Profile, die nach den Angaben beider Seiten grundsätzlich infrage kommen.");
  assert.equal(en.briefEmptyTextV01, "Even without search criteria of your own, you'll see profiles that are possible based on both sides' details.");
  assert.match(de.briefEmptyText, /siehst alle aktuell veröffentlichten Profile/, "Legacy unverändert");
  for (const text of [de.briefEmptyTextV01, en.briefEmptyTextV01]) assert.doesNotMatch(text, /alle|all\b|%|score|match|fit\b/i);
});
