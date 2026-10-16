import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import {
  computeFindMatchingShadow,
  FIND_SHADOW_FLAG,
  isFindMatchingShadowEnabled,
  scheduleFindMatchingShadow,
  type FindMatchingShadowInput,
  type FindMatchingShadowResult,
} from "@/features/discovery/findMatchingShadow";

/**
 * FIND Matching v0.1 im Shadow Mode: Flag, Datenaufbau, Fehler, Privacy, Pool-Bias.
 * Die sichtbare Suche selbst prüfen die Quelltext-Tests am Ende (discoveryData ist im
 * Node-Testlauf nicht importierbar).
 */

const read = (path: string) => readFileSync(path, "utf8");
const NOW = () => new Date("2026-10-16T10:00:00.000Z");

const V = "00000000-0000-4000-8000-0000000000a0";
const C = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function profile(userId: string, o: Partial<FounderDiscoveryProfile> = {}): FounderDiscoveryProfile {
  return {
    id: `fdp-${userId}`, userId, status: "active", displayName: "x", headline: "", bio: "", ownRoles: ["tech"], seekingRoles: ["sales"],
    ownRoleOther: null, seekingRoleOther: null, expertise: [], industries: [], locationRegion: "Berlin", remoteMode: "remote",
    availabilityHoursPerWeek: 30, availabilityFlexibility: null, availabilityCondition: null, recentStep: null,
    commitmentLevel: "part_time", ventureStage: "idea_validating", ventureGoal: "profitable_business", searchIntent: "ready_now",
    startHorizon: "now", publishedAt: "2026-10-01T00:00:00Z", createdAt: "", updatedAt: "2026-10-01T00:00:00Z", ...o,
  } as FounderDiscoveryProfile;
}

const core = (user_id: string, o: Record<string, unknown> = {}) => ({
  user_id, industries: ["Software"], expertise: ["Vertrieb"], location_region: "Berlin", remote_mode: "remote",
  capability_disclosure: "private", capability_matching_allowed: false, ...o,
});

type Tables = Record<string, Record<string, unknown>[]>;
function baseTables(): Tables {
  return {
    profiles: [V, C(1), C(2), C(4), C(5)].map((user_id) => ({ user_id, roles: ["founder"] })).concat([{ user_id: C(3), roles: ["advisor"] }]),
    person_core: [
      core(V, { capability_matching_allowed: true, expertise: ["Produkt"] }),
      core(C(1), { capability_matching_allowed: true, capability_disclosure: "areas_depth_on_contact" }),
      core(C(2), { capability_disclosure: "areas_depth_on_contact" }),
      core(C(3)), core(C(4)), core(C(5)),
    ],
    founder_search_preferences: [
      { user_id: C(2), must_haves: { requiredRolesAny: ["design"], minimumAvailabilityHoursPerWeek: 37 } },
      { user_id: C(4), must_haves: { requiredIndustriesAny: ["Geheimbranche"], acceptedVentureGoals: ["exit_oriented"] } },
    ],
    network_blocks: [{ blocker_user_id: C(5), blocked_user_id: V }],
    discovery_intro_requests: [{ requester_user_id: V, recipient_user_id: C(1), status: "accepted" }],
    network_contact_requests: [],
    person_capability_entries: [
      { user_id: V, area_id: "b2b_sales", application_level: 1, ownership_wish: "prefer_other" },
      { user_id: C(1), area_id: "b2b_sales", application_level: 5, ownership_wish: "own" },
      { user_id: C(2), area_id: "b2b_sales", application_level: 5, ownership_wish: "own" },
    ],
    capability_areas: [{ area_id: "b2b_sales", family_id: "commercial" }],
  };
}

type Call = { table: string; select?: string; in?: [string, unknown[]] };
function fakeClient(tables: Tables, fail: Record<string, "error" | "throw"> = {}) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table };
      calls.push(call);
      let filters: ((r: Record<string, unknown>) => boolean)[] = [];
      const run = () => {
        if (fail[table] === "throw") return Promise.reject(new Error("netz"));
        if (fail[table] === "error") return Promise.resolve({ data: null, error: { code: "x" } });
        return Promise.resolve({ data: (tables[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null });
      };
      const chain = {
        select(columns: string) {
          call.select = columns;
          return chain;
        },
        in(column: string, values: unknown[]) {
          call.in = [column, values];
          filters = [...filters, (r) => values.includes(r[column])];
          return chain;
        },
        eq(column: string, value: unknown) {
          filters = [...filters, (r) => r[column] === value];
          return chain;
        },
        or(expression: string) {
          const parts = expression.split(",").map((p) => p.split(".eq."));
          filters = [...filters, (r) => parts.some(([col, value]) => r[col] === value)];
          return chain;
        },
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          return run().then(resolve, reject);
        },
      };
      return chain;
    },
  };
  return { client: client as never, calls };
}

function input(o: Partial<FindMatchingShadowInput> = {}): FindMatchingShadowInput {
  return {
    viewerUserId: V,
    viewerProfile: profile(V, { ownRoles: ["sales"], seekingRoles: ["tech"] }),
    viewerMustHaves: null,
    candidates: [C(1), C(2), C(3), C(4), C(5)].map((id) => profile(id)),
    page: 1,
    pageSize: 12,
    rpcTotalCount: 5,
    ...o,
  };
}
const byId = (r: FindMatchingShadowResult, id: string) => r.candidates.find((c) => c.candidateId === id);

// ---------------------------------------------------------------------------
// Flag
// ---------------------------------------------------------------------------
test("Flag: fehlt/false/ungültig -> aus, nur 'true' -> an", () => {
  assert.equal(isFindMatchingShadowEnabled({}), false);
  assert.equal(isFindMatchingShadowEnabled({ [FIND_SHADOW_FLAG]: "false" }), false);
  for (const bad of ["1", "yes", "on", "", "truee"]) assert.equal(isFindMatchingShadowEnabled({ [FIND_SHADOW_FLAG]: bad }), false, bad);
  assert.equal(isFindMatchingShadowEnabled({ [FIND_SHADOW_FLAG]: "true" }), true);
  assert.equal(isFindMatchingShadowEnabled({ [FIND_SHADOW_FLAG]: " TRUE " }), true);
  assert.equal(isFindMatchingShadowEnabled({ [`NEXT_PUBLIC_${FIND_SHADOW_FLAG}`]: "true" }), false, "keine Client-Variable");
});

test("Flag aus: nichts eingeplant, kein Client, keine Abfrage", () => {
  let scheduled = 0;
  let clients = 0;
  const status = scheduleFindMatchingShadow(input(), {
    env: {},
    schedule: () => void scheduled++,
    createServiceClient: () => (clients++, null),
  });
  assert.equal(status, "disabled");
  assert.equal(scheduled, 0);
  assert.equal(clients, 0);
});

test("Flag an: genau ein Lauf nach der Antwort, Ergebnis nur beim Beobachter", async () => {
  const tasks: (() => Promise<void>)[] = [];
  const results: FindMatchingShadowResult[] = [];
  const fake = fakeClient(baseTables());
  const status = scheduleFindMatchingShadow(input(), {
    env: { [FIND_SHADOW_FLAG]: "true" },
    schedule: (task) => void tasks.push(task),
    createServiceClient: () => fake.client,
    onResult: (r) => results.push(r),
  });
  assert.equal(status, "scheduled");
  assert.equal(fake.calls.length, 0, "vor der Antwort wird nichts geladen");
  await tasks[0]();
  assert.equal(results.length, 1);
  assert.equal(results[0].status, "ok");
});

test("Scheduler nicht verfügbar oder Lauf wirft: nie ein Fehler nach außen", async () => {
  const env = { [FIND_SHADOW_FLAG]: "true" };
  assert.equal(scheduleFindMatchingShadow(input(), { env, schedule: () => { throw new Error("no request scope"); } }), "not_scheduled");
  const tasks: (() => Promise<void>)[] = [];
  scheduleFindMatchingShadow(input(), {
    env,
    schedule: (t) => void tasks.push(t),
    createServiceClient: () => { throw new Error("kaputt"); },
  });
  await assert.doesNotReject(tasks[0]());
  const results: FindMatchingShadowResult[] = [];
  scheduleFindMatchingShadow(input(), { env, schedule: (t) => void tasks.push(t), createServiceClient: () => null, onResult: (r) => results.push(r) });
  await tasks[1]();
  assert.equal(results[0].failure, "service_unavailable");
});

// ---------------------------------------------------------------------------
// Engine-Pipeline
// ---------------------------------------------------------------------------
test("echte Eingaben: Gate beidseitig, Pool-Regeln, Blockierung, Rang nur für Zulässige", async () => {
  const r = await computeFindMatchingShadow(input(), fakeClient(baseTables()).client, NOW);
  assert.equal(r.status, "ok");
  assert.equal(r.matchingVersion, "matching-v0.1");
  assert.equal(r.normalizationVersion, "matching-normalization-v0.1");
  assert.equal(byId(r, C(2))?.eligibility, "ineligible", "privates Kriterium des Kandidaten (Gegenrichtung)");
  assert.equal(byId(r, C(3))?.eligibility, "ineligible", "keine Founder-Rolle");
  assert.equal(byId(r, C(5))?.eligibility, "ineligible", "Blockierung");
  for (const id of [C(2), C(3), C(5)]) {
    assert.equal(byId(r, id)?.shadowRank, null);
    assert.deepEqual(byId(r, id)?.reasonCodes, [], "kein Grund für ausgeschlossene Paare");
  }
  assert.ok(byId(r, C(1))?.shadowRank && byId(r, C(4))?.shadowRank);
  assert.deepEqual(r.counts, { candidates: 5, eligible: 2, uncertain: 0, ineligible: 3 });
  assert.deepEqual(r.candidates.map((c) => c.visiblePosition), [1, 2, 3, 4, 5], "sichtbare Reihenfolge nur mitgeschrieben");
  assert.ok(byId(r, C(1))?.reasonCodes.includes("FIND_ROLE_NEED_COVERED"), "Presenter hat das Engine-Ergebnis bekommen");
});

test("keine N+1: feste Zahl Batch-Abfragen, unabhängig von der Seitengröße", async () => {
  const small = fakeClient(baseTables());
  await computeFindMatchingShadow(input({ candidates: [profile(C(1))] }), small.client, NOW);
  const large = fakeClient(baseTables());
  await computeFindMatchingShadow(input(), large.client, NOW);
  assert.equal(large.calls.length, small.calls.length);
  assert.ok(large.calls.length <= 9);
});

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------
test("Capability nur mit Freigabe: Einträge werden nur für freigegebene Personen gelesen", async () => {
  const fake = fakeClient(baseTables());
  const r = await computeFindMatchingShadow(input(), fake.client, NOW);
  const entries = fake.calls.find((c) => c.table === "person_capability_entries");
  assert.deepEqual(entries?.in, ["user_id", [V, C(1)]], "C2 zeigt Bereiche, hat aber keine Matching-Freigabe");
  assert.ok(byId(r, C(1))?.reasonCodes.includes("FIND_AREA_OWN_COVERED"), "Freigabe + Tiefe nach angenommenem Intro");
  assert.ok(!byId(r, C(2))?.reasonCodes.some((c) => c.startsWith("FIND_AREA")));
});

test("Capability ohne Freigabe beim Betrachter: gar keine Capability-Abfrage für ihn", async () => {
  const tables = baseTables();
  tables.person_core = tables.person_core.map((row) => ({ ...row, capability_matching_allowed: false }));
  const fake = fakeClient(tables);
  const r = await computeFindMatchingShadow(input(), fake.client, NOW);
  assert.ok(!fake.calls.some((c) => c.table === "person_capability_entries"));
  assert.ok(!r.candidates.some((c) => c.reasonCodes.some((x) => x.startsWith("FIND_AREA"))));
});

test("Tiefe ohne Verbindung nicht erklärbar, auch mit Freigabe", async () => {
  const tables = baseTables();
  tables.discovery_intro_requests = [];
  const r = await computeFindMatchingShadow(input(), fakeClient(tables).client, NOW);
  assert.ok(!byId(r, C(1))?.reasonCodes.some((x) => x.startsWith("FIND_AREA")));
});

// ---------------------------------------------------------------------------
// Fehler
// ---------------------------------------------------------------------------
test("Ladefehler jeder Quelle: Shadow-Fehler, kein Wurf, keine leeren Kriterien", async () => {
  for (const table of ["founder_search_preferences", "person_core", "profiles", "network_blocks", "discovery_intro_requests", "person_capability_entries"]) {
    for (const mode of ["error", "throw"] as const) {
      const r = await computeFindMatchingShadow(input(), fakeClient(baseTables(), { [table]: mode }).client, NOW);
      assert.equal(r.status, "failed", `${table}/${mode}`);
      assert.equal(r.failure, "load_failed");
      assert.deepEqual(r.candidates, []);
    }
  }
});

test("Engine wirft: Shadow-Fehler, kein Wurf", async () => {
  const broken = { ...profile(C(1)), ownRoles: undefined } as unknown as FounderDiscoveryProfile;
  const r = await computeFindMatchingShadow(input({ candidates: [broken] }), fakeClient(baseTables()).client, NOW);
  assert.equal(r.failure, "engine_failed");
});

test("Eingabe bleibt unverändert (die sichtbaren Kandidaten werden nicht angefasst)", async () => {
  const deepFreeze = <T>(o: T): T => {
    if (o && typeof o === "object") {
      for (const v of Object.values(o)) deepFreeze(v);
      Object.freeze(o);
    }
    return o;
  };
  const frozen = deepFreeze(input());
  const before = JSON.stringify(frozen);
  const r = await computeFindMatchingShadow(frozen, fakeClient(baseTables()).client, NOW);
  assert.equal(r.status, "ok");
  assert.equal(JSON.stringify(frozen), before);
});

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------
test("Shadow-Ergebnis: keine Kriterien, keine Capability-Werte, keine Profile, keine Scores", async () => {
  const r = await computeFindMatchingShadow(
    input({ viewerMustHaves: { requiredRolesAny: ["tech"], desiredLocationRegion: "Berlin" } as never }),
    fakeClient(baseTables()).client,
    NOW,
  );
  const s = JSON.stringify(r);
  for (const secret of ["design", "37", "Geheimbranche", "exit_oriented", "b2b_sales", "application_level", "Vertrieb", "Software", "Berlin", "mustHaves", "relevance", "mutuality", "score"]) {
    assert.ok(!s.includes(secret), secret);
  }
  const leaves = (v: unknown): unknown[] => (v !== null && typeof v === "object" ? Object.values(v).flatMap(leaves) : [v]);
  const numbers = leaves(r).filter((v) => typeof v === "number") as number[];
  assert.ok(numbers.every(Number.isInteger), "nur Positionen und Zählwerte, keine Scores");
});

test("die vier Produktfelder wirken nicht - weder beim Kandidaten noch beim Betrachter", async () => {
  const product = { requiredIndustriesAny: ["Geheimbranche"], acceptedCommitmentLevels: ["full_time"], acceptedVentureStages: ["already_building"], acceptedVentureGoals: ["exit_oriented"] };
  const without = await computeFindMatchingShadow(input(), fakeClient(baseTables()).client, NOW);
  const withViewer = await computeFindMatchingShadow(input({ viewerMustHaves: product as never }), fakeClient(baseTables()).client, NOW);
  assert.deepEqual(withViewer, without);
  assert.equal(byId(without, C(4))?.eligibility, "eligible", "C4 hat nur Produktfelder gesetzt");
});

test("Workstyle ist keine Eingabe: gleiches Ergebnis mit und ohne Workstyle-Daten", async () => {
  const plain = fakeClient(baseTables());
  const withWorkstyle = fakeClient({
    ...baseTables(),
    assessments: [{ user_id: C(1), instrument_id: "founder-workstyle-pretest-8-5a-v3" }],
    workstyle_research_responses: [{ user_id: C(1) }],
  });
  const a = await computeFindMatchingShadow(input(), plain.client, NOW);
  const b = await computeFindMatchingShadow(input(), withWorkstyle.client, NOW);
  assert.deepEqual(a, b);
  const tables = new Set(withWorkstyle.calls.map((c) => c.table));
  for (const t of tables) assert.doesNotMatch(t, /workstyle|assessment|research|alignment|direction|resources/);
  assert.ok(!(withWorkstyle.calls.find((c) => c.table === "founder_search_preferences")?.select ?? "").includes("workstyle"));
});

// ---------------------------------------------------------------------------
// Pool-Bias
// ---------------------------------------------------------------------------
test("POOL-BIAS: Shadow sieht nur die geladene Seite", async () => {
  const r = await computeFindMatchingShadow(input({ candidates: [profile(C(1))], page: 1, pageSize: 12, rpcTotalCount: 30 }), fakeClient(baseTables()).client, NOW);
  assert.deepEqual(r.pool, { scope: "visible_page", page: 1, pageSize: 12, candidatesOnPage: 1, rpcTotalCount: 30 });
  assert.deepEqual(r.candidates.map((c) => c.candidateId), [C(1)], "C4 könnte relevanter sein - liegt er auf Seite 2, sieht der Shadow ihn nie");
});

test("POOL-BIAS: die RPC schließt fehlende Werte aus, v0.1 behielte sie als uncertain", async () => {
  const rpc = read("../supabase/migrations/20261091120000_search_by_frame.sql");
  assert.match(rpc, /or profile\.search_intent = any \(p_search_intents\)/, "NULL fällt bei gesetztem Kriterium heraus");
  assert.match(rpc, /order by profile\.published_at desc nulls last, profile\.id\s+limit greatest\(coalesce\(p_page_size, 12\), 1\)/);
  assert.doesNotMatch(rpc, /network_blocks|is_network_interaction_blocked|public\.profiles\b/, "die RPC prüft weder Blockierung noch die Founder-Rolle des Kandidaten");
  const r = await computeFindMatchingShadow(
    input({ viewerMustHaves: { acceptedSearchIntents: ["ready_now"] } as never, candidates: [profile(C(1), { searchIntent: null })] }),
    fakeClient(baseTables()).client,
    NOW,
  );
  assert.equal(byId(r, C(1))?.eligibility, "uncertain");
});

// ---------------------------------------------------------------------------
// Sichtbare Suche unverändert (Quelltext)
// ---------------------------------------------------------------------------
test("Hook: nach dem Aufbau der Treffer, nicht abgewartet, Rückgabe unverändert", () => {
  const data = read("src/features/discovery/discoveryData.ts");
  const fn = data.slice(data.indexOf("export async function getDiscoveryCandidatesForCurrentUser"), data.indexOf("export async function getDiscoveryExploreProfilesForCurrentUser"));
  const hook = fn.indexOf("scheduleFindMatchingShadow(");
  assert.ok(hook > fn.indexOf("const candidates = attachDiscoveryV2AlignmentSignals("), "erst nach den sichtbaren Treffern");
  assert.match(fn, /\n  scheduleFindMatchingShadow\(/, "Aufruf als Anweisung - Rückgabewert ungenutzt, nicht abgewartet");
  assert.doesNotMatch(fn, /await scheduleFindMatchingShadow|= scheduleFindMatchingShadow/);
  assert.match(fn, /\{ schedule: after \}/);
  assert.match(fn, /return \{\n    candidates,\n    page,\n    pageSize,\n    totalCount,\n  \};/, "dieselben Treffer, Seiten, Gesamtzahl");
  assert.match(fn, /rpc\("search_founder_discovery_profiles_v2"/);
  assert.equal((data.match(/scheduleFindMatchingShadow\(/g) ?? []).length, 1, "nur in der Suche, nicht beim Stöbern");
});

test("Shadow ist serverseitig, ohne Logs, und nur von discoveryData eingebunden", () => {
  const source = read("src/features/discovery/findMatchingShadow.ts");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /console\.|\.insert\(|\.upsert\(|\.update\(|\.rpc\(/, "keine Logs, keine Schreibzugriffe");
  assert.doesNotMatch(source, /NEXT_PUBLIC_MATCHING/);
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && /from "@\/features\/discovery\/findMatchingShadow"/.test(read(path))) users.push(path);
    }
  };
  walk("src");
  assert.deepEqual(users, [join("src", "features", "discovery", "discoveryData.ts")]);
});
