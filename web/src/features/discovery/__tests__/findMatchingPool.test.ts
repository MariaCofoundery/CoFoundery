import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  loadFindMatchingPopulation,
  paginateFindShadow,
  runGlobalFindMatchingShadow,
} from "@/features/discovery/findMatchingGlobalShadow";
import { pairKey } from "@/features/discovery/findMatchingInputs";
import { FindMatchingPoolError, INPUT_CHUNK_SIZE, loadFindMatchingPool } from "@/features/discovery/findMatchingPool";
import { NOW, rpcClient, tableClient, uid, V, world, type Row } from "@/features/discovery/__tests__/helpers/findPoolFakes";

/**
 * E3a: set-basierter Pool (get_find_matching_pool*) + Inputs (get_find_matching_inputs).
 * Gates und Felder in der Datenbank prüft supabase/tests/find_matching_pool.sql. Hier:
 * Aufbau der Population, Kriterien, Capability, Fehler, Parität zu E2, Seiten.
 */

const read = (path: string) => readFileSync(path, "utf8");
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

test("Sitzungsvariante: Pool und Vokabular über die Sitzung, Service-Client NUR für private Inputs", async () => {
  const session = rpcClient(world(10));
  const service = rpcClient(world(10));
  const load = await loadFindMatchingPool(service.client, { kind: "session", client: session.client });
  assert.deepEqual(session.calls.map((c) => c.name), ["get_find_matching_pool", "from:capability_areas"]);
  assert.deepEqual([...new Set(service.calls.map((c) => c.name))], ["get_find_matching_inputs"]);
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

test("Shadow nutzt standardmäßig den Pool-Weg; Pool-Lader serverseitig, nur von Shadows und dem v0.1-Rankingpfad eingebunden", () => {
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
  assert.deepEqual(users, [
    join("src", "features", "discovery", "findMatchingGlobalShadow.ts"),
    join("src", "features", "discovery", "findMatchingRanking.ts"),
  ]);
});
