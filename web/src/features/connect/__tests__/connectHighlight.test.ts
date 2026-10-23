import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  HIGHLIGHT_DISCLOSURES,
  HIGHLIGHT_KINDS,
  pickAcrossKinds,
  pickPlacements,
  type ConnectHighlight,
} from "@/features/connect/connectHighlightData";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const DATA = "src/features/connect/connectHighlightData.ts";
const COMPONENT = "src/features/connect/ConnectHighlight.tsx";
const PAGE = "src/app/(product)/connect/page.tsx";

/**
 * Das Highlight-Feld auf der Connect-Übersicht.
 *
 * GEWUENSCHT AM 21.09.2026: ein wechselndes Feld mit allem, was es gibt -
 * Gesuche, Angebote, Unternehmen, Profile -, zunaechst zufaellig, spaeter mit
 * Kampagnen und irgendwann mit bezahlten Plaetzen.
 *
 * Die letzte Absicht ist der Grund, warum hier schon Tests stehen: Ein
 * bezahlter Platz ohne Kennzeichnung ist kein Geschmacksfehler, sondern ein
 * Rechtsbruch.
 */

test("bezahlte Plaetze koennen nicht unbeschriftet erscheinen", () => {
  // § 5a UWG: Werbung muss als solche erkennbar sein. Seit die Verwaltung
  // Plaetze vergeben kann, ist das nicht mehr Vorsorge, sondern Betrieb. Und
  // JEDE Karte traegt eine Marke, auch der Zufall: Waere nur der Rest
  // gekennzeichnet, las sich "nichts dran" als Empfehlung.
  assert.deepEqual([...HIGHLIGHT_DISCLOSURES], ["none", "editorial", "sponsored"]);

  const component = codeOnly(COMPONENT);
  assert.match(
    component,
    /disclosures\.\$\{highlight\.disclosure\}/,
    "die Kennzeichnung wird nicht angezeigt"
  );
  assert.doesNotMatch(component, /disclosure !== "none"/, "die Marke darf nicht an einer Bedingung haengen");

  for (const locale of ["de", "en"]) {
    const disclosures = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        highlight: { disclosures: Record<string, string> };
      }
    ).highlight.disclosures;
    for (const key of HIGHLIGHT_DISCLOSURES) assert.ok(disclosures[key], `${locale}: disclosures.${key} fehlt`);
    // "Anzeige" oder "Ad" - kein Euphemismus. "Empfohlen" oder "Partner" waere
    // genau die Umschreibung, die das Gesetz meint.
    assert.match(disclosures.sponsored, locale === "de" ? /^Anzeige$/ : /^Ad$/);
  }
});

test("bezahlt ist nur, was die Verwaltung dazu gemacht hat, und der Zufall bleibt Zufall", () => {
  const data = codeOnly(DATA);
  // Aus dem Zufall wird nichts Bezahltes: die vier Sorten bleiben "none".
  assert.equal((data.match(/disclosure: "none"/g) ?? []).length, 4, "je Sorte einmal");
  // Die Marke eines Platzes kommt aus der Quelle des Platzes, nirgends sonst.
  assert.match(data, /disclosure: row\.source/);
  assert.doesNotMatch(data, /disclosure: "sponsored"/);
  // Die Begruendung einer Empfehlung wird bei einer Anzeige nicht uebernommen.
  assert.match(data, /note: row\.source === "editorial" \? row\.note : null/);

  const component = codeOnly(COMPONENT);
  assert.match(component, /randomNote/);
  for (const locale of ["de", "en"]) {
    const highlight = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        highlight: Record<string, string>;
      }
    ).highlight;
    assert.ok(highlight.randomNote, `${locale}: der Hinweis auf den Zufall fehlt`);
    assert.ok(highlight.adNote, `${locale}: der Hinweis zur Anzeige fehlt`);
  }
});

test("Plaetze: hoechstens eine Empfehlung und eine Anzeige, nie derselbe Mensch zweimal", () => {
  const make = (owner: string, disclosure: ConnectHighlight["disclosure"], id: string) =>
    ({ kind: "offering", id, title: id, text: "", href: "/connect", disclosure, isOwn: false, has: null, note: null,
       person: { user_id: owner } }) as unknown as ConnectHighlight;
  const many = [
    make("a", "editorial", "e1"), make("b", "editorial", "e2"),
    make("c", "sponsored", "s1"), make("d", "sponsored", "s2"),
  ];
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const chosen = pickPlacements(many, 3);
    assert.equal(chosen.length, 2);
    assert.deepEqual(chosen.map((entry) => entry.disclosure).sort(), ["editorial", "sponsored"]);
  }
  // Gehoeren Empfehlung und Anzeige demselben Menschen, bleibt eine Karte.
  assert.equal(pickPlacements([make("a", "editorial", "e1"), make("a", "sponsored", "s1")], 3).length, 1);
  // Kein Platz: nichts.
  assert.equal(pickPlacements([], 3).length, 0);
});

test("ein Platz verdraengt nur dann Zufall, wenn er laeuft, und mischt am Ende mit", () => {
  const data = codeOnly(DATA);
  // Die Plaetze kommen aus der Datenbank, die dieselbe Freigabe pruefte wie bei
  // den Zufallskarten; der Besitzer wird danach noch einmal geprueft.
  assert.match(data, /list_connect_highlight_placements/);
  assert.match(data, /placementOwnerId/);
  // Ein ausgefallener Platz-Abruf laesst es beim Zufall.
  assert.match(data, /placementResult\.error \? \[\]/);
  // Zum Schluss wird gemischt: Die Reihenfolge ist keine Rangfolge, auch nicht fuer eine Anzeige.
  assert.match(data, /const chosen = shuffle\(\[/);
});

test("gemischt wird, nicht bewertet", () => {
  // Eine Rangfolge waere hier besonders heikel: Ein Highlight wird als
  // Empfehlung gelesen. Und Fisher-Yates statt sort mit Zufallszahl - das ist
  // nicht gleichverteilt und je nach Sortierverfahren sogar stabil.
  const data = codeOnly(DATA);
  assert.doesNotMatch(data, /sort\(\(\) => Math\.random/);
  assert.match(data, /Math\.floor\(Math\.random\(\) \* \(index \+ 1\)\)/);
  // Gemischt wird an drei Stellen: die Sortenfolge, die Eintraege innerhalb
  // einer Sorte, und daraus wird reihum gezogen. Abgeschnitten wird nicht mehr
  // ueber alle hinweg - das gab der Mehrheit die Plaetze (siehe den Test
  // "die Auswahl mischt die Sorten").
  assert.doesNotMatch(data, /shuffle\(candidates\)\.slice/);
  assert.match(data, /pickAcrossKinds\(/);
});

test("alle vier Sorten koennen erscheinen, und jede sagt, was sie ist", () => {
  assert.deepEqual([...HIGHLIGHT_KINDS], ["seeking", "offering", "venture", "person", "problem"]);

  const component = codeOnly(COMPONENT);
  assert.match(component, /kinds\.\$\{highlight\.kind\}/, "ohne Marke klickt man in etwas Falsches");

  for (const locale of ["de", "en"]) {
    const kinds = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        highlight: { kinds: Record<string, string> };
      }
    ).highlight.kinds;
    for (const kind of HIGHLIGHT_KINDS) {
      assert.ok(kinds[kind], `${locale}: highlight.kinds.${kind} fehlt`);
    }
  }
});

test("Highlights prüfen die Freigabe aller Besitzer ohne Kampagnenfilter", () => {
  const data = codeOnly(DATA);
  assert.match(data, /get_connect_highlight_owners/);
  assert.doesNotMatch(data, /ConnectHighlightSelection/);
  assert.match(codeOnly(PAGE), /getConnectHighlights\(client, user\.id\)/);
});

test("man darf sich selbst im Highlight sehen - und erfaehrt es", () => {
  // GEAENDERT AM 21.09.2026 auf Marias Wunsch: "Ich finde auch voellig okay,
  // wenn man selber gerade im Highlight ist, dass man sich selber auch sieht.
  // Dann kann man sich ein bisschen freuen." Vorher war die eigene Person
  // ausgeschlossen.
  const data = codeOnly(DATA);
  assert.doesNotMatch(data, /\.neq\("user_id", currentUserId\)/, "die eigene Person ist wieder ausgeschlossen");

  // Aber die Karte sagt es, sonst wundert man sich, warum da der eigene Name
  // steht.
  // Die drei Zuweisungen, nicht die Typzeile mitgezaehlt.
  assert.equal((data.match(/=== currentUserId/g) ?? []).length, 5, "je Sorte einmal, dazu die Plaetze");
  const component = codeOnly("src/features/connect/ConnectHighlight.tsx");
  assert.match(component, /highlight\.isOwn \?/);
  assert.match(component, /t\("yours"\)/);

  for (const locale of ["de", "en"]) {
    const highlight = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        highlight: Record<string, string>;
      }
    ).highlight;
    assert.ok(highlight.yours, `${locale}: highlight.yours fehlt`);
  }
});

test("nur Veroeffentlichtes erscheint", () => {
  // Ein Entwurf ist fuer niemanden sichtbar - auch nicht als Highlight und
  // auch nicht als Zahl auf einer Personenkarte. Drei Abfragen fuer die
  // Kandidaten, zwei fuer das Zaehlen dessen, was ein Mensch mitbringt.
  const data = codeOnly(DATA);
  assert.equal((data.match(/\.eq\("status", "active"\)/g) ?? []).length, 2);
  // Und keine abgelaufenen Anzeigen, an beiden Stellen.
  assert.equal((data.match(/\.gt\("expires_at"/g) ?? []).length, 1);
});

test("das Feld steht vor dem Suchen, nicht danach", () => {
  // Es ist der Blick auf etwas, das man NICHT gesucht hat. Unter den Treffern
  // waere es eine Fussnote.
  const page = codeOnly(PAGE);
  const highlightAt = page.indexOf("<ConnectHighlight");
  assert.ok(highlightAt > 0, "das Feld fehlt");
});

test("die Auswahl mischt die Sorten, statt der Mehrheit zu folgen", () => {
  // GEMELDET AM 21.09.2026: "Ich glaube, dass die Highlights immer noch nur
  // Unternehmen anzeigen. Also irgendwie fehlt da noch was."
  //
  // Das war nicht die Datenlage, sondern die Auswahl: Vorher wanderten alle
  // Kandidaten in einen Topf, und drei wurden gezogen. Wer zwanzig Unternehmen
  // und zwei Anzeigen hat, zieht damit fast immer drei Unternehmen - der
  // Zufall gibt die Mehrheit wieder, und die Mehrheit ist nicht die Absicht.
  const make = (kind: (typeof HIGHLIGHT_KINDS)[number], index: number) =>
    ({
      kind,
      id: `${kind}-${index}`,
      title: `${kind} ${index}`,
      text: "",
      href: "/connect",
      disclosure: "none",
      isOwn: false,
      person: { user_id: `${kind}-${index}` },
    }) as unknown as ConnectHighlight;

  // Der alte Fehlerfall, zwanzig zu zwei zu eins.
  const lopsided = [
    ...Array.from({ length: 20 }, (_, index) => make("venture", index)),
    ...Array.from({ length: 2 }, (_, index) => make("offering", index)),
    make("person", 0),
  ];

  // Hundert Ziehungen, und in JEDER stehen drei verschiedene Sorten. Einmal zu
  // pruefen wuerde hier nichts heissen - die Auswahl ist zufaellig.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const chosen = pickAcrossKinds(lopsided, 3);
    assert.equal(chosen.length, 3);
    assert.equal(
      new Set(chosen.map((entry) => entry.kind)).size,
      3,
      `Ziehung ${attempt}: ${chosen.map((entry) => entry.kind).join(", ")}`
    );
  }

  // Und keine Sorte steht dabei immer vorn: Eine feste Reihenfolge waere eine
  // Rangfolge, und eine Rangfolge will dieses Feld nicht sein.
  const firstKinds = new Set(
    Array.from({ length: 100 }, () => pickAcrossKinds(lopsided, 3)[0]?.kind)
  );
  assert.ok(firstKinds.size > 1, "vorn steht immer dieselbe Sorte");

  // Gibt es weniger Sorten als Plaetze, bleibt kein Platz leer - dann ruecken
  // die vorhandenen nach.
  const onlyVentures = Array.from({ length: 5 }, (_, index) => make("venture", index));
  assert.equal(pickAcrossKinds(onlyVentures, 3).length, 3);
  assert.equal(pickAcrossKinds([make("person", 0)], 3).length, 1);
});

test("vom Filterblock ist eine Zeile sichtbar, der Rest ist eingeklappt", () => {
  // NACHGEMELDET AM 21.09.2026: "Da ist immer noch diese grosse
  // Filterfunktion noch nicht eingeklappt." Eingeklappt waren die Auswahlen -
  // darunter stand aber weiter der Block zum Merken der Suche, mit der
  // Faehigkeiten-Auswahl darin, und der war groesser als die Filter selbst.
  const page = codeOnly(PAGE);
  const filterSection = page.slice(page.indexOf('name="q"') - 400, page.indexOf('name="q"'));
  assert.doesNotMatch(filterSection, /className=\{card\}/, "der Filter ist wieder eine volle Karte");

  // Zwei eingeklappte Bereiche: die Auswahlen und das Merken.
  // Seit dem Umbau auf Filter links (Board 28, 23.10.2026) liegt der Filter als Seitenleiste
  // neben der Liste: Auf dem Telefon bleibt er eingeklappt, am Bildschirm ist er offen
  // (globals.css, `.connect-filter-details`). Das Merken bleibt eingeklappt.
  assert.match(page, /<details className="connect-filter-details" open=\{activeFilterCount > 0\}>/);
  assert.match(page, /<details>\s*<summary[^>]*>\{t\("rememberSearch"\)\}/);

  // NACHGESCHAERFT AM 21.09.2026, und das ist die Umkehrung dessen, was hier
  // vorher stand: "Ich meine eigentlich, dass der ganze Bereich unter den
  // Filtern auch weg sollte. Also auch Filter anwenden, diese Suche merken und
  // so weiter, dieses ganze Feld, was da ist, sollte erst da sein, wenn ich es
  // aufklappe." Der Anwenden-Knopf stand bis dahin bewusst beim Suchfeld -
  // jetzt liegt er im eingeklappten Teil, und sichtbar bleibt nur das Feld.
  const openerAt = page.indexOf('<details className="connect-filter-details"');
  const applyAt = page.lastIndexOf('t("filters.apply")');
  const closeAt = page.indexOf("</details>", openerAt);
  assert.ok(openerAt > 0 && applyAt > openerAt && applyAt > closeAt, "der Anwenden-Knopf ist sichtbar");

  // Und die Trefferzahl liegt mit ihm drin: Wie viele Treffer es gibt, sieht
  // man an den Treffern - die Zahl ist eine Antwort aufs Eingrenzen.
  const countAt = page.indexOf('t("feed.result');
  assert.ok(countAt > openerAt && countAt > closeAt, "die Trefferzahl steht ausserhalb");

  // Und die Faehigkeiten-Auswahl liegt hinter dem eingeklappten Merken.
  const rememberAt = page.indexOf("rememberSearch");
  const pickerAt = page.indexOf("<CapabilityAreaPicker");
  assert.ok(rememberAt > 0 && pickerAt > rememberAt);
});

test("das Leuchten ist abschaltbar, weil Bewegung Schmuck ist", () => {
  // Wer im Betriebssystem weniger Bewegung eingestellt hat, hat das aus einem
  // Grund getan - oft aus einem gesundheitlichen. Dann dieselben Farben ohne
  // Wanderung, nicht ein anderer Kasten.
  const css = readFileSync("src/app/globals.css", "utf8");
  const block = css.slice(css.indexOf(".connect-highlight {"));
  assert.match(block, /@keyframes connect-highlight-drift/);
  const reduced = block.slice(block.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.length > 0, "kein Abschalter fuer die Bewegung");
  assert.match(reduced, /\.connect-highlight::before \{\s*animation: none;/);

  // Das Leuchten liegt hinter dem Inhalt und faengt keinen Klick ab.
  assert.match(block, /pointer-events: none/);
  assert.match(block, /\.connect-highlight > \* \{\s*position: relative;\s*z-index: 1;/);

  // Langsam: Alles darunter wird im Blickfeld zu einer Bewegung, die man
  // wegklicken moechte.
  const seconds = Number((block.match(/connect-highlight-drift (\d+)s/) ?? [])[1]);
  assert.ok(seconds >= 12, `zu schnell: ${seconds}s`);
});

test("der Leerzustand fragt nicht nur nach Anzeigen", () => {
  // "Hier steht noch nichts" plus zwei Knoepfe fuer Anzeigen las sich wie eine
  // Pinnwand. Wer keine Anzeige hat, hat vielleicht ein Unternehmen.
  const page = codeOnly(PAGE);
  assert.match(page, /empty\.createVenture/);
  assert.match(page, /href="\/connect\/ventures\/mine"/);

  for (const locale of ["de", "en"]) {
    const empty = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        empty: Record<string, string>;
      }
    ).empty;
    assert.ok(empty.createVenture, `${locale}: empty.createVenture fehlt`);
  }
});
