import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getConnectListingDaysLeft } from "@/features/connect/connectPresentation";

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

// ---------------------------------------------------------------------------
// Ablauf: rechtzeitig sichtbar
// ---------------------------------------------------------------------------
test("an owner sees when a listing will expire", () => {
  const page = source("src/app/(product)/connect/my/page.tsx");
  // Der Ablauf nach 60 Tagen ist gewollt - er haelt das Netzwerk frisch. Er
  // funktioniert aber nur, wenn man rechtzeitig verlaengern kann, und dafuer
  // muss dastehen, wann Schluss ist.
  assert.match(page, /getConnectListingDaysLeft\(listing\.expires_at\)/);
  assert.match(page, /my\.expiresIn/);
  assert.match(page, /CONNECT_EXPIRY_WARNING_DAYS/);

  for (const locale of ["de", "en"]) {
    const my = readJson(`messages/${locale}/connect.json`).my as Record<string, string>;
    assert.ok(my.expiresIn, `${locale}: my.expiresIn fehlt`);
    assert.match(my.expiresIn, /\{days\}/, `${locale}: die Zahl muss vorkommen`);
  }
});

test("days left round up, so the last day still counts as a day", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  const inHours = (hours: number) =>
    new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

  // Abrunden wuerde bei 23 Stunden "0" anzeigen und damit falsch alarmieren.
  assert.equal(getConnectListingDaysLeft(inHours(23), now), 1);
  assert.equal(getConnectListingDaysLeft(inHours(25), now), 2);
  assert.equal(getConnectListingDaysLeft(inHours(24 * 30), now), 30);

  // Abgelaufen ist abgelaufen, nie eine negative Zahl.
  assert.equal(getConnectListingDaysLeft(inHours(-1), now), 0);
  assert.equal(getConnectListingDaysLeft(inHours(-500), now), 0);

  // Und was nicht lesbar ist, ergibt keine Aussage statt einer falschen.
  assert.equal(getConnectListingDaysLeft(null, now), null);
  assert.equal(getConnectListingDaysLeft("keinDatum", now), null);
});

// ---------------------------------------------------------------------------
// Einstellen und Stoebern sind zwei Dinge
// ---------------------------------------------------------------------------
test("die Uebersicht trennt Beitragen sichtbar vom Suchen", () => {
  // Vorher standen die drei Knoepfe zum Einstellen direkt ueber der
  // Reiterleiste und die direkt ueber dem Suchfeld - drei Reihen
  // Bedienelemente hintereinander, alle gleich gewichtet.
  const page = readFileSync("src/app/(product)/connect/page.tsx", "utf8");

  const postAt = page.indexOf('t("post.title")');
  const dividerAt = page.indexOf("border-t border-slate-200/80");
  const browseAt = page.indexOf('t("browse.title")');
  const tabsAt = page.indexOf("<ConnectTabs");

  assert.ok(postAt > 0, "der Bereich zum Einstellen hat keine Ueberschrift");
  assert.ok(dividerAt > postAt, "zwischen den beiden Haelften steht keine Trennung");
  assert.ok(browseAt > dividerAt && tabsAt > browseAt, "die Reiter stehen nicht im Stoeber-Teil");

  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
      post?: { title?: string; text?: string };
      browse?: { title?: string };
    };
    assert.ok(messages.post?.title && messages.post?.text, `${locale}: post fehlt`);
    assert.ok(messages.browse?.title, `${locale}: browse fehlt`);
  }
});

// ---------------------------------------------------------------------------
// Das Formular holt seine Texte selbst
// ---------------------------------------------------------------------------
test("kein Connect-Formular bekommt die Uebersetzungsfunktion gereicht", () => {
  // `t={t}` hat /connect/listings/new und /connect/my in Produktion zerlegt:
  // Eine Funktion laesst sich nicht ueber die Server-Browser-Grenze reichen.
  for (const path of [
    "src/features/connect/ConnectListingForm.tsx",
    "src/features/connect/ConnectLifecycleForm.tsx",
  ]) {
    const code = readFileSync(path, "utf8");
    assert.match(code, /useTranslations\("connect"\)/, `${path}: holt seine Texte nicht selbst`);
    assert.doesNotMatch(code, /t: T/, `${path}: nimmt den Uebersetzer noch als Prop`);
  }
  for (const path of [
    "src/app/(product)/connect/listings/new/page.tsx",
    "src/app/(product)/connect/listings/[listingId]/edit/page.tsx",
    "src/app/(product)/connect/my/page.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /t=\{t\}/, `${path}: reicht t weiter`);
  }
});
