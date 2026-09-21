import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  HIGHLIGHT_DISCLOSURES,
  HIGHLIGHT_KINDS,
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
  // § 5a UWG: Werbung muss als solche erkennbar sein. Das Feld dafuer steht
  // von Anfang an im Typ und wird von Anfang an angezeigt - ein Hinweis, der
  // erst mit dem Geld gebaut wird, wird beim Einbau vergessen.
  assert.deepEqual([...HIGHLIGHT_DISCLOSURES], ["none", "editorial", "sponsored"]);

  const component = codeOnly(COMPONENT);
  assert.match(
    component,
    /highlight\.disclosure !== "none" \?[\s\S]{0,200}disclosures\.\$\{highlight\.disclosure\}/,
    "die Kennzeichnung wird nicht angezeigt"
  );

  for (const locale of ["de", "en"]) {
    const disclosures = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        highlight: { disclosures: Record<string, string> };
      }
    ).highlight.disclosures;
    assert.ok(disclosures.sponsored, `${locale}: der Text fuer bezahlte Plaetze fehlt`);
    assert.ok(disclosures.editorial, `${locale}: der Text fuer hervorgehobene fehlt`);
    // "Anzeige" oder "Ad" - kein Euphemismus. "Empfohlen" oder "Partner" waere
    // genau die Umschreibung, die das Gesetz meint.
    assert.match(disclosures.sponsored, locale === "de" ? /^Anzeige$/ : /^Ad$/);
  }
});

test("heute ist alles Zufall, und das steht auch dran", () => {
  // Ohne diesen Satz liest sich das Feld als Auswahl DES HAUSES - also als
  // Empfehlung, und zwar fuer Menschen.
  const data = codeOnly(DATA);
  assert.equal((data.match(/disclosure: "none"/g) ?? []).length, 3, "je Sorte einmal");
  assert.doesNotMatch(data, /disclosure: "sponsored"/, "es gibt noch nichts Bezahltes");

  const component = codeOnly(COMPONENT);
  assert.match(component, /randomNote/);
  for (const locale of ["de", "en"]) {
    const highlight = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        highlight: Record<string, string>;
      }
    ).highlight;
    assert.ok(highlight.randomNote, `${locale}: der Hinweis auf den Zufall fehlt`);
  }
});

test("gemischt wird, nicht bewertet", () => {
  // Eine Rangfolge waere hier besonders heikel: Ein Highlight wird als
  // Empfehlung gelesen. Und Fisher-Yates statt sort mit Zufallszahl - das ist
  // nicht gleichverteilt und je nach Sortierverfahren sogar stabil.
  const data = codeOnly(DATA);
  assert.doesNotMatch(data, /sort\(\(\) => Math\.random/);
  assert.match(data, /Math\.floor\(Math\.random\(\) \* \(index \+ 1\)\)/);
  // Erst mischen, dann abschneiden - sonst waere die Reihenfolge der Sorten
  // die eigentliche Auswahl.
  assert.match(data, /shuffle\(candidates\)\.slice\(0, limit\)/);
});

test("alle vier Sorten koennen erscheinen, und jede sagt, was sie ist", () => {
  assert.deepEqual([...HIGHLIGHT_KINDS], ["seeking", "offering", "venture", "person"]);

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

test("der Platz fuer Kampagnen steht schon, aber es gibt noch keine", () => {
  // `selection` ist die eine Stelle, an der spaeter eine Kampagne eingreift -
  // damit keine zweite Mechanik daneben entsteht. Heute reicht die Uebersicht
  // nichts herein.
  const data = codeOnly(DATA);
  assert.match(data, /export type ConnectHighlightSelection/);
  assert.match(data, /selection: ConnectHighlightSelection = \{\}/);
  assert.match(data, /kinds\?: readonly HighlightKind\[\]/);

  const page = codeOnly(PAGE);
  assert.match(page, /getConnectHighlights\(client, user\.id\)/);
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
  assert.equal((data.match(/=== currentUserId/g) ?? []).length, 3, "je Sorte einmal");
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
  assert.equal((data.match(/\.eq\("status", "active"\)/g) ?? []).length, 5);
  // Und keine abgelaufenen Anzeigen, an beiden Stellen.
  assert.equal((data.match(/\.gt\("expires_at"/g) ?? []).length, 2);
});

test("das Feld steht vor dem Suchen, nicht danach", () => {
  // Es ist der Blick auf etwas, das man NICHT gesucht hat. Unter den Treffern
  // waere es eine Fussnote.
  const page = codeOnly(PAGE);
  const highlightAt = page.indexOf("<ConnectHighlight");
  const tabsAt = page.indexOf("<ConnectTabs");
  assert.ok(highlightAt > 0 && highlightAt < tabsAt, "das Feld steht unter der Liste");
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
  assert.match(page, /<details className="w-full" open=\{activeFilterCount > 0\}>/);
  assert.match(page, /<details className="mt-3 border-t border-slate-100 pt-3">/);

  // Der Knopf steht beim Suchfeld, nicht in einer eigenen Zeile darunter.
  assert.match(page, /aria-label=\{t\("filters\.search"\)\}[\s\S]{0,200}filters\.apply/);

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
