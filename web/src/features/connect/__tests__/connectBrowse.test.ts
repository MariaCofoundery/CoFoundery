import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const PAGE = "src/app/(product)/connect/page.tsx";
const DATA = "src/features/connect/connectData.ts";
const MIGRATION = "../supabase/migrations/20260915120000_add_network_listing_search.sql";

// ---------------------------------------------------------------------------
// Freitextsuche
// ---------------------------------------------------------------------------
test("browsing has a search box, not only structured filters", () => {
  const page = source(PAGE);
  assert.match(page, /name="q"/);
  assert.match(page, /type="search"/);
  assert.match(page, /filters\.search/);

  for (const locale of ["de", "en"]) {
    const filters = readJson(`messages/${locale}/connect.json`).filters as Record<string, string>;
    assert.ok(filters.search, `${locale}: filters.search fehlt`);
  }
});

test("the two inputs that looked like a search but demanded exactness are gone", () => {
  const page = source(PAGE);
  // "Thema" und "Branche" waren Textfelder, prueften aber auf exakte
  // Gleichheit mit einem Listeneintrag: Wer "sales" tippte, fand "B2B Sales"
  // nicht. Neben einem echten Suchfeld ist das eine Falle.
  assert.doesNotMatch(page, /<input name="topic"/);
  assert.doesNotMatch(page, /<input name="industry"/);

  // Als Parameter bleiben sie gueltig, damit bestehende Links weiter
  // funktionieren.
  const data = source(DATA);
  assert.match(data, /filters\.topic/);
  assert.match(data, /filters\.industry/);
});

test("the search covers what people actually type", () => {
  const data = source(DATA);
  assert.match(data, /query\.ilike\("search_text", `%\$\{escaped\}%`\)/);

  const migration = source(MIGRATION);
  // Titel, Beschreibung, Themen und Branchen in einem Feld - sonst waeren
  // gerade die Begriffe nicht durchsuchbar, nach denen gesucht wird.
  for (const column of ["title", "summary", "topics", "industries"]) {
    assert.match(migration, new RegExp(`new\\.${column}`), `${column} fehlt in search_text`);
  }
});

test("LIKE wildcards typed by a person are escaped", () => {
  const data = source(DATA);
  // Keine Sicherheitsfrage - PostgREST parametrisiert -, aber ein getipptes
  // "%" waere sonst eine Suche nach allem.
  assert.match(data, /replace\(\/\[\\\\%_\]\/g/);
});

// ---------------------------------------------------------------------------
// Wie die Suchspalte gepflegt wird
// ---------------------------------------------------------------------------
test("the search column is maintained by a trigger, not by hand", () => {
  const migration = source(MIGRATION);
  assert.match(migration, /create trigger network_listing_search_text/);
  assert.match(migration, /before insert or update of title, summary, topics, industries/);
  // Bestand muss nachgezogen werden, sonst findet die Suche alte Anzeigen nie.
  assert.match(migration, /update public\.network_listings\s*\nset search_text/);
});

test("a generated column was ruled out for a stated reason", () => {
  const migration = source(MIGRATION);
  // array_to_string ist STABLE, nicht IMMUTABLE - `generated always as` geht
  // damit nicht. Das steht in der Migration, damit niemand es spaeter
  // "vereinfacht".
  assert.match(migration, /STABLE/);
  // Auf die Spaltendefinition pruefen, nicht auf die Woerter: Der Kommentar
  // der Migration nennt "generated always as" ausdruecklich, um zu erklaeren,
  // warum es nicht verwendet wird.
  assert.match(migration, /add column if not exists search_text text not null default ''/);
});

test("the column is indexed for substring search", () => {
  const migration = source(MIGRATION);
  assert.match(migration, /create extension if not exists pg_trgm/);
  assert.match(migration, /using gin \(search_text gin_trgm_ops\)/);
});

// ---------------------------------------------------------------------------
// Leerzustand
// ---------------------------------------------------------------------------
test("an empty board and an empty result set say different things", () => {
  const page = source(PAGE);

  // Die erste Person, die Connect oeffnet, las "kein Eintrag passt zu allen
  // Kriterien" und bekam einen Knopf "Filter zuruecksetzen", der nichts tat -
  // obwohl gar kein Filter gesetzt war. Das liest sich wie eine Stoerung.
  assert.match(page, /const isFiltered = \[/);
  assert.match(page, /t\(isFiltered \? "empty\.title" : "empty\.firstTitle"\)/);
  // Und der Knopf erscheint nur, wenn er etwas tun kann.
  assert.match(page, /\{isFiltered \? <Link href="\/connect"/);

  for (const locale of ["de", "en"]) {
    const empty = readJson(`messages/${locale}/connect.json`).empty as Record<string, string>;
    assert.ok(empty.firstTitle, `${locale}: empty.firstTitle fehlt`);
    assert.ok(empty.firstText, `${locale}: empty.firstText fehlt`);
  }
});

test("the first empty state invites instead of reporting a mismatch", () => {
  const de = readJson("messages/de/connect.json").empty as Record<string, string>;
  assert.doesNotMatch(de.firstTitle, /Kriterien|Filter/);
  // Beide Wege bleiben angeboten, auch wenn nichts da ist.
  const page = source(PAGE);
  assert.match(page, /empty\.createSeeking/);
  assert.match(page, /empty\.createOffering/);
});

test("the search term counts as a filter for the empty state", () => {
  const page = source(PAGE);
  // Sonst saehe eine ergebnislose Suche aus wie ein leeres Brett.
  assert.match(page, /const isFiltered = \["q",/);
});
