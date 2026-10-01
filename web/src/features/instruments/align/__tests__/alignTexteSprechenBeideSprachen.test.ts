import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, sep } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sie duerfen deutsch sein, sie stehen nicht auf dem Bildschirm. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const bundle = (locale: string) =>
  JSON.parse(source(join("messages", locale, "alignment.json"))) as Record<
    string,
    Record<string, string>
  >;

/**
 * Die ALIGN-Bauteile sprechen beide Sprachen.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EINE EIGENE DATEI WERT IST
 * ---------------------------------------------------------------------------
 *
 * `WorkMap` und `ReportViewV21` werden von sechs Seiten benutzt — dem eigenen
 * Profil, der Advisor-Ansicht, dem Vergleich, den beiden Antwortenseiten und
 * dem Piloten. Ihre Texte standen bis zum 01.10.2026 fest im Quelltext. In
 * einer englischen Sitzung las man dort deutsche Absätze, und zwar auch als
 * Advisor über einen fremden Menschen.
 *
 * Ein fest verdrahteter Satz fällt niemandem auf, der Deutsch liest. Deshalb
 * sucht dieser Test nach dem Muster und nicht nach den bekannten Sätzen.
 */

const ADVISOR_SEITE = join(
  "src", "app", "(product)", "advisor", "person", "[userId]", "page.tsx",
);

const BAUTEILE = [
  join("src", "features", "instruments", "align", "AlignMaps.tsx"),
  join("src", "features", "instruments", "v21", "ReportViewV21.tsx"),
];

/** Wörter, die in einem sichtbaren Text praktisch nur auf Deutsch vorkommen. */
const DEUTSCH =
  /[äöüÄÖÜß]|\b(und|oder|nicht|kein|keine|dein|deine|hier|steht|Frage|Fragen|Antwort|Antworten|noch|wurde|wird|ihr|euch)\b/;

test("in den Bauteilen steht kein sichtbarer deutscher Text mehr", () => {
  for (const datei of BAUTEILE) {
    const code = codeOnly(datei);

    // Was zwischen zwei Elementen steht, sieht man.
    for (const treffer of code.matchAll(/>\s*([^<>{}\n][^<>{}]{3,})\s*</g)) {
      const text = treffer[1].split(/\s+/).join(" ").trim();
      assert.ok(!DEUTSCH.test(text), `${datei}: fest verdrahtet — "${text.slice(0, 80)}"`);
    }

    // Und ein Ausweichwert in einer Zeichenkette auch.
    for (const treffer of code.matchAll(/"([^"\n]{4,})"/g)) {
      const text = treffer[1];
      if (text.startsWith("@/") || text.startsWith(".")) continue;
      if (!text.includes(" ")) continue;
      assert.ok(!DEUTSCH.test(text), `${datei}: fest verdrahtet — "${text.slice(0, 80)}"`);
    }
  }
});

test("Betraege und Daten tragen das Format der gelesenen Sprache", () => {
  // `toLocaleDateString("de-DE")` in einer englischen Seite ist dieselbe Art
  // Fehler wie ein deutscher Satz dort.
  for (const datei of BAUTEILE) {
    const code = codeOnly(datei);
    assert.ok(!/"de-DE"/.test(code), `${datei}: festes deutsches Zahlenformat`);
  }
  assert.match(
    codeOnly(BAUTEILE[1]),
    /getFormatter\(\)/,
    "ReportViewV21 formatiert nicht über die Sprache",
  );
});

test("jeder benutzte Schluessel steht in beiden Sprachen", () => {
  const de = bundle("de");
  const en = bundle("en");

  // Je Datei der eigene Namespace. Die Advisor-Seite benutzt mehrere
  // Uebersetzer; dort zaehlen nur die Aufrufe von `tAlign`, alles andere
  // gehoert anderen Bundles.
  const benutzt = new Set<string>();
  for (const datei of BAUTEILE) {
    const code = codeOnly(datei);
    const block = /getTranslations\("alignment\.(\w+)"\)/.exec(code)?.[1];
    assert.ok(block, `${datei}: kein alignment-Namespace`);
    for (const treffer of code.matchAll(/\bt\("(\w+)"/g)) {
      benutzt.add(`${block}.${treffer[1]}`);
    }
  }
  for (const treffer of codeOnly(ADVISOR_SEITE).matchAll(/tAlign\("(\w+)"/g)) {
    benutzt.add(`advisor.${treffer[1]}`);
  }

  assert.ok(benutzt.size >= 10, `zu wenige Schlüssel gefunden: ${benutzt.size}`);
  for (const pfad of benutzt) {
    const [block, schluessel] = pfad.split(".");
    assert.ok(de[block]?.[schluessel], `de: alignment.${pfad} fehlt`);
    assert.ok(en[block]?.[schluessel], `en: alignment.${pfad} fehlt`);
  }
});

test("die englische Fassung traegt dieselbe Einschraenkung", () => {
  // Der Satz ist der Grund, warum die Seite ueberhaupt gezeigt werden darf,
  // solange der Bogen `draft` traegt. Eine englische Fassung ohne ihn waere
  // eine staerkere Aussage als die deutsche.
  const en = bundle("en");
  const note = en.advisor.selfReportNote;
  assert.match(note, /Self-report/);
  assert.match(note, /not a test result/);

  // Und dasselbe auf dem eigenen Profil.
  const profil = JSON.parse(source(join("messages", "en", "profile.json"))) as {
    founderProfile: { workProfile: Record<string, string> };
  };
  assert.match(profil.founderProfile.workProfile.note, /Self-report/);

  // NACHGEZOGEN AM 01.10.2026: „Keine Punktzahl" stand bis dahin in diesem
  // einen Satz, zusammen mit „zu dieser Fassung gibt es noch keine
  // Auswertung". Der zweite Teil stimmt nicht mehr, seit es die beschreibende
  // Zusammenfassung gibt - der erste schon, und er steht jetzt an ihr. Sie
  // erscheint auf allen drei Oberflaechen, auch beim Advisor.
  const syn = (en.synthesis ?? {}) as Record<string, string>;
  assert.match(syn.note, /not a score/i);
  assert.match(syn.note, /not a diagnosis/i);
  assert.match((bundle("de").synthesis as Record<string, string>).note, /keine Punktzahl/i);
});

test("die Advisor-Ansicht hat keine eigene Uebersetzung der ALIGN-Saetze", () => {
  // Zwei Fassungen desselben Satzes laufen auseinander, sobald jemand eine
  // davon schaerft.
  const seite = codeOnly(ADVISOR_SEITE);
  assert.match(seite, /getTranslations\("alignment\.advisor"\)/);
  assert.ok(
    !/Selbstauskunft|Testergebnis|Du siehst \{/.test(seite),
    "die Advisor-Seite traegt die Saetze noch fest verdrahtet",
  );

  const de = bundle("de");
  const profil = JSON.parse(source(join("messages", "de", "profile.json"))) as {
    founderProfile: { workProfile: Record<string, string> };
  };
  // Derselbe Satz, Wort fuer Wort - auf dem eigenen Profil und beim Advisor.
  assert.equal(de.advisor.selfReportNote, profil.founderProfile.workProfile.note);
});

test("die Bauteile sind Serverkomponenten und bleiben es", () => {
  // Mit "use client" kaeme `getTranslations` nicht mehr an, und jemand
  // muesste die Texte wieder hineinschreiben.
  for (const datei of BAUTEILE) {
    assert.ok(!/"use client"/.test(source(datei)), `${datei}: ist eine Clientkomponente`);
  }
  void sep;
});
