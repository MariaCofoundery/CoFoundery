import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  findBasePool,
  GLOBAL_FIND_SHADOW_FLAG,
  ID_CHUNK_SIZE,
  isGlobalFindMatchingShadowEnabled,
  loadFindMatchingPopulation,
  paginateFindShadow,
  POPULATION_PAGE_SIZE,
  rankGlobalFindShadow,
  runGlobalFindMatchingShadow,
  scheduleGlobalFindMatchingShadow,
  type FindMatchingPopulation,
} from "@/features/discovery/findMatchingGlobalShadow";
import {
  aggregateFindShadowEvaluations,
  currentFindRpcOrder,
  evaluateFindShadow,
  evaluateFindShadowPopulation,
} from "@/features/discovery/findShadowEvaluation";
import { EMPTY_MUST_HAVES } from "@/lib/matching/v01/adapters";
import { FIND_CTX, person } from "@/lib/matching/v01/__tests__/helpers/builders";

/**
 * Globaler FIND-Shadow (E2): Basispool, Loader, globales Ranking, Seiten danach,
 * Auswertung nur als Kennzahlen.
 */

const read = (path: string) => readFileSync(path, "utf8");
const NOW = () => new Date("2026-10-16T10:00:00.000Z");
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const VIEWER = uid(1);

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
type Call = { table: string; select?: string; in?: unknown[]; range?: [number, number] };

function fdp(n: number, o: Row = {}): Row {
  return {
    user_id: uid(n), status: "active", own_roles: ["tech"], seeking_roles: ["sales"], expertise: [], location_region: "Berlin",
    remote_mode: "remote", availability_hours_per_week: 30, availability_flexibility: null, commitment_level: "part_time",
    venture_stage: "idea_validating", venture_goal: "profitable_business", search_intent: "ready_now", start_horizon: "now",
    published_at: `2026-09-${String((n % 28) + 1).padStart(2, "0")}T00:00:00Z`, updated_at: "2026-10-01T00:00:00Z",
    display_name: `Name ${n}`, bio: "Bio", ...o,
  };
}
const core = (n: number, o: Row = {}): Row => ({
  user_id: uid(n), industries: [], expertise: [], location_region: "Berlin", remote_mode: "remote",
  capability_disclosure: "private", capability_matching_allowed: false, ...o,
});

function world(count: number, overrides: (t: Tables) => void = () => {}): Tables {
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const t: Tables = {
    founder_discovery_profiles: ids.map((n) => fdp(n, n === 1 ? { own_roles: ["sales"], seeking_roles: ["tech"] } : {})),
    profiles: ids.map((n) => ({ user_id: uid(n), roles: ["founder"] })),
    person_core: ids.map((n) => core(n)),
    founder_search_preferences: [],
    network_blocks: [],
    person_capability_entries: [],
    capability_areas: [{ area_id: "b2b_sales", family_id: "commercial" }],
    discovery_intro_requests: [],
    network_contact_requests: [],
  };
  overrides(t);
  return t;
}

function fakeClient(tables: Tables, fail: Record<string, true> = {}) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table };
      calls.push(call);
      let rows = [...(tables[table] ?? [])];
      const chain = {
        select(columns: string) {
          call.select = columns;
          return chain;
        },
        eq(column: string, value: unknown) {
          rows = rows.filter((r) => r[column] === value);
          return chain;
        },
        in(column: string, values: unknown[]) {
          call.in = values;
          rows = rows.filter((r) => values.includes(r[column]));
          return chain;
        },
        order(column: string) {
          rows = [...rows].sort((a, b) => String(a[column] ?? "").localeCompare(String(b[column] ?? "")));
          return chain;
        },
        range(from: number, to: number) {
          call.range = [from, to];
          rows = rows.slice(from, Math.min(to + 1, from + POPULATION_PAGE_SIZE));
          return chain;
        },
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          const result = fail[table] ? { data: null, error: { code: "x" } } : { data: rows, error: null };
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  return { client: client as never, calls };
}

const load = (tables: Tables, options = {}) => loadFindMatchingPopulation(fakeClient(tables).client, options);

// ---------------------------------------------------------------------------
// Basispool: nur Produkt-/Access-Gates
// ---------------------------------------------------------------------------
test("Basispool: kein self, nur aktive Profile, Founder-Rolle, keine Blockierung", async () => {
  const population = await load(
    world(8, (t) => {
      t.founder_discovery_profiles.push({ ...fdp(9), status: "paused" });
      t.profiles[2] = { user_id: uid(3), roles: ["advisor"] };
      t.network_blocks.push({ blocker_user_id: uid(4), blocked_user_id: VIEWER }, { blocker_user_id: VIEWER, blocked_user_id: uid(5) });
      t.network_blocks.push({ blocker_user_id: uid(6), blocked_user_id: uid(7) });
    }),
  );
  const pool = findBasePool(population, VIEWER);
  assert.ok(pool);
  const ids = pool.candidates.map((c) => c.userId);
  assert.ok(!ids.includes(VIEWER), "kein self");
  assert.ok(!ids.includes(uid(9)), "pausiert ist nicht im Pool");
  assert.ok(!ids.includes(uid(3)), "ohne Founder-Rolle");
  assert.ok(!ids.includes(uid(4)) && !ids.includes(uid(5)), "Blockierung in beide Richtungen");
  assert.ok(ids.includes(uid(6)) && ids.includes(uid(7)), "fremde Blockierungen betreffen den Pool nicht");
  assert.deepEqual(pool.stats, { activeProfiles: 8, baseCandidates: 4, excludedNoFounderRole: 1, excludedBlocked: 2 });
});

test("Basispool wendet keine privaten Must-haves an - das macht das Gate", async () => {
  const population = await load(
    world(3, (t) => {
      t.founder_search_preferences.push({ user_id: uid(2), must_haves: { requiredRolesAny: ["design"] } });
      t.founder_search_preferences.push({ user_id: VIEWER, must_haves: { requiredRolesAny: ["design"] } });
    }),
  );
  assert.deepEqual(findBasePool(population, VIEWER)?.candidates.map((c) => c.userId), [uid(2), uid(3)]);
  const run = runGlobalFindMatchingShadow(population, VIEWER, { now: NOW });
  assert.equal(run.statusById.get(uid(2)), "ineligible");
  assert.equal(run.ranked.length, 0, "Gate vor Ranking");
});

test("Betrachter ohne aktives Profil oder Founder-Rolle: kein Lauf", async () => {
  const noRole = await load(world(3, (t) => (t.profiles[0] = { user_id: VIEWER, roles: ["advisor"] })));
  assert.equal(runGlobalFindMatchingShadow(noRole, VIEWER).status, "viewer_not_in_pool");
  const paused = await load(world(3, (t) => (t.founder_discovery_profiles[0] = { ...fdp(1), status: "paused" })));
  assert.equal(runGlobalFindMatchingShadow(paused, VIEWER).status, "viewer_not_in_pool");
});

// ---------------------------------------------------------------------------
// Loader: set-basiert, blättert, keine N+1, minimal
// ---------------------------------------------------------------------------
test("Loader blättert über die 1000-Zeilen-Grenze und teilt ID-Listen", async () => {
  const fake = fakeClient(world(2350));
  const population = await loadFindMatchingPopulation(fake.client);
  assert.equal(population.profiles.size, 2350, "nichts abgeschnitten");
  assert.equal(population.founders.size, 2350);
  assert.equal(fake.calls.filter((c) => c.table === "founder_discovery_profiles").length, 3);
  assert.ok(fake.calls.filter((c) => c.in).every((c) => (c.in as unknown[]).length <= ID_CHUNK_SIZE));
  const perChunk = Math.ceil(2350 / ID_CHUNK_SIZE);
  assert.equal(fake.calls.filter((c) => c.table === "person_core").length, perChunk);
  assert.equal(population.queryCount, 3 + perChunk * 3 + 1, "Profile + 3 je Block + Blockierungen");
});

test("Abfragen wachsen nicht je Kandidat", async () => {
  const small = await load(world(20));
  const large = await load(world(180));
  assert.equal(small.queryCount, large.queryCount, "unter einer Blockgröße gleich viele Abfragen");
});

test("Loader liest nur Matching-Spalten, kein Workstyle, keine Research-Daten, keine Texte", async () => {
  const fake = fakeClient(world(5, (t) => {
    t.assessments = [{ user_id: uid(2) }];
    t.workstyle_research_responses = [{ user_id: uid(2) }];
  }));
  await loadFindMatchingPopulation(fake.client, { withConnections: true });
  const tables = new Set(fake.calls.map((c) => c.table));
  for (const t of tables) assert.doesNotMatch(t, /workstyle|assessment|research|alignment|direction|resources|messages/);
  const profileSelect = fake.calls.find((c) => c.table === "founder_discovery_profiles")?.select ?? "";
  assert.doesNotMatch(profileSelect, /display_name|headline|bio|recent_step|availability_condition|role_other/);
  assert.ok(!(fake.calls.find((c) => c.table === "founder_search_preferences")?.select ?? "").includes("workstyle"));
});

test("Capability-Einträge nur für Personen mit Matching-Freigabe", async () => {
  const fake = fakeClient(
    world(4, (t) => {
      t.person_core[1] = core(2, { capability_matching_allowed: true, capability_disclosure: "areas" });
      t.person_core[2] = core(3, { capability_disclosure: "areas_depth_on_contact" });
    }),
  );
  await loadFindMatchingPopulation(fake.client);
  assert.deepEqual(fake.calls.find((c) => c.table === "person_capability_entries")?.in, [uid(2)]);
  const none = fakeClient(world(4));
  await loadFindMatchingPopulation(none.client);
  assert.ok(!none.calls.some((c) => c.table === "person_capability_entries" || c.table === "capability_areas"));
});

test("Ladefehler jeder Quelle: Fehler statt leerer Daten", async () => {
  for (const table of ["founder_discovery_profiles", "profiles", "person_core", "founder_search_preferences", "network_blocks"]) {
    await assert.rejects(loadFindMatchingPopulation(fakeClient(world(5), { [table]: true }).client), /population_load_failed/, table);
  }
});

// ---------------------------------------------------------------------------
// Globales Ranking und Seiten danach
// ---------------------------------------------------------------------------
test("relevanter Kandidat außerhalb der alten Seite 1 erreicht die neuen Top 12", async () => {
  // 30 Kandidaten; der einzig wirklich passende (sucht, was die Person anbietet) ist am ältesten veröffentlicht
  const population = await load(
    world(31, (t) => {
      for (const row of t.founder_discovery_profiles.slice(1)) Object.assign(row, { own_roles: ["design"], seeking_roles: ["design"] });
      Object.assign(t.founder_discovery_profiles[30], { own_roles: ["tech"], seeking_roles: ["sales"], published_at: "2020-01-01T00:00:00Z" });
    }),
  );
  const run = runGlobalFindMatchingShadow(population, VIEWER, { now: NOW });
  const visible = currentFindRpcOrder(EMPTY_MUST_HAVES, [...population.profiles.values()].filter((p) => p.userId !== VIEWER).map((p) => ({ ...p, searchIntent: p.searchIntent ?? null, startHorizon: p.startHorizon ?? null })));
  assert.ok(Array.isArray(visible));
  assert.ok(visible.indexOf(uid(31)) >= 12, "heute nicht auf Seite 1");
  assert.equal(run.ranked[0].result.subject.b, uid(31), "v0.1: Rang 1");
  assert.equal(paginateFindShadow(run.ranked, 1).items[0].result.subject.b, uid(31));
});

test("Seiten erst nach dem globalen Ranking, deterministisch über Läufe und Eingabereihenfolge", async () => {
  const tables = world(40);
  const a = runGlobalFindMatchingShadow(await load(tables), VIEWER, { now: NOW });
  const shuffled = { ...tables, founder_discovery_profiles: [...tables.founder_discovery_profiles].reverse() };
  const b = runGlobalFindMatchingShadow(await load(shuffled), VIEWER, { now: NOW });
  const pages = (run: typeof a) => [1, 2, 3, 4].map((p) => paginateFindShadow(run.ranked, p).items.map((r) => [r.rank, r.result.subject.b, r.tieGroup]));
  assert.deepEqual(pages(a), pages(b));
  const all = pages(a).flat().map((x) => x[1]);
  assert.equal(new Set(all).size, all.length, "keine Doppelten über Seitengrenzen");
  assert.equal(all.length, a.ranked.length);
});

test("Gleichstände stabil: gleiche tieGroup, Reihenfolge nach Veröffentlichung, dann ID", () => {
  const viewer = person("v", { seekingRoles: ["tech"] });
  const same = (id: string, publishedAt: string | null) => person(id, { ownRoles: ["tech"], publishedAt });
  const { ranked } = rankGlobalFindShadow(viewer, [same("c", "2026-09-01"), same("a", "2026-09-01"), same("b", "2026-10-01"), same("d", null)], {
    familyOfArea: FIND_CTX.familyOfArea,
    computedAt: "2026-10-16",
  });
  assert.deepEqual(ranked.map((r) => r.result.subject.b), ["b", "a", "c", "d"]);
  assert.equal(new Set(ranked.map((r) => r.tieGroup)).size, 1);
});

test("Pagination: Seitenzahl, Grenzen, letzte Seite", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  assert.deepEqual({ ...paginateFindShadow(items, 1), items: undefined }, { page: 1, pageSize: 12, totalEligible: 25, totalPages: 3, items: undefined });
  assert.deepEqual(paginateFindShadow(items, 3).items, [24]);
  assert.equal(paginateFindShadow(items, 99).page, 3);
  assert.equal(paginateFindShadow(items, 0).page, 1);
  assert.deepEqual(paginateFindShadow([], 1), { page: 1, pageSize: 12, totalEligible: 0, totalPages: 1, items: [] });
});

// ---------------------------------------------------------------------------
// Heutige Suche nachgebildet
// ---------------------------------------------------------------------------
test("RPC-Nachbildung: fehlende Werte schließen aus, Capability-Suche nicht vergleichbar, Sortierung published_at", () => {
  const c = (userId: string, o: Record<string, unknown> = {}) => ({
    userId, publishedAt: "2026-09-01", ownRoles: ["tech"], expertise: ["Vertrieb"], locationRegion: "Berlin", remoteMode: "remote",
    availabilityHoursPerWeek: 20, searchIntent: "ready_now", startHorizon: "now", ...o,
  });
  const candidates = [c("x", { searchIntent: null }), c("y", { publishedAt: "2026-10-01" }), c("z", { publishedAt: null }), c("w")];
  assert.deepEqual(currentFindRpcOrder({ ...EMPTY_MUST_HAVES, acceptedSearchIntents: ["ready_now"] }, candidates), ["y", "w", "z"]);
  assert.deepEqual(currentFindRpcOrder({ ...EMPTY_MUST_HAVES, desiredLocationRegion: " berlin " }, candidates), ["y", "w", "x", "z"]);
  assert.deepEqual(currentFindRpcOrder({ ...EMPTY_MUST_HAVES, minimumAvailabilityHoursPerWeek: 25 }, candidates), []);
  assert.equal(currentFindRpcOrder({ ...EMPTY_MUST_HAVES, requiredCapabilityAreasAny: ["b2b_sales"] }, candidates), "not_comparable");
  const rpc = read("../supabase/migrations/20261091120000_search_by_frame.sql");
  assert.match(rpc, /order by profile\.published_at desc nulls last, profile\.id/);
});

// ---------------------------------------------------------------------------
// Auswertung: nur Zahlen
// ---------------------------------------------------------------------------
test("Auswertung je Person und aggregiert: Kennzahlen, keine IDs, keine Kriterien", async () => {
  const population = await load(
    world(30, (t) => {
      t.founder_search_preferences.push({ user_id: uid(2), must_haves: { requiredRolesAny: ["design"], desiredLocationRegion: "Geheimstadt" } });
      t.founder_search_preferences.push({ user_id: VIEWER, must_haves: { acceptedSearchIntents: ["ready_now"] } });
      t.founder_discovery_profiles[4].search_intent = null;
      t.profiles[5] = { user_id: uid(6), roles: ["advisor"] };
    }),
  );
  const run = runGlobalFindMatchingShadow(population, VIEWER, { now: NOW });
  const visible = currentFindRpcOrder(population.constraints.get(VIEWER) ?? EMPTY_MUST_HAVES, [...population.profiles.values()].filter((p) => p.userId !== VIEWER).map((p) => ({ ...p, searchIntent: p.searchIntent ?? null, startHorizon: p.startHorizon ?? null })));
  assert.ok(Array.isArray(visible));
  const e = evaluateFindShadow(visible, run);
  assert.equal(e.excludedNoFounderRole, 1);
  assert.equal(e.visibleExcludedByV01, 2, "heute sichtbar: Person ohne Founder-Rolle und die mit eigenem Ausschluss");
  assert.equal(e.v01KeptButNotInRpc, 1, "fehlender Suchstand: heute weg, v0.1 uncertain");
  assert.equal(e.uncertain, 1);
  const aggregate = evaluateFindShadowPopulation(population, { now: NOW });
  const s = JSON.stringify(aggregate);
  assert.doesNotMatch(s, /[0-9a-f]{8}-[0-9a-f]{4}-/, "keine IDs");
  for (const secret of ["Geheimstadt", "design", "ready_now", "Berlin", "Name ", "Bio"]) assert.ok(!s.includes(secret), secret);
  const leaves = (v: unknown): unknown[] => (v !== null && typeof v === "object" ? Object.values(v).flatMap(leaves) : [v]);
  assert.ok(leaves(aggregate).every((v) => typeof v === "number" || v === null), "nur Zahlen");
  assert.equal(aggregate.viewers, 29, "nur Founder sind Betrachter; die Person ohne Founder-Rolle nicht");
  assert.equal(evaluateFindShadowPopulation(population, { now: NOW, viewerIds: [uid(6)] }).viewersNotInPool, 1);
});

test("aggregierte Kennzahlen: Anteile und Summen", () => {
  const base = { baseCandidates: 10, excludedNoFounderRole: 0, excludedBlocked: 0, eligible: 6, uncertain: 2, ineligible: 2, visibleTotal: 9, visiblePage1: 9, top12Overlap: 4, shadowTop12NotOnVisiblePage1: 4, visibleExcludedByV01: 3, v01KeptButNotInRpc: 2, positionsCompared: 6, positionsUnchanged: 1, positionsMovedUp: 3, positionsMovedDown: 2, medianAbsPositionChange: 2, tieGroups: 1, candidatesInTies: 2, tieAtRank1: false, tieAcrossPageBoundary: true };
  const a = aggregateFindShadowEvaluations([base, { ...base, tieAtRank1: true }], { notComparable: 1, notInPool: 0 });
  assert.equal(a.viewers, 3);
  assert.equal(a.shareVisibleExcludedByV01, 0.333);
  assert.equal(a.shareV01KeptButNotInRpc, 0.25);
  assert.equal(a.viewersWithTieAtRank1, 1);
  assert.equal(a.viewersWithTieAcrossPageBoundary, 2);
});

// ---------------------------------------------------------------------------
// Flag, Hook, Remote-Sperre
// ---------------------------------------------------------------------------
test("globales Flag: getrennt vom Seiten-Shadow, Standard aus, kein NEXT_PUBLIC", () => {
  assert.equal(isGlobalFindMatchingShadowEnabled({}), false);
  assert.equal(isGlobalFindMatchingShadowEnabled({ MATCHING_FIND_V01_SHADOW_ENABLED: "true" }), false, "der E1-Schalter schaltet E2 nicht ein");
  assert.equal(isGlobalFindMatchingShadowEnabled({ [GLOBAL_FIND_SHADOW_FLAG]: "1" }), false);
  assert.equal(isGlobalFindMatchingShadowEnabled({ [GLOBAL_FIND_SHADOW_FLAG]: "true" }), true);
  assert.equal(isGlobalFindMatchingShadowEnabled({ [`NEXT_PUBLIC_${GLOBAL_FIND_SHADOW_FLAG}`]: "true" }), false);
  let scheduled = 0;
  assert.equal(scheduleGlobalFindMatchingShadow(VIEWER, { env: {}, schedule: () => void scheduled++ }), "disabled");
  assert.equal(scheduled, 0);
});

test("globaler Lauf nach der Antwort: Ergebnis nur beim Beobachter, Fehler nie nach außen", async () => {
  const env = { [GLOBAL_FIND_SHADOW_FLAG]: "true" };
  const tasks: (() => Promise<void>)[] = [];
  const results: unknown[] = [];
  // Seit E3a lädt der Shadow standardmäßig den set-basierten Pool (eigene Suite findMatchingPool.test.ts);
  // hier geht es nur ums Einplanen und Fehlerverhalten, daher der Tabellen-Lader aus E2.
  const loadPopulation = (client: Parameters<typeof loadFindMatchingPopulation>[0]) => loadFindMatchingPopulation(client);
  scheduleGlobalFindMatchingShadow(VIEWER, { env, schedule: (t) => void tasks.push(t), createServiceClient: () => fakeClient(world(5)).client, onResult: (r) => results.push(r), loadPopulation });
  scheduleGlobalFindMatchingShadow(VIEWER, { env, schedule: (t) => void tasks.push(t), createServiceClient: () => fakeClient(world(5), { person_core: true }).client, onResult: (r) => results.push(r), loadPopulation });
  scheduleGlobalFindMatchingShadow(VIEWER, { env, schedule: (t) => void tasks.push(t), createServiceClient: () => null, onResult: (r) => results.push(r), loadPopulation });
  for (const t of tasks) await assert.doesNotReject(t());
  assert.deepEqual(results.map((r) => (r as { status: string; failure?: string | null }).failure ?? null), [null, "load_failed", "service_unavailable"]);
  assert.equal(scheduleGlobalFindMatchingShadow(VIEWER, { env, schedule: () => { throw new Error("no scope"); } }), "not_scheduled");
});

test("Hook: beide Shadows nach der sichtbaren Suche, nicht abgewartet, Rückgabe unverändert", () => {
  const data = read("src/features/discovery/discoveryData.ts");
  const fn = data.slice(data.indexOf("export async function getDiscoveryCandidatesForCurrentUser"), data.indexOf("export async function getDiscoveryExploreProfilesForCurrentUser"));
  assert.match(fn, /\n  scheduleGlobalFindMatchingShadow\(normalizedUserId, \{ schedule: after \}\);/);
  assert.doesNotMatch(fn, /await scheduleGlobalFindMatchingShadow|= scheduleGlobalFindMatchingShadow/);
  assert.ok(fn.indexOf("scheduleGlobalFindMatchingShadow(") > fn.indexOf("const candidates = attachDiscoveryV2AlignmentSignals("));
  assert.match(fn, /return \{\n    candidates,\n    page,\n    pageSize,\n    totalCount,\n    rankingMode: "legacy",\n  \};/);
  assert.equal((data.match(/scheduleGlobalFindMatchingShadow\(/g) ?? []).length, 1);
});

test("Auswertungs-Skript: Remote nur mit Bestätigung, Ausgabe nur Aggregat", () => {
  const script = read("scripts/find-shadow-eval.ts");
  assert.match(script, /!isLocalSupabaseUrl\(url\) && args\.get\("confirm-remote"\) !== host/);
  assert.doesNotMatch(script, /console\.log\([^)]*(population\.profiles|viewerIds|constraints)/);
  assert.match(script, /\.\.\.aggregate/);
  for (const source of ["src/features/discovery/findMatchingGlobalShadow.ts", "src/features/discovery/findShadowEvaluation.ts"]) {
    const s = read(source);
    assert.match(s, /^import "server-only";/);
    assert.doesNotMatch(s, /console\.|\.insert\(|\.upsert\(|\.update\(|\.rpc\(/, `${source}: keine Logs, keine Schreibzugriffe`);
  }
});

// Typprüfung: die Population ist ein reiner Server-Typ
export type _PopulationIsServerOnly = FindMatchingPopulation;
