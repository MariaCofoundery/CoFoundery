import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { localizeFounderAlignmentReport } from "@/features/reporting/founderAlignmentReportPayload";

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
