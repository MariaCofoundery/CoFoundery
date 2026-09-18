import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { localizeFounderAlignmentReport } from "@/features/reporting/founderAlignmentReportPayload";
import { resolveInsightTitle } from "@/features/reporting/content/insightTitles/insightTitles";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAYLOAD = "src/features/reporting/founderAlignmentReportPayload.ts";
const MATCHING_PAGE = "src/app/(product)/matching/[matchingSessionId]/report/page.tsx";
const LEGACY_PAGE = "src/app/report/[sessionId]/page.tsx";

/**
 * Ein Report gehoert zwei Menschen.
 *
 * Er wird einmal gebaut und gespeichert - bis 18.09.2026 in der Sprache
 * derjenigen ANFRAGE, die den Bau ausgeloest hat. Wer ihn ausgeloest hat,
 * entschied damit ueber die Sprache der anderen Person, und zwar dauerhaft.
 */

test("der Report folgt der Sprache der lesenden Person", () => {
  for (const path of [MATCHING_PAGE, LEGACY_PAGE]) {
    const code = codeOnly(path);
    assert.match(code, /await getRequestLocale\(\)/, `${path}: fragt nicht nach der Sprache des Lesers`);
    assert.doesNotMatch(
      code,
      /getFounderAlignmentReportPayloadLocale/,
      `${path}: nimmt noch die Sprache, in der gebaut wurde`
    );
  }
});

test("neu uebersetzt wird aus dem gespeicherten Ergebnis, nicht neu gerechnet", () => {
  const code = codeOnly(PAYLOAD);
  // buildFounderAlignmentReport ist eine reine Funktion aus (Ergebnis,
  // Teamkontext, Sprache). Das Ergebnis liegt im Payload - es muss also
  // niemand neu punkten, und die Zahlen bleiben dieselben.
  assert.match(code, /scoringResult: payload\.founderScoring/);
  assert.match(code, /locale: viewerLocale/);
  assert.doesNotMatch(code, /localizeFounderAlignmentReport[\s\S]{0,400}scoreFounderAlignment/);
});

test("ein alter Report ohne Ergebnis bleibt, wie er ist", () => {
  // Ein halb uebersetzter Report waere schlimmer als ein durchgehend
  // deutscher. Ohne die sprachneutrale Grundlage wird nichts angefasst - und
  // die zurueckgegebene Sprache ist dann die GESPEICHERTE, damit die Ansicht
  // nicht in der falschen Sprache weiterbaut.
  const stored = { sections: { marker: "alt" } } as never;

  const ohneErgebnis = localizeFounderAlignmentReport(
    { locale: "de", founderReport: stored, teamContext: "pre_founder" },
    "en"
  );
  assert.equal(ohneErgebnis.founderReport, stored);
  assert.equal(ohneErgebnis.locale, "de");

  const ohneKontext = localizeFounderAlignmentReport(
    { locale: "de", founderReport: stored, founderScoring: {} as never },
    "en"
  );
  assert.equal(ohneKontext.founderReport, stored);
  assert.equal(ohneKontext.locale, "de");
});

test("stimmt die Sprache schon, wird nichts neu gebaut", () => {
  const stored = { sections: { marker: "gespeichert" } } as never;
  const result = localizeFounderAlignmentReport(
    { locale: "de", founderReport: stored, founderScoring: {} as never, teamContext: "pre_founder" },
    "de"
  );
  assert.equal(result.founderReport, stored, "unnoetige Arbeit bei jedem Aufruf");
  assert.equal(result.locale, "de");
});

test("die englischen Report-Texte sind wirklich da", () => {
  // Die Umstellung nuetzt nichts, wenn die englische Seite leer ist. Die
  // Bausteine liegen in zwei Dateien nebeneinander - der Umfang muss
  // vergleichbar sein.
  const de = source("src/features/reporting/content/builderCopy/builderCopy.de.ts");
  const en = source("src/features/reporting/content/builderCopy/builderCopy.en.ts");

  // Alle Schluessel auf allen Ebenen - die Bausteine liegen tief verschachtelt,
  // eine Pruefung nur der obersten Ebene haette drei Namen verglichen.
  const keys = (code: string) =>
    new Set([...code.matchAll(/^\s+"?([a-zA-Z][\w]*)"?:\s/gm)].map((match) => match[1]));
  const deKeys = keys(de);
  const enKeys = keys(en);

  assert.ok(deKeys.size > 50, `zu wenige Schluessel gefunden (${deKeys.size})`);
  assert.deepEqual(
    [...deKeys].filter((key) => !enKeys.has(key)),
    [],
    "diese Bausteine gibt es nur auf Deutsch"
  );
});

test("der Befund steht in beiden Sprachen, und zwar getrennt vom Scoring", () => {
  // AUSGANGSLAGE (17.-18.09.2026): Die Befundtexte standen als deutsche
  // Konstanten im Scoring-Modul. `toInsight` baute daraus einen fertigen
  // deutschen `title`, der so in den gespeicherten Report wanderte - deshalb
  // liess die englische Fassung ihn in vier Saetzen weg.
  //
  // Jetzt liegen sie in content/insightTitles in beiden Sprachen, und der
  // Titel wird beim Anzeigen gebildet.
  const de = resolveInsightTitle({ dimension: "Unternehmenslogik", kind: "strength" }, "de");
  const en = resolveInsightTitle({ dimension: "Unternehmenslogik", kind: "strength" }, "en");
  assert.ok(de && en);
  assert.notEqual(de, en);
  assert.match(de, /Unternehmenslogik/);
  assert.doesNotMatch(en, /[äöüßÄÖÜ]/, "der englische Befund traegt deutschen Text");

  // Der kanonische Name und die ID fuehren zum selben Text - `dimension`
  // traegt im Scoring-Ergebnis den Namen, die Tabellen liegen unter der ID.
  assert.equal(resolveInsightTitle({ dimension: "company_logic", kind: "strength" }, "en"), en);

  // Bei einer Spannung entscheidet zuerst die gemeinsame Lage, dann das
  // Konfliktrisiko - dieselbe Reihenfolge wie im Scoring.
  const gemeinsam = resolveInsightTitle(
    { dimension: "Konfliktstil", kind: "tension", jointState: "BOTH_HIGH", conflictRisk: "high" },
    "en"
  );
  const risiko = resolveInsightTitle(
    { dimension: "Konfliktstil", kind: "tension", jointState: null, conflictRisk: "high" },
    "en"
  );
  assert.ok(gemeinsam && risiko && gemeinsam !== risiko);

  // Ohne Anhaltspunkt wird nichts erfunden.
  assert.equal(resolveInsightTitle({ dimension: "Konfliktstil", kind: "tension" }, "en"), null);
  assert.equal(resolveInsightTitle({ dimension: "gibt es nicht", kind: "strength" }, "en"), null);
});

test("beide Sprachen decken dieselben Faelle ab", () => {
  // Eine Luecke auf einer Seite hiesse: In dieser Sprache endet der Satz nach
  // der Dimension, in der anderen nicht.
  const code = source("src/features/reporting/content/insightTitles/insightTitles.ts");
  const keysOf = (name: string) => {
    const start = code.indexOf(`const ${name}: LocalizedTitles`);
    const end = code.indexOf("\n};", start);
    return [...code.slice(start, end).matchAll(/^\s{4}([a-z_]+):/gm)].map((m) => m[1]);
  };
  const de = keysOf("DE");
  const en = keysOf("EN");
  assert.ok(de.length >= 20, `zu wenige Eintraege gefunden (${de.length})`);
  assert.deepEqual(de, en, "die Tabellen decken nicht dieselben Dimensionen ab");
});

test("die Sprache haengt an der Textsammlung, nicht an einem zweiten Parameter", () => {
  // Beim Bauen ist genau das schiefgegangen: englische Vorlagen plus
  // Voreinstellung "de" fuer die Befunde - ein englischer Satz mit deutschem
  // Halbsatz. Die Sammlung traegt ihre Sprache jetzt selbst.
  const builder = source("src/features/reporting/content/builderCopy/builderCopy.ts");
  assert.match(builder, /locale: AppLocale;/);
  const summary = source("src/features/reporting/buildExecutiveSummary.ts");
  assert.match(summary, /const locale = builderCopy\.locale;/);
  assert.doesNotMatch(summary, /locale\?: AppLocale;/, "ein zweiter Parameter waere die alte Falle");
});

test("das Scoring traegt keine Prosa mehr in den Report", () => {
  // Die deutschen Konstanten stehen weiter im Scoring - sie fuellen
  // collaborationStrengths und Geschwister. Der Report liest sie nicht mehr.
  // codeOnly, nicht source: Der Kommentar an der Stelle ERKLAERT, warum dort
  // nicht `insight.title` steht - und liess die Pruefung sonst fehlschlagen,
  // die genau das sichern soll.
  const summary = codeOnly("src/features/reporting/buildExecutiveSummary.ts");
  assert.doesNotMatch(summary, /insight\.title/, "der Report nimmt wieder den gespeicherten deutschen Titel");
  assert.match(summary, /resolveInsightTitle\(/);
});
