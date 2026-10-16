import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { rankGlobalFindShadow, runGlobalFindMatchingShadow } from "@/features/discovery/findMatchingGlobalShadow";
import { loadFindMatchingPool } from "@/features/discovery/findMatchingPool";
import {
  FIND_V01_RANKING_FLAG,
  getFindCandidatesV01ForCurrentUser,
  isFindV01RankingEnabled,
} from "@/features/discovery/findMatchingRanking";
import { rankFindCandidates } from "@/lib/matching/v01/findMatcher";
import { findPerson, regression, synthetic } from "@/lib/matching/v01/__tests__/helpers/synthetic";
import { NOW, rpcClient, uid, V, world, type Row, type World } from "@/features/discovery/__tests__/helpers/findPoolFakes";

/**
 * E3b: v0.1 als produktiver Rankingpfad hinter MATCHING_FIND_V01_RANKING_ENABLED.
 * Routing in discoveryData (Quelltext, nicht importierbar), Dienst mit Fakes, Parität der
 * Ein-Durchlauf-Rechnung.
 */

const read = (path: string) => readFileSync(path, "utf8");

function sessionClient(w: World, sessionUserId: string | null, opts: Parameters<typeof rpcClient>[1] = {}) {
  const base = rpcClient(w, opts);
  const client = Object.assign(Object.create(null), base.client, {
    auth: { getUser: async () => ({ data: { user: sessionUserId ? { id: sessionUserId } : null }, error: null }) },
  });
  return { client: client as never, calls: base.calls };
}

/** Bestehender RLS-Lader, als Fake: liefert volle Profile (mit Bio usw.) für die angefragten IDs. */
function pageLoader(w: World, opts: { drop?: string; fail?: boolean } = {}) {
  const requests: string[][] = [];
  const load = async (profileIds: string[]): Promise<FounderDiscoveryProfile[]> => {
    requests.push(profileIds);
    if (opts.fail) throw new Error("rls");
    // absichtlich in anderer Reihenfolge zurück - der Dienst muss die Engine-Reihenfolge herstellen
    return [...profileIds].reverse().filter((id) => id !== opts.drop).map((id) => {
      const p = w.profiles.find((x) => x.id === id) as Row;
      return {
        id, userId: p.user_id, status: "active", displayName: `Name ${id}`, headline: "Headline", bio: "Lange private Bio",
        ownRoles: p.own_roles, seekingRoles: p.seeking_roles, ownRoleOther: null, seekingRoleOther: null, expertise: ["Vertrieb"],
        industries: ["Software"], locationRegion: "Berlin", remoteMode: "remote", availabilityHoursPerWeek: p.availability_hours_per_week,
        availabilityFlexibility: null, availabilityCondition: null, recentStep: "Letzter Schritt", commitmentLevel: p.commitment_level,
        ventureStage: p.venture_stage, ventureGoal: p.venture_goal, searchIntent: p.search_intent, startHorizon: p.start_horizon,
        publishedAt: p.published_at, createdAt: "2026-01-01", updatedAt: "2026-02-02",
      } as FounderDiscoveryProfile;
    });
  };
  return { load, requests };
}

type FailMode = "pool" | "inputs" | "areas" | "throw";

async function run(w: World, page = 1, o: { session?: string | null; fail?: FailMode; serviceFail?: FailMode; drop?: string; detailFail?: boolean; noService?: boolean } = {}) {
  const session = sessionClient(w, o.session === undefined ? V : o.session, { fail: o.fail });
  const service = rpcClient(w, { fail: o.serviceFail });
  let serviceCreated = 0;
  const loader = pageLoader(w, { drop: o.drop, fail: o.detailFail });
  const result = await getFindCandidatesV01ForCurrentUser({
    sessionClient: session.client,
    expectedUserId: V,
    page,
    loadPageProfiles: loader.load,
    createServiceClient: () => (serviceCreated++, o.noService ? null : service.client),
    now: NOW,
  });
  return { result, session, service, loader, serviceCreated: () => serviceCreated };
}

const engineOrder = async (w: World) => {
  const pop = (await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V })).population!;
  const r = runGlobalFindMatchingShadow(pop, V, { now: NOW });
  return r.ranked.map((x) => pop.profiles.get(x.result.subject.b)!.id);
};

// ---------------------------------------------------------------------------
// Flag
// ---------------------------------------------------------------------------
test("Flag: fehlt/false/ungültig -> Legacy, nur 'true' -> v0.1, nie NEXT_PUBLIC, getrennt von den Shadows", () => {
  assert.equal(isFindV01RankingEnabled({}), false);
  assert.equal(isFindV01RankingEnabled({ [FIND_V01_RANKING_FLAG]: "false" }), false);
  for (const bad of ["1", "yes", "", "on"]) assert.equal(isFindV01RankingEnabled({ [FIND_V01_RANKING_FLAG]: bad }), false, bad);
  assert.equal(isFindV01RankingEnabled({ [FIND_V01_RANKING_FLAG]: "true" }), true);
  assert.equal(isFindV01RankingEnabled({ [`NEXT_PUBLIC_${FIND_V01_RANKING_FLAG}`]: "true" }), false);
  assert.equal(isFindV01RankingEnabled({ MATCHING_FIND_V01_SHADOW_ENABLED: "true", MATCHING_FIND_V01_GLOBAL_SHADOW_ENABLED: "true" }), false);
});

// ---------------------------------------------------------------------------
// Ein Durchlauf je Paar - identisch zur bisherigen Rechnung
// ---------------------------------------------------------------------------
test("Ein-Durchlauf-Rang ist strukturell identisch zu rankFindCandidates und nutzt dieselben Ergebnisse", () => {
  const pool = new Set(regression.pool_ids);
  const people = synthetic.profiles.filter((p) => pool.has(p.id) && p.find_profile?.status === "active").map((p) => findPerson(p));
  const ctx = { familyOfArea: synthetic.family_of, computedAt: "2026-10-16" };
  for (const viewer of people.slice(0, 12)) {
    const others = people.filter((p) => p.personId !== viewer.personId);
    const blocked = new Set([others[3].personId]);
    const { results, ranked } = rankGlobalFindShadow(viewer, others, { ...ctx, blockedPersonIds: blocked });
    const before = rankFindCandidates(viewer, others, { ...ctx, idfCorpusVersion: "none-find-does-not-use-idf", blockedPersonIds: blocked });
    assert.deepEqual(ranked, before, "eligibility, relevance, mutuality, rank, tieGroup, secondaryOrder, explanations");
    assert.ok(ranked.every((r) => results.includes(r.result)), "Rang verwendet die bereits berechneten Ergebnisse (kein zweiter Durchlauf)");
  }
});

// ---------------------------------------------------------------------------
// v0.1-Pfad
// ---------------------------------------------------------------------------
test("v0.1: globaler Rang, dann Seite, Karten nur für die 12 IDs, in Engine-Reihenfolge, als Suchprojektion", async () => {
  const w = world(80);
  const { result, loader } = await run(w, 1);
  assert.ok(result.ok);
  const order = await engineOrder(w);
  assert.equal(result.page.totalCount, order.length, "Gesamtzahl = global zulässige Kandidaten");
  assert.equal(loader.requests.length, 1);
  assert.deepEqual(loader.requests[0], order.slice(0, 12), "nur die IDs der Seite, in Engine-Reihenfolge");
  assert.deepEqual(result.page.profiles.map((p) => p.id), order.slice(0, 12), "Reihenfolge der Engine, nicht published_at");
  for (const p of result.page.profiles) {
    assert.equal(p.bio, "");
    assert.deepEqual(p.industries, []);
    assert.equal(p.recentStep, null);
    assert.equal(p.createdAt, p.publishedAt ?? "");
  }
});

test("Produktantwort ohne Matching-Metadaten", async () => {
  const { result } = await run(world(60), 1);
  assert.ok(result.ok);
  assert.deepEqual(Object.keys(result.page).sort(), ["page", "pageSize", "profiles", "reasonsByProfileId", "totalCount"]);
  const s = JSON.stringify({ ...result.page, reasonsByProfileId: [...result.page.reasonsByProfileId] });
  assert.doesNotMatch(s, /score|relevance|mutuality|confidence|eligib|tieGroup|secondaryOrder|mustHaves|must_haves|requiredRolesAny|matchingAllowed|applicationLevel|application_level|ownershipWish|ownership_wish|Geheimbranche|GATE_|POOL_|LIMITED_EVIDENCE/);
  // Capability nur als Label-Namespace eines Presenter-Reasons, nie in den Karten.
  assert.doesNotMatch(JSON.stringify(result.page.profiles), /capability/);
});

test("Seiten 1/2/3: stabil, keine Doppelten, keine Lücken; außerhalb des Bereichs leer mit Gesamtzahl", async () => {
  const w = world(120);
  const order = await engineOrder(w);
  const pages = [];
  for (let p = 1; p <= Math.ceil(order.length / 12); p++) pages.push((await run(w, p)).result);
  const ids = pages.flatMap((r) => (r.ok ? r.page.profiles.map((x) => x.id) : []));
  assert.deepEqual(ids, order);
  assert.equal(new Set(ids).size, ids.length);
  const again = await run(w, 2);
  assert.ok(again.result.ok && pages[1].ok);
  assert.deepEqual(again.result.page.profiles.map((p) => p.id), pages[1].page.profiles.map((p) => p.id), "gleiche Eingaben, gleiche Seite");
  const beyond = await run(w, 999);
  assert.ok(beyond.result.ok);
  assert.deepEqual(beyond.result.page.profiles, []);
  assert.equal(beyond.result.page.totalCount, order.length);
  assert.equal(beyond.loader.requests.length, 0, "keine Detailabfrage ohne IDs");
});

test("Detail-Lader liefert eine Person nicht (inzwischen pausiert/blockiert): sie entfällt, nichts kommt hinzu", async () => {
  const w = world(40);
  const order = await engineOrder(w);
  const { result } = await run(w, 1, { drop: order[2] });
  assert.ok(result.ok);
  assert.deepEqual(result.page.profiles.map((p) => p.id), order.slice(0, 12).filter((id) => id !== order[2]));
});

test("Ausschlüsse aus dem Pool tauchen nie auf (self, blockiert, keine Founder-Rolle, pausiert)", async () => {
  const w = world(60);
  const all = [];
  for (let p = 1; p <= 5; p++) {
    const r = (await run(w, p)).result;
    if (r.ok) all.push(...r.page.profiles.map((x) => x.userId));
  }
  for (const id of [V, uid(11), uid(12), uid(13), uid(26), uid(17), uid(34)]) assert.ok(!all.includes(id), id);
});

// ---------------------------------------------------------------------------
// Sitzung / Service-Role
// ---------------------------------------------------------------------------
test("Viewer-Spoofing: andere ID als die Sitzung -> kein v0.1, nichts geladen", async () => {
  const w = world(20);
  const spoof = await run(w, 1, { session: uid(2) });
  assert.deepEqual(spoof.result, { ok: false, failure: "viewer_mismatch" });
  assert.equal(spoof.serviceCreated(), 0, "Service-Client gar nicht erst erzeugt");
  assert.equal(spoof.session.calls.length, 0);
  const none = await run(w, 1, { session: null });
  assert.deepEqual(none.result, { ok: false, failure: "session_invalid" });
  assert.equal(none.serviceCreated(), 0);
});

test("Service-Client lädt nur die privaten Inputs; Pool und Vokabular über die Sitzung", async () => {
  const { service, session } = await run(world(30), 1);
  assert.deepEqual([...new Set(service.calls.map((c) => c.name))], ["get_find_matching_inputs"]);
  assert.ok(session.calls.some((c) => c.name === "get_find_matching_pool"));
  assert.ok(!session.calls.some((c) => c.name === "get_find_matching_inputs"));
});

// ---------------------------------------------------------------------------
// Fehler -> Legacy
// ---------------------------------------------------------------------------
test("jede Fehlerart wird benannt - nie ein halbes Ergebnis", async () => {
  const w = world(30);
  assert.deepEqual((await run(w, 1, { fail: "pool" })).result, { ok: false, failure: "pool_failed" });
  assert.deepEqual((await run(w, 1, { fail: "areas" })).result, { ok: false, failure: "pool_failed" });
  assert.deepEqual((await run(w, 1, { serviceFail: "inputs" })).result, { ok: false, failure: "inputs_failed" });
  assert.deepEqual((await run(w, 1, { noService: true })).result, { ok: false, failure: "service_unavailable" });
  assert.deepEqual((await run(w, 1, { detailFail: true })).result, { ok: false, failure: "detail_failed" });
  const paused = world(10);
  (paused.profiles[0] as Row).status = "paused";
  assert.deepEqual((await run(paused, 1)).result, { ok: false, failure: "viewer_not_searching" });
  const broken = world(10);
  (broken.core[1] as Row).industries = 42;
  assert.deepEqual((await run(broken, 1)).result, { ok: false, failure: "engine_failed" });
});

// ---------------------------------------------------------------------------
// Routing in discoveryData (Quelltext)
// ---------------------------------------------------------------------------
test("Routing: Flag aus -> heutige Suche unverändert; v0.1-Fehler -> heutige Suche für diese Anfrage", () => {
  const data = read("src/features/discovery/discoveryData.ts");
  const fn = data.slice(data.indexOf("export async function getDiscoveryCandidatesForCurrentUser"), data.indexOf("export async function getDiscoveryExploreProfilesForCurrentUser"));
  const flag = fn.indexOf("if (isFindV01RankingEnabled()) {");
  const legacy = fn.indexOf('rpc("search_founder_discovery_profiles_v2"');
  assert.ok(flag > 0 && flag < legacy, "Weiche vor der heutigen Suche");
  const branch = fn.slice(flag, legacy);
  assert.match(branch, /expectedUserId: normalizedUserId/);
  assert.match(branch, /loadPageProfiles: \(profileIds\) => getActiveDiscoveryProfilesByIds\(profileIds, supabase\)/);
  assert.match(branch, /if \(v01\.ok\) \{/);
  assert.doesNotMatch(branch, /throw|console\./, "kein Fehler an den Client, keine Logs");
  assert.match(branch, /page: v01\.page\.page,\s*pageSize: v01\.page\.pageSize,\s*totalCount: v01\.page\.totalCount,/);
  assert.match(fn, /return \{\n    candidates,\n    page,\n    pageSize,\n    totalCount,\n    rankingMode: "legacy",\n  \};/, "heutige Rückgabe unverändert");
  assert.equal((data.match(/isFindV01RankingEnabled\(\)/g) ?? []).length, 1, "nur die Suche, nicht das Stöbern");
});

test("Rankingpfad serverseitig, ohne Logs, nicht im Client", () => {
  const source = read("src/features/discovery/findMatchingRanking.ts");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /console\.|\.insert\(|\.update\(|NEXT_PUBLIC/);
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && /from "@\/features\/discovery\/findMatchingRanking"/.test(read(path))) users.push(path);
    }
  };
  walk("src");
  assert.deepEqual(users, [join("src", "features", "discovery", "discoveryData.ts")]);
});
