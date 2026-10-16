import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  loadFindMatchingPopulation,
  paginateFindShadow,
  POPULATION_PAGE_SIZE,
  runGlobalFindMatchingShadow,
} from "@/features/discovery/findMatchingGlobalShadow";
import { pairKey } from "@/features/discovery/findMatchingInputs";
import { FindMatchingPoolError, INPUT_CHUNK_SIZE, loadFindMatchingPool } from "@/features/discovery/findMatchingPool";

/**
 * E3a: set-basierter Pool (get_find_matching_pool*) + Inputs (get_find_matching_inputs).
 * Gates und Felder in der Datenbank prüft supabase/tests/find_matching_pool.sql. Hier:
 * Aufbau der Population, Kriterien, Capability, Fehler, Parität zu E2, Seiten.
 */

const read = (path: string) => readFileSync(path, "utf8");
const NOW = () => new Date("2026-10-16T10:00:00.000Z");
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const V = uid(1);

type Row = Record<string, unknown>;
type World = { profiles: Row[]; roles: Row[]; core: Row[]; prefs: Row[]; blocks: Row[]; entries: Row[]; intros: Row[] };

const product = { requiredIndustriesAny: ["Geheimbranche"], acceptedCommitmentLevels: ["full_time"], acceptedVentureStages: ["already_building"], acceptedVentureGoals: ["exit_oriented"] };

function world(n: number): World {
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  const roleCycle = [["tech"], ["sales"], ["product"], ["design"]];
  return {
    profiles: ids.map((i) => ({
      id: `fdp-${i}`, user_id: uid(i), status: i % 17 === 0 ? "paused" : "active",
      own_roles: roleCycle[i % 4], seeking_roles: roleCycle[(i + 1) % 4], expertise: [], location_region: "Berlin", remote_mode: "remote",
      availability_hours_per_week: 10 + (i % 30), availability_flexibility: null, commitment_level: i % 2 ? "part_time" : "full_time",
      venture_stage: i % 3 ? "idea_validating" : "exploring", venture_goal: "profitable_business",
      search_intent: i % 5 ? "ready_now" : null, start_horizon: "now",
      published_at: `2026-09-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`, updated_at: "2026-10-01T00:00:00Z",
    })),
    roles: ids.map((i) => ({ user_id: uid(i), roles: i % 13 === 0 ? ["advisor"] : ["founder"] })),
    core: ids.map((i) => ({
      user_id: uid(i), industries: ["Software"], expertise: ["Vertrieb"], location_region: i % 7 ? "Berlin" : null, remote_mode: "remote",
      capability_disclosure: "areas_depth_on_contact", capability_matching_allowed: i % 3 === 0,
    })),
    prefs: ids.filter((i) => i % 4 === 0).map((i) => ({ user_id: uid(i), must_haves: { requiredRolesAny: ["tech"], minimumAvailabilityHoursPerWeek: 20, ...product } })),
    blocks: [{ blocker_user_id: uid(11), blocked_user_id: V }, { blocker_user_id: V, blocked_user_id: uid(12) }],
    entries: ids.flatMap((i) => [{ user_id: uid(i), area_id: "b2b_sales", application_level: (i % 5) + 1, ownership_wish: i % 2 ? "own" : "prefer_other" }]),
    intros: [{ requester_user_id: V, recipient_user_id: uid(3), status: "accepted" }],
  };
}

const AREAS = [{ area_id: "b2b_sales", family_id: "commercial_growth" }];
const isFounder = (w: World, id: string) => (w.roles.find((r) => r.user_id === id)?.roles as string[]).includes("founder");
const blocked = (w: World, a: string, b: string) => w.blocks.some((x) => (x.blocker_user_id === a && x.blocked_user_id === b) || (x.blocker_user_id === b && x.blocked_user_id === a));

/** Fake der Datenbankfunktionen - Gates wie find_matching_pool_core (dort per pgTAP geprüft). */
function rpcClient(w: World, opts: { fail?: "pool" | "inputs" | "areas" | "throw" } = {}) {
  const calls: { name: string; ids?: number }[] = [];
  const pick = (p: Row) => {
    const out: Row = {};
    for (const k of ["user_id", "own_roles", "seeking_roles", "availability_hours_per_week", "availability_flexibility", "commitment_level", "venture_stage", "venture_goal", "search_intent", "start_horizon", "published_at", "updated_at"]) out[k] = p[k];
    out.profile_id = p.id;
    out.has_contact = w.intros.some((x) => x.status === "accepted" && ((x.requester_user_id === V && x.recipient_user_id === p.user_id) || (x.recipient_user_id === V && x.requester_user_id === p.user_id)));
    return out;
  };
  const pool = (viewer: string) => {
    const me = w.profiles.find((p) => p.user_id === viewer);
    if (!me || me.status !== "active" || !isFounder(w, viewer)) return null;
    return {
      viewer: { ...pick(me), has_contact: false },
      candidates: w.profiles
        .filter((p) => p.status === "active" && p.user_id !== viewer && isFounder(w, p.user_id as string) && !blocked(w, p.user_id as string, viewer))
        .map(pick),
    };
  };
  const eight = ["requiredRolesAny", "minimumAvailabilityHoursPerWeek", "acceptedRemoteModes", "desiredLocationRegion", "acceptedSearchIntents", "acceptedStartHorizons", "requiredCapabilityAreasAny", "requiredExpertiseAny"];
  const client = {
    rpc(name: string, args: Record<string, unknown> = {}) {
      if (opts.fail === "throw") return Promise.reject(new Error("netz"));
      if (name === "get_find_matching_pool_for_viewer" || name === "get_find_matching_pool") {
        calls.push({ name });
        if (opts.fail === "pool") return Promise.resolve({ data: null, error: { code: "x" } });
        return Promise.resolve({ data: pool((args.p_viewer as string) ?? V), error: null });
      }
      if (name === "get_find_matching_inputs") {
        const ids = args.p_user_ids as string[];
        calls.push({ name, ids: ids.length });
        if (opts.fail === "inputs") return Promise.resolve({ data: null, error: { code: "x" } });
        return Promise.resolve({
          data: w.core.filter((c) => ids.includes(c.user_id as string)).map((c) => {
            const pref = w.prefs.find((p) => p.user_id === c.user_id)?.must_haves as Row | undefined;
            return {
              ...c,
              must_haves: pref ? Object.fromEntries(Object.entries(pref).filter(([k]) => eight.includes(k))) : null,
              capability_entries: c.capability_matching_allowed ? w.entries.filter((e) => e.user_id === c.user_id).map(({ user_id: _u, ...rest }) => rest) : [],
            };
          }),
          error: null,
        });
      }
      throw new Error(`unerwarteter RPC ${name}`);
    },
    from(table: string) {
      calls.push({ name: `from:${table}` });
      const chain = {
        select: () => chain,
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(opts.fail === "areas" ? { data: null, error: { code: "x" } } : { data: table === "capability_areas" ? AREAS : [], error: null }).then(resolve),
      };
      return chain;
    },
  };
  return { client: client as never, calls };
}

/** Tabellen-Fake für den E2-Lader (gleiche Welt). */
function tableClient(w: World) {
  const tables: Record<string, Row[]> = {
    founder_discovery_profiles: w.profiles, profiles: w.roles, person_core: w.core, founder_search_preferences: w.prefs,
    network_blocks: w.blocks, person_capability_entries: w.entries, capability_areas: AREAS, discovery_intro_requests: w.intros, network_contact_requests: [],
  };
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const chain = {
        select: () => chain,
        eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), chain),
        in: (c: string, v: unknown[]) => ((rows = rows.filter((r) => v.includes(r[c]))), chain),
        order: (c: string) => ((rows = [...rows].sort((a, b) => String(a[c] ?? "").localeCompare(String(b[c] ?? "")))), chain),
        range: (from: number, to: number) => ((rows = rows.slice(from, Math.min(to + 1, from + POPULATION_PAGE_SIZE))), chain),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
      };
      return chain;
    },
  } as never;
}

// ---------------------------------------------------------------------------
test("Pool + Inputs: zwei bis drei Abfragen, unabhängig von der Poolgröße (bis INPUT_CHUNK_SIZE)", async () => {
  const small = rpcClient(world(20));
  const large = rpcClient(world(900));
  const a = await loadFindMatchingPool(small.client, { kind: "service", viewerUserId: V });
  const b = await loadFindMatchingPool(large.client, { kind: "service", viewerUserId: V });
  assert.equal(a.population?.queryCount, 3);
  assert.equal(b.population?.queryCount, 3);
  assert.deepEqual(large.calls.map((c) => c.name), ["get_find_matching_pool_for_viewer", "get_find_matching_inputs", "from:capability_areas"]);
  const huge = rpcClient(world(INPUT_CHUNK_SIZE + 500));
  const c = await loadFindMatchingPool(huge.client, { kind: "service", viewerUserId: V });
  assert.equal(huge.calls.filter((x) => x.name === "get_find_matching_inputs").length, 2, "Inputs in Blöcken zu 2000");
  assert.ok(huge.calls.every((x) => (x.ids ?? 0) <= INPUT_CHUNK_SIZE));
  assert.ok((c.population?.profiles.size ?? 0) > INPUT_CHUNK_SIZE);
});

test("Sitzungsvariante: Pool über get_find_matching_pool, Inputs über den Service-Client", async () => {
  const session = rpcClient(world(10));
  const service = rpcClient(world(10));
  const load = await loadFindMatchingPool(service.client, { kind: "session", client: session.client });
  assert.deepEqual(session.calls.map((c) => c.name), ["get_find_matching_pool"]);
  assert.ok(!service.calls.some((c) => c.name.startsWith("get_find_matching_pool")));
  assert.ok(load.population);
});

test("Population: Pool ohne self/Blockierte/Nicht-Founder, Kriterien nur v0.1, Capability nur mit Freigabe", async () => {
  const w = world(40);
  const { population } = await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V });
  assert.ok(population);
  const ids = [...population.profiles.keys()];
  for (const excluded of [uid(11), uid(12), uid(13), uid(26), uid(17), uid(34)]) assert.ok(!ids.includes(excluded), excluded);
  assert.equal(population.blockedPairs.size, 0, "Blockierte sind gar nicht im Pool");
  const m = population.constraints.get(uid(4));
  assert.ok(m);
  assert.deepEqual(m.requiredRolesAny, ["tech"]);
  assert.ok(!JSON.stringify([...population.constraints]).includes("Geheimbranche"));
  assert.ok(population.entries.every((e) => population.core.get(e.user_id)?.capability_matching_allowed === true));
  assert.ok(population.connectedPairs?.has(pairKey(uid(3), V)));
  assert.equal(population.profiles.get(uid(2))?.displayName, "", "keine Namen");
});

test("Betrachter sucht selbst nicht: keine Population", async () => {
  const w = world(10);
  (w.profiles[0] as Row).status = "paused";
  const load = await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V });
  assert.equal(load.population, null);
});

test("jeder Fehler wirft - nie still leere Daten", async () => {
  for (const fail of ["pool", "inputs", "areas", "throw"] as const) {
    await assert.rejects(loadFindMatchingPool(rpcClient(world(10), { fail }).client, { kind: "service", viewerUserId: V }), FindMatchingPoolError, fail);
  }
});

test("Parität zu E2: gleiche Gate-Status, gleiche Reihenfolge, gleiche Seiten", async () => {
  const w = world(120);
  const viaPool = (await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V })).population;
  const viaTables = await loadFindMatchingPopulation(tableClient(w), { withConnections: true });
  assert.ok(viaPool);
  const a = runGlobalFindMatchingShadow(viaPool, V, { now: NOW, withReasons: true });
  const b = runGlobalFindMatchingShadow(viaTables, V, { now: NOW, withReasons: true });
  assert.equal(a.status, "ok");
  assert.deepEqual(a.counts, b.counts);
  assert.deepEqual([...a.statusById].sort(), [...b.statusById].sort());
  assert.deepEqual(a.ranked.map((r) => [r.rank, r.result.subject.b, r.tieGroup, r.result.relevance.mutuality]), b.ranked.map((r) => [r.rank, r.result.subject.b, r.tieGroup, r.result.relevance.mutuality]));
  assert.deepEqual([...(a.reasonCodesById ?? [])].sort(), [...(b.reasonCodesById ?? [])].sort());
});

test("vier Produktfelder ohne Wirkung, auch über den Pool-Weg", async () => {
  const w = world(60);
  const without = { ...w, prefs: w.prefs.map((p) => ({ ...p, must_haves: { requiredRolesAny: ["tech"], minimumAvailabilityHoursPerWeek: 20 } })) };
  const a = runGlobalFindMatchingShadow((await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V })).population!, V, { now: NOW });
  const b = runGlobalFindMatchingShadow((await loadFindMatchingPool(rpcClient(without).client, { kind: "service", viewerUserId: V })).population!, V, { now: NOW });
  assert.deepEqual(a, b);
});

test("Seiten nach dem Ranking: 12 je Seite, keine Doppelten, keine Lücken, stabil", async () => {
  const w = world(200);
  const run = runGlobalFindMatchingShadow((await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V })).population!, V, { now: NOW });
  const first = paginateFindShadow(run.ranked, 1);
  assert.equal(first.pageSize, 12);
  const all = Array.from({ length: first.totalPages }, (_, i) => paginateFindShadow(run.ranked, i + 1).items.map((r) => r.result.subject.b)).flat();
  assert.equal(all.length, run.ranked.length, "keine Lücken");
  assert.equal(new Set(all).size, all.length, "niemand auf zwei Seiten");
  const again = runGlobalFindMatchingShadow((await loadFindMatchingPool(rpcClient(w).client, { kind: "service", viewerUserId: V })).population!, V, { now: NOW });
  assert.deepEqual(again.ranked.map((r) => r.result.subject.b), run.ranked.map((r) => r.result.subject.b), "deterministisch");
  const groups = new Map<string, number[]>();
  for (const r of run.ranked) if (r.tieGroup) groups.set(r.tieGroup, [...(groups.get(r.tieGroup) ?? []), r.rank]);
  for (const ranks of groups.values()) assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y), "Gleichstand zusammenhängend");
});

test("Shadow nutzt standardmäßig den Pool-Weg; Pool-Lader serverseitig und nur von Shadows eingebunden", () => {
  const global = read("src/features/discovery/findMatchingGlobalShadow.ts");
  assert.match(global, /\(options\.loadPopulation \?\? loadPoolPopulation\)\(client, viewerUserId\)/);
  assert.match(global, /loadFindMatchingPool\([^)]*\{ kind: "service", viewerUserId \}\)/);
  const pool = read("src/features/discovery/findMatchingPool.ts");
  assert.match(pool, /^import "server-only";/);
  assert.doesNotMatch(pool, /console\.|\.insert\(|\.upsert\(|\.update\(|workstyle|research/i);
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && /from "@\/features\/discovery\/findMatchingPool"/.test(read(path))) users.push(path);
    }
  };
  walk("src");
  assert.deepEqual(users, [join("src", "features", "discovery", "findMatchingGlobalShadow.ts")]);
});
