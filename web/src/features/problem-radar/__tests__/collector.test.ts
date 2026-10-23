import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { CollectorError, fetchHnItems, hnSearchUrl, parseHnResponse, readLimited } from "@/features/problem-radar/collector/hackerNews";
import { runRadarCollection, type CollectorDb, type DueSource } from "@/features/problem-radar/collector/runCollection";

const source = (path: string) => readFileSync(path, "utf8");
const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

test("die Abruf-Adresse ist fest: nur Suchbegriff und Zeitpunkt werden eingesetzt", () => {
  const url = new URL(hnSearchUrl("is there a tool", 1_800_000_000));
  assert.equal(url.origin, "https://hn.algolia.com");
  assert.equal(url.pathname, "/api/v1/search_by_date");
  assert.equal(url.searchParams.get("query"), "is there a tool");
  assert.equal(url.searchParams.get("tags"), "ask_hn");
  // Ein Suchbegriff kann den Host nicht veraendern.
  const hostile = new URL(hnSearchUrl("x@evil.example/?#", 1));
  assert.equal(hostile.origin, "https://hn.algolia.com");
});

test("aus der Antwort werden nur Kennung, Titel und Datum gelesen", () => {
  const items = parseHnResponse({ hits: [{ objectID: "42", title: "Ask HN: Is there a tool?", created_at_i: 1_760_000_000, author: "someone", story_text: "long text" }] });
  assert.deepEqual(items, [{ item_id: "42", title: "Ask HN: Is there a tool?", source_date: "2025-10-09" }]);
  assert.ok(!("author" in items[0]) && !("story_text" in items[0]));
});

test("Unerwartetes ist ein Formatfehler, kein Raten", () => {
  assert.throws(() => parseHnResponse({ nope: 1 }), (e) => e instanceof CollectorError && e.code === "format_error");
  assert.throws(() => parseHnResponse({ hits: [{ objectID: "../etc", title: "x" }] }), (e) => e instanceof CollectorError);
  assert.deepEqual(parseHnResponse({ hits: [{ objectID: "7", title: "   " }] }), []);
});

test("eine zu grosse Antwort wird abgebrochen", async () => {
  const big = new Response("x".repeat(2000), { headers: { "content-type": "application/json" } });
  await assert.rejects(() => readLimited(big, 1000), (e) => e instanceof CollectorError && e.code === "format_error");
});

test("kein Redirect, kein Nicht-JSON, Fehlerstatus wird benannt", async () => {
  let seen: RequestInit | undefined;
  await fetchHnItems("q", 1, (async (_url: unknown, init?: RequestInit) => { seen = init; return json({ hits: [] }); }) as typeof fetch);
  assert.equal(seen?.redirect, "error");
  await assert.rejects(() => fetchHnItems("q", 1, (async () => new Response("<html>", { headers: { "content-type": "text/html" } })) as typeof fetch), (e) => e instanceof CollectorError && e.code === "format_error");
  await assert.rejects(() => fetchHnItems("q", 1, (async () => new Response("", { status: 503 })) as typeof fetch), (e) => e instanceof CollectorError && e.code === "http_error");
});

function fakeDb(due: DueSource[], log: string[], options: { ingestError?: { code: string } } = {}): CollectorDb {
  return {
    async due() { return due; },
    async start(id) { log.push(`start:${id}`); return `run-${id}`; },
    async ingest(_run, items) { if (options.ingestError) throw options.ingestError; log.push(`ingest:${items.length}`); return items.length; },
    async finish(run, outcome, fetched, added) { log.push(`finish:${run}:${outcome}:${fetched}:${added}`); },
  };
}
const hn = (id: string) => ({ objectID: id, title: `Ask HN ${id}`, created_at_i: 1_760_000_000 });
const noSleep = async () => undefined;

test("ein Lauf sammelt ueber alle Suchbegriffe, fasst doppelte zusammen und meldet nur Zahlen", async () => {
  const log: string[] = [];
  const fetchImpl = (async (url: string) => json({ hits: new URL(url).searchParams.get("query") === "a" ? [hn("1"), hn("2")] : [hn("2"), hn("3")] })) as unknown as typeof fetch;
  const summary = await runRadarCollection({
    db: fakeDb([{ source_id: "s1", source_revision: 1, adapter: "hn_algolia", queries: ["a", "b"] }], log),
    minGapSeconds: 1, fetchImpl, sleep: noSleep,
  });
  assert.deepEqual(summary, { sources: 1, fetched: 3, added: 3, failed: 0 });
  assert.deepEqual(log, ["start:s1", "ingest:3", "finish:run-s1:ok:3:3"]);
});

test("eine Quelle, die scheitert, bricht die anderen nicht ab", async () => {
  const log: string[] = [];
  let call = 0;
  const fetchImpl = (async () => (++call === 1 ? new Response("", { status: 500 }) : json({ hits: [hn("9")] }))) as unknown as typeof fetch;
  const summary = await runRadarCollection({
    db: fakeDb([
      { source_id: "bad", source_revision: 1, adapter: "hn_algolia", queries: ["a"] },
      { source_id: "good", source_revision: 1, adapter: "hn_algolia", queries: ["a"] },
    ], log),
    minGapSeconds: 1, fetchImpl, sleep: noSleep,
  });
  assert.equal(summary.failed, 1);
  assert.equal(summary.added, 1);
  assert.ok(log.includes("finish:run-bad:http_error:0:0"));
});

test("wurde die Quelle zwischen Abruf und Eintrag gesperrt, endet der Lauf als source_changed", async () => {
  const log: string[] = [];
  const fetchImpl = (async () => json({ hits: [hn("1")] })) as unknown as typeof fetch;
  const summary = await runRadarCollection({
    db: fakeDb([{ source_id: "s", source_revision: 1, adapter: "hn_algolia", queries: ["a"] }], log, { ingestError: { code: "40001" } }),
    minGapSeconds: 1, fetchImpl, sleep: noSleep,
  });
  assert.equal(summary.failed, 1);
  assert.ok(log.includes("finish:run-s:source_changed:0:0"));
});

test("der Wochenlauf ist geschuetzt, kennt keinen Service-Role-Schluessel und ist noch nicht eingeplant", () => {
  const route = source("src/app/api/cron/problem-radar/route.ts");
  assert.match(route, /cron_secret_not_configured/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /collector_database_not_configured/);
  for (const path of [
    "src/app/api/cron/problem-radar/route.ts",
    "src/features/problem-radar/collector/pgCollectorDb.ts",
    "src/features/problem-radar/collector/runCollection.ts",
    "src/features/problem-radar/collector/hackerNews.ts",
  ]) {
    assert.doesNotMatch(source(path), /SERVICE_ROLE|service_role|createServiceClient|privilegedRetentionClient/, `${path} nutzt den Service-Role-Schluessel`);
  }
  // Vercel Hobby erlaubt zwei Cronjobs; ein dritter Eintrag liesse das Deployment scheitern.
  // Er wird erst mit dem Tarifwechsel eingetragen - dann diese Pruefung anpassen.
  const cron = JSON.parse(source("vercel.json")).crons as Array<{ path: string }>;
  assert.ok(cron.length <= 2, "ein dritter Cron-Eintrag: Tarif pruefen");
});

test("die Adminaktionen pruefen den Admin und der Kandidat verlaesst das Fach nur ueber die Datenbankfunktion", () => {
  const actions = source("src/features/problem-radar/actions.ts");
  for (const name of ["reviewRadarCandidateAction", "setRadarCollectionAction", "saveRadarSourceCollectionAction", "runRadarScanAction"]) {
    const start = actions.indexOf(`function ${name}`);
    assert.ok(start >= 0, name);
    assert.match(actions.slice(start, start + 200), /requirePlatformAdmin\(\)/, `${name} prueft den Admin nicht`);
  }
});
