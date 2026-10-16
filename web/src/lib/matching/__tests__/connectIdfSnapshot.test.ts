import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildConnectIdfSnapshot,
  connectIdfCorpusVersion,
  connectIdfSnapshotRow,
  ConnectIdfSnapshotError,
  getConnectIdfSnapshot,
  type ConnectIdfSnapshotRecord,
} from "@/lib/matching/connectIdfSnapshot";
import { matchConnect } from "@/lib/matching/v01/connectMatcher";
import { buildIdfSnapshot, createIdfIndex } from "@/lib/matching/v01/idf";
import { textTokens } from "@/lib/matching/v01/normalization";
import { MATCHING_VERSION, NORMALIZATION_VERSION } from "@/lib/matching/v01/version";
import { NOW, listingsById, offerInput, seekInput, synthetic, syntheticIdfSnapshot } from "@/lib/matching/v01/__tests__/helpers/synthetic";

/**
 * CONNECT-IDF-Snapshot: Builder, Hash, Version, Loader, Privacy, Abgrenzung.
 * Korpus-Gates, Ablage und Unveränderlichkeit in der Datenbank prüft
 * supabase/tests/matching_idf_snapshots.sql.
 */

const AS_OF = "2026-10-14T09:00:00.000Z";
const read = (path: string) => readFileSync(path, "utf8");

const DOCS = [
  { title: "Vertrieb gesucht", summary: "Wir suchen Hilfe beim Vertrieb von Software.", topics: ["Vertrieb"] },
  { title: "Biete Vertrieb", summary: "Erfahrung im B2B-Vertrieb und in Partnerschaften.", topics: ["Partnerschaften"] },
  { title: "Fundraising Sparring", summary: "Sparring für die erste Finanzierungsrunde.", topics: [] },
];

// ---------------------------------------------------------------------------
// DF und N
// ---------------------------------------------------------------------------
test("N = Anzahl Dokumente; ein Token zählt je Dokument höchstens einmal", () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  assert.equal(r.documentCount, 3);
  // "vertrieb" steht im ersten Dokument dreimal (Titel, Text, Thema) und im zweiten zweimal
  assert.equal(r.documentFrequencies.vertrieb, 2);
  assert.equal(r.documentFrequencies.sparring, 1, "zweimal im selben Dokument -> 1");
  const repeated = buildConnectIdfSnapshot([{ title: "Vertrieb Vertrieb vertrieb", summary: "VERTRIEB", topics: ["Vertrieb"] }], AS_OF);
  assert.deepEqual(repeated.documentFrequencies, { vertrieb: 1 });
  assert.equal(buildConnectIdfSnapshot([], AS_OF).documentCount, 0);
});

test("dieselbe Normalisierung wie C1: df-Schlüssel sind genau die textTokens der Dokumente", () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  const expected = new Set(DOCS.flatMap((d) => textTokens(d.title, d.summary, d.topics)));
  assert.deepEqual(Object.keys(r.documentFrequencies), [...expected].sort());
  assert.equal(r.normalizationVersion, NORMALIZATION_VERSION);
  assert.equal(r.matchingVersion, MATCHING_VERSION);
});

test("deterministisch: Reihenfolge der Dokumente egal, Schlüssel sortiert, Zeitpunkt auf UTC", () => {
  const a = buildConnectIdfSnapshot(DOCS, AS_OF);
  const b = buildConnectIdfSnapshot([...DOCS].reverse(), "2026-10-14T11:00:00+02:00");
  assert.deepEqual(b, a);
  assert.deepEqual(Object.keys(a.documentFrequencies), Object.keys(a.documentFrequencies).slice().sort());
  assert.equal(JSON.stringify(connectIdfSnapshotRow(a)), JSON.stringify(connectIdfSnapshotRow(b)));
});

test("fehlende Textfelder zählen als leer; ungültiger Stichtag wird abgelehnt", () => {
  const r = buildConnectIdfSnapshot([{ title: null, summary: "Vertrieb", topics: null }], AS_OF);
  assert.deepEqual(r.documentFrequencies, { vertrieb: 1 });
  assert.throws(() => buildConnectIdfSnapshot(DOCS, "gestern"), /as_of/);
});

// ---------------------------------------------------------------------------
// Hash und Version
// ---------------------------------------------------------------------------
test("gleiche Eingabe -> gleicher Hash; N, df oder Version ändern ihn bzw. die Version", () => {
  const base = buildConnectIdfSnapshot(DOCS, AS_OF);
  assert.equal(buildConnectIdfSnapshot(DOCS, AS_OF).sha256, base.sha256);
  const moreN = buildConnectIdfSnapshot([...DOCS, { title: "", summary: "", topics: [] }], AS_OF);
  assert.deepEqual(moreN.documentFrequencies, base.documentFrequencies);
  assert.notEqual(moreN.sha256, base.sha256, "nur N anders");
  assert.notEqual(moreN.idfCorpusVersion, base.idfCorpusVersion);
  const otherDf = buildConnectIdfSnapshot([...DOCS.slice(0, 2), { title: "Fundraising", summary: "", topics: [] }], AS_OF);
  assert.notEqual(otherDf.sha256, base.sha256, "df anders");
  assert.notEqual(buildConnectIdfSnapshot(DOCS, "2026-10-15T09:00:00Z").idfCorpusVersion, base.idfCorpusVersion, "anderer Stichtag");
  assert.notEqual(connectIdfCorpusVersion("matching-v0.2", AS_OF, base.sha256), base.idfCorpusVersion, "andere matching_version");
});

test("Version: connect-idf-<matching_version>-<YYYYMMDD>-<hash8>, Hash wie die Engine", () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  assert.equal(r.idfCorpusVersion, `connect-idf-matching-v0.1-20261014-${r.sha256.slice(0, 8)}`);
  assert.equal(r.sha256, buildIdfSnapshot(DOCS, "x").sha256, "Hash = idfSnapshotHash der Engine über N + df");
  assert.notEqual(r.idfCorpusVersion, "latest");
});

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
type Result = { data: unknown; error: unknown };
function fakeClient(result: Result | "throw") {
  const calls: { table: string; select?: string; eq: [string, unknown][]; other: string[] }[] = [];
  const finish = () => (result === "throw" ? Promise.reject(new Error("netz")) : Promise.resolve(result));
  const client = {
    from(table: string) {
      const call: (typeof calls)[number] = { table, eq: [], other: [] };
      calls.push(call);
      const chain = {
        select(columns: string) {
          call.select = columns;
          return chain;
        },
        eq(column: string, value: unknown) {
          call.eq.push([column, value]);
          return chain;
        },
        order() {
          call.other.push("order");
          return chain;
        },
        limit() {
          call.other.push("limit");
          return chain;
        },
        maybeSingle: finish,
      };
      return chain;
    },
  };
  return { client: client as never, calls };
}
const rowOf = (r: ConnectIdfSnapshotRecord, patch: Record<string, unknown> = {}) => ({
  ...connectIdfSnapshotRow(r),
  corpus_as_of: "2026-10-14T09:00:00+00:00",
  ...patch,
});
async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof ConnectIdfSnapshotError && error.code === code);
}

test("Loader: lädt genau die benannte Version und liefert einen Engine-Index", async () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  const fake = fakeClient({ data: rowOf(r), error: null });
  const loaded = await getConnectIdfSnapshot(fake.client, r.idfCorpusVersion);
  assert.equal(loaded.index.idfCorpusVersion, r.idfCorpusVersion);
  assert.equal(loaded.snapshot.sha256, r.sha256);
  assert.equal(fake.calls[0].table, "matching_idf_snapshots");
  assert.deepEqual(fake.calls[0].eq, [["idf_corpus_version", r.idfCorpusVersion], ["scope", "connect"]]);
  assert.deepEqual(fake.calls[0].other, [], "kein order/limit: keine 'neueste' Version");
});

test("Loader: falsche oder fehlende Version -> Fehler, kein Rückgriff", async () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  const never = fakeClient({ data: rowOf(r), error: null });
  for (const v of ["latest", "", "connect-idf-matching-v0.2-20261014-abcdef12", "synthetic-v03-all-listings", `${r.idfCorpusVersion} `]) {
    await rejects(getConnectIdfSnapshot(never.client, v), "invalid_version");
  }
  assert.equal(never.calls.length, 0, "ungültige Version fragt die Datenbank gar nicht");
  await rejects(getConnectIdfSnapshot(fakeClient({ data: null, error: null }).client, r.idfCorpusVersion), "not_found");
  await rejects(getConnectIdfSnapshot(fakeClient({ data: null, error: { code: "42501" } }).client, r.idfCorpusVersion), "load_failed");
  await rejects(getConnectIdfSnapshot(fakeClient("throw").client, r.idfCorpusVersion), "load_failed");
  const other = buildConnectIdfSnapshot(DOCS.slice(0, 1), AS_OF);
  await rejects(getConnectIdfSnapshot(fakeClient({ data: rowOf(other), error: null }).client, r.idfCorpusVersion), "not_found");
  await rejects(getConnectIdfSnapshot(fakeClient({ data: rowOf(r, { scope: "find" }), error: null }).client, r.idfCorpusVersion), "not_found");
});

test("Loader: fremde matching_version oder normalization_version -> Fehler", async () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  await rejects(
    getConnectIdfSnapshot(fakeClient({ data: rowOf(r, { matching_version: "matching-v0.2" }), error: null }).client, r.idfCorpusVersion),
    "matching_version_mismatch",
  );
  await rejects(
    getConnectIdfSnapshot(
      fakeClient({ data: rowOf(r, { normalization_version: "matching-normalization-v0.2" }), error: null }).client,
      r.idfCorpusVersion,
    ),
    "normalization_version_mismatch",
  );
});

test("Loader: falscher Hash, veränderte df, Version passt nicht zum Hash -> Fehler", async () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  const load = (patch: Record<string, unknown>) =>
    getConnectIdfSnapshot(fakeClient({ data: rowOf(r, patch), error: null }).client, r.idfCorpusVersion);
  await rejects(load({ sha256: "0".repeat(64) }), "hash_mismatch");
  await rejects(load({ document_frequencies: { ...r.documentFrequencies, vertrieb: 1 } }), "hash_mismatch");
  await rejects(load({ document_count: r.documentCount + 1 }), "hash_mismatch");
  await rejects(load({ corpus_as_of: "2026-10-15T09:00:00Z" }), "hash_mismatch");
  await rejects(load({ document_frequencies: { "max mustermann": 1 } }), "malformed");
  await rejects(load({ document_frequencies: { vertrieb: 99 } }), "malformed");
  await rejects(load({ document_frequencies: [] }), "malformed");
  await rejects(load({ document_count: "3" }), "malformed");
});

// ---------------------------------------------------------------------------
// Engine-Vertrag
// ---------------------------------------------------------------------------
test("unbekanntes Token erhält weiter ln(N+1); bekanntes ln((N+1)/(df+1))", async () => {
  const r = buildConnectIdfSnapshot(DOCS, AS_OF);
  const { index } = await getConnectIdfSnapshot(fakeClient({ data: rowOf(r), error: null }).client, r.idfCorpusVersion);
  assert.equal(index.idf("unbekanntestoken"), Math.log(4));
  assert.equal(index.idf("vertrieb"), Math.log(4 / 3));
});

test("geladener Snapshot rechnet CONNECT exakt wie der Engine-Snapshot derselben Daten", async () => {
  const docs = [...listingsById.values()].slice(0, 60).map(({ raw }) => ({ title: raw.title, summary: raw.summary, topics: raw.topics ?? [] }));
  const r = buildConnectIdfSnapshot(docs, AS_OF);
  const { index } = await getConnectIdfSnapshot(fakeClient({ data: rowOf(r), error: null }).client, r.idfCorpusVersion);
  const engine = createIdfIndex(buildIdfSnapshot(docs, r.idfCorpusVersion));
  const ctx = { now: NOW, viewerIsNetworkMember: true, purpose: "listing_match" as const, blockedOwnerIds: new Set<string>(), computedAt: null };
  const seeks = [...listingsById.values()].filter(({ raw }) => raw.direction === "seeking").slice(0, 5);
  const offers = [...listingsById.values()].filter(({ raw }) => raw.direction === "offering").slice(0, 10);
  for (const s of seeks) {
    for (const o of offers) {
      const viaLoader = matchConnect(seekInput(s.raw.id), offerInput(o.raw.id), ctx, index);
      const viaEngine = matchConnect(seekInput(s.raw.id), offerInput(o.raw.id), ctx, engine);
      assert.deepEqual(viaLoader, viaEngine);
    }
  }
});

test("Parität zum eingefrorenen Experiment-Korpus: gleiche Token, df nie höher", () => {
  // Die Fixture enthält 243 der 346 Einträge des Experiments (ohne Holdout-Personen).
  // Mit derselben Normalisierung muss jedes Token im eingefrorenen Korpus stehen,
  // und zwar mit mindestens derselben Dokumentfrequenz.
  const frozen = syntheticIdfSnapshot();
  const docs = synthetic.profiles.flatMap((p) => p.connect_listings).map((l) => ({ title: l.title, summary: l.summary, topics: l.topics }));
  assert.equal(docs.length, 243);
  const r = buildConnectIdfSnapshot(docs, AS_OF);
  assert.ok(r.documentCount <= frozen.n);
  for (const [token, count] of Object.entries(r.documentFrequencies)) {
    assert.ok(token in frozen.df, `Token fehlt im eingefrorenen Korpus: ${token}`);
    assert.ok(count <= frozen.df[token], `df höher als eingefroren: ${token}`);
  }
});

// ---------------------------------------------------------------------------
// Privacy
// ---------------------------------------------------------------------------
test("der Snapshot enthält keine Texte, IDs, E-Mail-Adressen oder Namen als Rohtext", () => {
  const docs = [
    {
      title: "Suche Mitgründerin für Vertrieb",
      summary: "Kontakt: max.mustermann@example.com, Profil 9f1c2a7e-0000-4000-8000-000000000001. Workstyle egal.",
      topics: ["Vertrieb"],
    },
  ];
  const r = buildConnectIdfSnapshot(docs, AS_OF);
  const json = JSON.stringify(connectIdfSnapshotRow(r));
  assert.ok(!json.includes("max.mustermann@example.com"), "keine E-Mail-Adresse");
  assert.ok(!json.includes("9f1c2a7e-0000-4000-8000-000000000001"), "keine UUID");
  assert.ok(!json.includes(docs[0].title) && !json.includes(docs[0].summary), "keine Rohtexte");
  for (const key of Object.keys(r.documentFrequencies)) assert.match(key, /^[a-z0-9]{3,}$/);
  assert.deepEqual(Object.keys(connectIdfSnapshotRow(r)).sort(), [
    "corpus_as_of", "document_count", "document_frequencies", "idf_corpus_version", "matching_version", "normalization_version", "scope", "sha256",
  ]);
  // Restrisiko, bewusst festgehalten (Spec §11.2 lässt Mindest-df nur ohne Score-Änderung zu):
  // Einzelne seltene Wörter eines Textes bleiben als Token mit df = 1 stehen.
  const [surname] = textTokens("Mustermann");
  assert.equal(r.documentFrequencies[surname], 1, `Nachname als Token: ${surname}`);
});

test("Korpus-Dokumente tragen keine IDs; die Korpus-Funktion liefert nur Textfelder", () => {
  const source = read("src/lib/matching/connectIdfSnapshot.ts");
  const docType = source.slice(source.indexOf("export type ConnectIdfDocument"), source.indexOf("export type ConnectIdfSnapshotRecord"));
  assert.deepEqual([...docType.matchAll(/(\w+)\??:/g)].map((m) => m[1]), ["title", "summary", "topics"]);
  const migration = read("../supabase/migrations/20261129120000_matching_idf_snapshots.sql").replace(/--.*$/gm, "");
  const fn = migration.slice(migration.indexOf("function public.connect_idf_corpus_documents"), migration.indexOf("comment on function"));
  assert.match(fn, /returns table \(title text, summary text, topics text\[\]\)/);
  assert.match(fn, /select listing\.title, listing\.summary, listing\.topics\n/);
  const sources = [...fn.matchAll(/(?:from|join) public\.(\w+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(sources, ["network_listings", "network_memberships", "network_profiles"], "keine Nachrichten, Workstyle, Research, Capability");
});

test("Snapshot- und Service-Role-Code ist serverseitig und in keinem Produktpfad", () => {
  assert.match(read("src/lib/matching/connectIdfSnapshot.ts"), /^import "server-only";/);
  const users: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__") walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && path !== join("src", "lib", "matching", "connectIdfSnapshot.ts")) {
        if (/connectIdfSnapshot|matching_idf_snapshots|connect_idf_corpus_documents/.test(read(path))) users.push(path);
      }
    }
  };
  walk("src");
  assert.deepEqual(users, [], "nur scripts/matching-idf-snapshot.ts nutzt den Snapshot");
  assert.match(read("scripts/matching-idf-snapshot.ts"), /isLocalSupabaseUrl\(url\) && args\.get\("confirm-remote"\) !== host/);
});

// ---------------------------------------------------------------------------
// Abgrenzung: FIND und CONNECT produktiv unverändert
// ---------------------------------------------------------------------------
test("FIND braucht kein IDF; außerhalb von lib/matching nutzt nur der FIND-Shadow die Engine", () => {
  for (const file of ["findMatcher.ts", "findRelevance.ts", "findEligibility.ts"]) {
    assert.doesNotMatch(read(`src/lib/matching/v01/${file}`), /idf"/);
  }
  // Vorbereitete, selbst nirgends eingebundene Server-Module (eigener Test prüft, dass niemand sie importiert).
  // Seit E1 zusätzlich der FIND-Shadow: rechnet nach der Antwort und verwirft das Ergebnis.
  const PREPARED_UNWIRED = [
    join("src", "features", "discovery", "privateSearchConstraints.ts"),
    join("src", "features", "discovery", "findMatchingShadow.ts"),
  ];
  const productUsers: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== "__tests__" && path !== join("src", "lib", "matching")) walk(path);
      } else if (/\.(ts|tsx)$/.test(entry) && /from "@\/lib\/matching/.test(read(path)) && !PREPARED_UNWIRED.includes(path)) {
        productUsers.push(path);
      }
    }
  };
  walk("src");
  assert.deepEqual(productUsers, []);
  const migration = read("../supabase/migrations/20261129120000_matching_idf_snapshots.sql").replace(/--.*$/gm, "");
  assert.doesNotMatch(migration, /search_founder_discovery|generate_connect_suggestions|search_connect|network_listings_select/);
});
