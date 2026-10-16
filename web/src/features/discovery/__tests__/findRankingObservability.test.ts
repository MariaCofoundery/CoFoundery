import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { FounderDiscoveryProfile } from "@/features/discovery/discoveryTypes";
import { getFindCandidatesV01ForCurrentUser, pageVisibility } from "@/features/discovery/findMatchingRanking";
import {
  FIND_FALLBACK_BUCKETS,
  FIND_RANKING_METRICS,
  findRankingIncrements,
  recordFindRankingObservation,
  toFallbackBucket,
  type FindRankingObservation,
} from "@/features/discovery/findRankingObservability";
import { NOW, rpcClient, uid, V, world, type Row, type World } from "@/features/discovery/__tests__/helpers/findPoolFakes";

/**
 * E3d: aggregierte Beobachtbarkeit des v0.1-Rankingpfads. Nur Zähler (Kennzahl, Bucket,
 * Wert); keine Personen, IDs, Hashes, Texte; Schreiben nach der Antwort; Fehler verworfen.
 * Die Datenbankseite prüft supabase/tests/find_ranking_metrics.sql.
 */

const read = (path: string) => readFileSync(path, "utf8");
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
const allowed = (metric: string, bucket: string) =>
  (FIND_RANKING_METRICS as Record<string, readonly string[]>)[metric]?.includes(bucket) === true;

const KNOWN = ["session_invalid", "viewer_mismatch", "viewer_not_searching", "service_unavailable", "pool_failed", "inputs_failed", "engine_failed", "detail_failed"];

// ---------------------------------------------------------------------------
// Vertrag der Zähler
// ---------------------------------------------------------------------------
test("v01-Erfolg: Anfrage, Versuch, Erfolg, rankingMode v01 - kein Fehler-Bucket", () => {
  const inc = findRankingIncrements({
    rankingMode: "v01",
    fallback: null,
    diagnostics: {
      timingsMs: { pool: 30.4, inputs: 20, engine: 12, detail: 4, total: 70 },
      poolSize: 950,
      gate: { eligible: 400, uncertain: 120, excluded: 430 },
      presenter: "ok",
      pageVisible: "full",
    },
  });
  const pairs = inc.map((i) => `${i.metric}:${i.bucket}:${i.value}`);
  for (const p of ["requests:all:1", "v01_attempts:all:1", "ranking_mode:v01:1", "v01_success:all:1", "presenter:ok:1", "page_visible:full:1",
    "pool_size:lt_1000:1", "pool_size:sum:950", "pool_size:n:1", "gate:eligible:400", "gate:uncertain:120", "gate:excluded:430",
    "runtime_pool:lt_50:1", "runtime_pool:sum_ms:30", "runtime_total:lt_100:1", "runtime_total:sum_ms:70", "runtime_engine:n:1"]) {
    assert.ok(pairs.includes(p), p);
  }
  assert.ok(!inc.some((i) => i.metric === "fallback"));
  assert.ok(inc.every((i) => allowed(i.metric, i.bucket) && Number.isInteger(i.value) && i.value >= 0));
});

test("Fallback: rankingMode legacy + bekannte Klasse als Zähler; unbekannt -> sicherer Sammel-Bucket", () => {
  for (const failure of [...KNOWN, "presenter_failed"]) {
    const inc = findRankingIncrements({ rankingMode: "legacy", fallback: failure, diagnostics: {} });
    assert.deepEqual(inc.filter((i) => i.metric === "fallback"), [{ metric: "fallback", bucket: failure, value: 1 }]);
    assert.ok(inc.some((i) => i.metric === "ranking_mode" && i.bucket === "legacy"));
    assert.ok(!inc.some((i) => i.metric === "v01_success"));
  }
  for (const odd of ["TypeError: boom", uid(7), "", null, undefined, 42, { failure: "pool_failed" }, "POOL_FAILED"]) {
    assert.equal(toFallbackBucket(odd), "unexpected", String(odd));
  }
  assert.deepEqual([...FIND_FALLBACK_BUCKETS].sort(), [...KNOWN, "presenter_failed", "unexpected"].sort());
});

test("keine PII möglich: fremde Felder, IDs und Texte erreichen die Zähler nie", () => {
  const sneaky = {
    rankingMode: "legacy",
    fallback: `pool_failed for ${uid(9)}`,
    diagnostics: {
      timingsMs: { pool: 5, total: 9, [uid(3)]: 1 },
      poolSize: 12,
      gate: { eligible: 1, uncertain: 0, excluded: 2 },
      pageVisible: "not-a-bucket",
      userId: uid(1),
      email: "person@example.invalid",
      reasons: ["find.matchingReasons.FIND_ROLE_NEED_COVERED"],
      location: "Berlin",
      mustHaves: { requiredRolesAny: ["tech"] },
      score: 0.87,
      tieGroup: "t1",
    },
    userId: uid(1),
    candidateIds: [uid(2)],
  } as unknown as FindRankingObservation;
  const inc = findRankingIncrements(sneaky);
  const s = JSON.stringify(inc);
  assert.doesNotMatch(s, /0000-4000|example\.invalid|Berlin|FIND_ROLE|tech|0\.87|t1|not-a-bucket|userId|email|mustHaves|score|tieGroup/);
  assert.ok(inc.every((i) => allowed(i.metric, i.bucket)));
  assert.ok(inc.some((i) => i.metric === "fallback" && i.bucket === "unexpected"));
  for (const i of inc) assert.deepEqual(Object.keys(i).sort(), ["bucket", "metric", "value"]);
});

test("ungültige Zahlen werden weggelassen, nicht geschätzt", () => {
  const inc = findRankingIncrements({
    rankingMode: "v01",
    fallback: null,
    diagnostics: { timingsMs: { pool: -1, engine: Number.NaN, total: Infinity }, poolSize: -5, gate: { eligible: -1, uncertain: 2, excluded: Number.NaN } },
  });
  assert.ok(!inc.some((i) => i.metric.startsWith("runtime_") || i.metric === "pool_size"));
  assert.deepEqual(inc.filter((i) => i.metric === "gate"), [{ metric: "gate", bucket: "uncertain", value: 2 }]);
});

test("Allowlist: Code und Datenbank kennen genau dieselben (Kennzahl, Bucket)-Paare", () => {
  const sql = read("../supabase/migrations/20261204120000_find_ranking_metrics.sql");
  const fn = sql.slice(sql.indexOf("create or replace function public.find_ranking_metric_allowed"), sql.indexOf("create table public.find_ranking_metrics_daily"));
  const fromSql = new Map<string, string[]>();
  for (const m of fn.matchAll(/when '([a-z0-9_]+)' then p_bucket (?:= '([a-z0-9_]+)'|in \(([^)]*)\))/g)) {
    fromSql.set(m[1], m[2] ? [m[2]] : [...m[3].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]));
  }
  const fromCode = new Map(Object.entries(FIND_RANKING_METRICS).map(([k, v]) => [k, [...v]]));
  assert.deepEqual([...fromSql.keys()].sort(), [...fromCode.keys()].sort());
  for (const [k, v] of fromCode) assert.deepEqual([...(fromSql.get(k) ?? [])].sort(), [...v].sort(), k);
  // Kein Bucket könnte eine ID oder ein Text sein.
  for (const buckets of fromCode.values()) for (const b of buckets) assert.match(b, /^[a-z_0-9]{1,24}$/);
  assert.match(sql, /create table public\.find_ranking_metrics_daily \(\n  day date not null,\n  metric text not null,\n  bucket text not null,\n  value bigint not null default 0 check \(value >= 0\),/);
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /user_id|candidate|profile_id|email|uuid|timestamptz/);
  assert.match(sql, /revoke all on table public\.find_ranking_metrics_daily from public, anon, authenticated, service_role;/);
  assert.match(sql, /grant execute on function public\.record_find_ranking_metrics\(jsonb\) to service_role;/);
});

// ---------------------------------------------------------------------------
// Schreiben: nach der Antwort, nie blockierend, Fehler verworfen
// ---------------------------------------------------------------------------
test("Schreiben nur im geplanten Task - kein Netzwerkzugriff auf dem Suchpfad", async () => {
  const calls: unknown[] = [];
  const tasks: Array<() => Promise<void>> = [];
  recordFindRankingObservation(
    { rankingMode: "v01", fallback: null, diagnostics: { poolSize: 3 } },
    { schedule: (task) => tasks.push(task), createClient: () => ({ rpc: async (name, args) => (calls.push([name, args]), { error: null }) }) },
  );
  assert.equal(calls.length, 0, "vor der Antwort nichts geschrieben");
  assert.equal(tasks.length, 1);
  await tasks[0]();
  assert.equal(calls.length, 1);
  const [name, args] = calls[0] as [string, { p_increments: unknown[] }];
  assert.equal(name, "record_find_ranking_metrics");
  assert.deepEqual(Object.keys(args), ["p_increments"]);
});

test("Fehler beim Schreiben werden verworfen - die Suche merkt nichts", async () => {
  const run = async (opts: Parameters<typeof recordFindRankingObservation>[1]) => {
    const tasks: Array<() => Promise<void>> = [];
    assert.doesNotThrow(() =>
      recordFindRankingObservation({ rankingMode: "legacy", fallback: "pool_failed", diagnostics: {} }, { ...opts, schedule: (t) => (opts.schedule(t), tasks.push(t)) }),
    );
    for (const t of tasks) await assert.doesNotReject(t());
  };
  await run({ schedule: () => {}, createClient: () => ({ rpc: async () => { throw new Error("netz"); } }) });
  await run({ schedule: () => {}, createClient: () => ({ rpc: async () => ({ error: { code: "22023" } }) }) });
  await run({ schedule: () => {}, createClient: () => null });
  await run({ schedule: () => {}, createClient: () => { throw new Error("kein Schlüssel"); } });
  assert.doesNotThrow(() =>
    recordFindRankingObservation({ rankingMode: "v01", fallback: null, diagnostics: {} }, { schedule: () => { throw new Error("after() außerhalb einer Anfrage"); } }),
  );
});

// ---------------------------------------------------------------------------
// Diagnose aus dem Rankingpfad
// ---------------------------------------------------------------------------
function loader(w: World) {
  return async (ids: string[]) =>
    ids.map((id) => {
      const p = w.profiles.find((x) => x.id === id) as Row;
      return { ...p, id, userId: p.user_id, displayName: "N", headline: "", bio: "", ownRoles: p.own_roles, seekingRoles: p.seeking_roles, expertise: [], industries: [] } as unknown as FounderDiscoveryProfile;
    });
}
async function v01(w: World, o: { page?: number; detailFail?: boolean; drop?: boolean } = {}) {
  let t = 0;
  return getFindCandidatesV01ForCurrentUser({
    sessionClient: Object.assign(Object.create(null), rpcClient(w).client, { auth: { getUser: async () => ({ data: { user: { id: V } }, error: null }) } }) as never,
    expectedUserId: V,
    page: o.page ?? 1,
    loadPageProfiles: async (ids) => {
      if (o.detailFail) throw new Error("rls");
      const all = await loader(w)(ids);
      return o.drop ? all.slice(1) : all;
    },
    createServiceClient: () => rpcClient(w).client,
    now: NOW,
    clock: () => (t += 5),
  });
}

test("Diagnose: nur Zahlen und Kategorien, keine IDs; Seitenfüllung als Kategorie", async () => {
  const w = world(80);
  const ok = await v01(w);
  assert.ok(ok.ok);
  const d = ok.diagnostics;
  assert.deepEqual(Object.keys(d).sort(), ["gate", "pageVisible", "poolSize", "presenter", "timingsMs"]);
  assert.deepEqual(Object.keys(d.timingsMs ?? {}).sort(), ["detail", "engine", "inputs", "pool", "total"]);
  assert.equal(d.presenter, "ok");
  assert.equal(d.pageVisible, "full");
  assert.ok((d.poolSize ?? 0) > 0);
  assert.equal((d.gate?.eligible ?? 0) + (d.gate?.uncertain ?? 0), ok.page.totalCount);
  assert.doesNotMatch(JSON.stringify(d), /0000-4000|fdp-|Name|Software|Berlin|tech|sales/);
  assert.equal((await v01(w, { drop: true })).ok && (await v01(w, { drop: true })).diagnostics.pageVisible, "short_detail_dropped");
  const failed = await v01(w, { detailFail: true });
  assert.ok(!failed.ok);
  assert.equal(failed.failure, "detail_failed");
  assert.ok(typeof failed.diagnostics.timingsMs?.total === "number" && typeof failed.diagnostics.timingsMs?.detail === "number");
});

test("pageVisibility: voll, letzte Seite, durch Detail-Laden gekürzt, leer", () => {
  assert.equal(pageVisibility(12, 30, 1), "full");
  assert.equal(pageVisibility(6, 30, 3), "short_last_page");
  assert.equal(pageVisibility(10, 30, 1), "short_detail_dropped");
  assert.equal(pageVisibility(4, 30, 3), "short_detail_dropped");
  assert.equal(pageVisibility(0, 30, 9), "empty");
  assert.equal(pageVisibility(0, 0, 1), "empty");
});

// ---------------------------------------------------------------------------
// Einbindung (Quelltext - discoveryData ist nicht importierbar)
// ---------------------------------------------------------------------------
test("Einbindung: nur hinter dem Flag, nach der Antwort, Fehlergrund nur an die Zähler", () => {
  const data = read("src/features/discovery/discoveryData.ts");
  const search = data.slice(data.indexOf("export async function getDiscoveryCandidatesForCurrentUser"), data.indexOf("export async function getDiscoveryExploreProfilesForCurrentUser"));
  const branch = search.slice(search.indexOf("if (isFindV01RankingEnabled()) {"), search.indexOf('rpc("search_founder_discovery_profiles_v2"'));
  assert.equal((data.match(/recordFindRankingObservation\(/g) ?? []).length, 1, "nur einmal, nur in der Suche");
  assert.match(branch, /recordFindRankingObservation\(/, "nur im Flag-Zweig");
  assert.match(branch, /\{ schedule: after \}/);
  assert.doesNotMatch(branch, /await recordFindRankingObservation/);
  assert.match(branch, /\} catch \{\s*\/\/[^\n]*\n\s*v01 = \{ ok: false, failure: "unexpected", diagnostics: \{\} \};/, "unerwartete Fehler -> heutige Suche");
  assert.doesNotMatch(data.slice(data.indexOf("export async function getDiscoveryExploreProfilesForCurrentUser")), /recordFindRankingObservation/, "Stöbern unverändert");
});

test("Modul serverseitig, ohne Logs, ohne externe Dienste; nur die Suche bindet es ein", () => {
  const source = read("src/features/discovery/findRankingObservability.ts");
  assert.match(source, /^import "server-only";/);
  const code = strip(source);
  assert.doesNotMatch(code, /console\.|fetch\(|https?:\/\/|NEXT_PUBLIC|localStorage|document\.|window\./);
  assert.equal((code.match(/\.rpc\(/g) ?? []).length, 1);
  assert.match(code, /\.rpc\("record_find_ranking_metrics", \{ p_increments: increments \}\)/);
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && /from "@\/features\/discovery\/findRankingObservability"/.test(read(path))) users.push(path);
    }
  };
  walk("src");
  assert.deepEqual(users.sort(), [join("src", "features", "discovery", "discoveryData.ts"), join("src", "features", "discovery", "findMatchingRanking.ts")].sort());
  assert.match(read("src/features/discovery/findMatchingRanking.ts"), /^import type \{[^}]*\} from "@\/features\/discovery\/findRankingObservability";$/m, "dort nur Typen");
});

// ---------------------------------------------------------------------------
// Vorbereitete reale Auswertung (nicht ausgeführt): nur Aggregate, Remote nur mit Bestätigung
// ---------------------------------------------------------------------------
test("Laufzeit-Aggregat: je Stufe nur Median, p95, Maximum", async () => {
  const { aggregateFindRuntimes } = await import("@/features/discovery/findShadowEvaluation");
  assert.deepEqual(aggregateFindRuntimes([]), { viewersMeasured: 0, stages: null });
  const samples = Array.from({ length: 20 }, (_, i) => ({ poolMs: i + 1, inputsMs: 2 * (i + 1), engineMs: 0.5, totalMs: 10 * (i + 1) }));
  const agg = aggregateFindRuntimes(samples);
  assert.equal(agg.viewersMeasured, 20);
  assert.deepEqual(agg.stages?.poolMs, { median: 10.5, p95: 19, max: 20 });
  assert.deepEqual(agg.stages?.totalMs, { median: 105, p95: 190, max: 200 });
  assert.deepEqual(Object.keys(agg.stages ?? {}).sort(), ["engineMs", "inputsMs", "poolMs", "totalMs"]);
});

test("Auswertungs-Skript: Laufzeit über den Produktionspfad, Ausgabe nur Aggregat, Remote nur mit --confirm-remote", () => {
  const script = read("scripts/find-shadow-eval.ts");
  assert.match(script, /!isLocalSupabaseUrl\(url\) && args\.get\("confirm-remote"\) !== host/);
  assert.match(script, /const known = new Set\(\["viewers", "page-size", "confirm-remote", "runtime-sample"\]\);/);
  assert.match(script, /loadFindMatchingPool\(client, \{ kind: "service", viewerUserId \}\)/);
  assert.match(script, /productionPathRuntime: runtime,/);
  assert.equal((script.match(/console\.log\(/g) ?? []).length, 1, "genau eine Ausgabe");
  const output = script.slice(script.indexOf("console.log("));
  assert.doesNotMatch(output, /samples|viewerIds|viewerUserId|population\.profiles(?!\.size)|load\.population/, "keine Einzelwerte oder IDs in der Ausgabe");
  assert.doesNotMatch(script, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|writeFile/, "nichts wird gespeichert");
});
