import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAdvisorSelfReport,
  hasUsableAlignment,
} from "@/features/advisor/advisorSelfReport";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import type { AdvisorPersonAlignment } from "@/features/advisor/personViewData";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261047120000_person_alignment_snapshots.sql";
const ACTIONS = "src/features/reporting/actions.ts";
const PAGE = "src/app/(product)/advisor/person/[userId]/page.tsx";

const alignment = (scores: Record<string, number | null>): AdvisorPersonAlignment => ({
  scores,
  valuesProfile: null,
  valuesStatus: "not_started",
  valuesAnswered: 0,
  valuesTotal: 0,
  basisAnswered: 36,
  basisTotal: 36,
  instrumentId: "founder-compatibility-v1",
  updatedAt: "2026-09-20T10:00:00.000Z",
});

// ---------------------------------------------------------------------------
// Der Einzelreport für den Accelerator
// ---------------------------------------------------------------------------
//
// GEWÜNSCHT AM 26.09.2026: "Der Accelerator soll ggf. nach Freigabe entweder
// den Einzelpersonen-Report [...] bekommen."
//
// Der Umfang war seit Langem freigebbar und nirgends darstellbar - weil die
// Rohantworten niemand außer der Person selbst sieht. Die Grenzen prüft
// `supabase/tests/person_alignment_snapshots.sql`; hier steht, was der Code
// zusagt.

test("eine fehlende Dimension wird null, nicht null Komma null", () => {
  const first = FOUNDER_DIMENSION_ORDER[0];
  const report = buildAdvisorSelfReport({
    alignment: alignment({ [first]: 3.4 }),
    locale: "de",
    name: "Nora",
  });

  assert.equal(report.scoresA[first], 3.4);
  // EINE NULL WÄRE EIN MESSWERT am Ende der Skala - "diese Person ist maximal
  // auf der einen Seite" - und stünde da, wo in Wahrheit nichts steht.
  for (const dimension of FOUNDER_DIMENSION_ORDER.slice(1)) {
    assert.equal(report.scoresA[dimension], null, dimension);
  }
});

test("der Rechenweg und die Fragebogen-Kennungen bleiben bei der Person", () => {
  const report = buildAdvisorSelfReport({
    alignment: alignment(Object.fromEntries(FOUNDER_DIMENSION_ORDER.map((d) => [d, 3]))),
    locale: "de",
    name: "Nora",
  });

  // Der Rechenweg je Dimension gehört der Person: Mit ihm ließe sich auf
  // einzelne Antworten zurückrechnen.
  assert.deepEqual(report.debugA.dimensions, []);
  // Und die Kennungen sind ein Griff auf Zeilen, die niemand sonst lesen
  // darf - sie mitzugeben wäre eine Einladung, es zu versuchen.
  assert.equal(report.selfAssessmentMeta, undefined);
  assert.equal(report.participantAId, null);
});

test("der Stand des Abbilds wird mitgegeben, nicht die aktuelle Zeit", () => {
  const report = buildAdvisorSelfReport({
    alignment: alignment({ [FOUNDER_DIMENSION_ORDER[0]]: 2 }),
    locale: "de",
    name: "Nora",
  });
  // Ohne diese Angabe sähe ein halbes Jahr altes Bild aus wie ein heutiges.
  assert.equal(report.createdAt, "2026-09-20T10:00:00.000Z");
});

test("ohne einen einzigen Wert gibt es nichts zu zeigen", () => {
  // Sonst erzeugen die Textbausteine aus lauter Nullen ein Muster, das es
  // nicht gibt.
  assert.equal(hasUsableAlignment(null), false);
  assert.equal(hasUsableAlignment(alignment({})), false);
  assert.equal(hasUsableAlignment(alignment({ nichtsdergleichen: 4 })), false);
  assert.equal(hasUsableAlignment(alignment({ [FOUNDER_DIMENSION_ORDER[0]]: 1 })), true);
});

test("abgelegt werden Zahlen, kein fertiger Text", () => {
  const migration = sqlCodeOnly(MIGRATION);

  // Ein abgelegter Text veraltet still: Ändert sich eine Formulierung im
  // Produkt, liest der Accelerator weiter die alte - und niemand merkt es.
  assert.match(migration, /scores jsonb not null/);
  for (const forbidden of ["narrative", "summary_text", "rendered", "html"]) {
    assert.ok(!migration.includes(forbidden), `kein abgelegter Text: ${forbidden}`);
  }
  // Und ein Abbild ohne einen einzigen Wert wird abgewiesen.
  assert.match(migration, /scores <> '\{\}'::jsonb/);
});

test("die Person schreibt ihr Abbild selbst - und es darf fehlschlagen", () => {
  const actions = codeOnly(ACTIONS);

  // Kein Dienstschlüssel, keine Sonderrolle: Die Zeilensicherheit lässt
  // ohnehin nur die eigene Zeile zu.
  assert.match(actions, /from\("person_alignment_snapshots"\)[\s\S]{0,80}\.upsert\(/);
  assert.ok(
    !/person_alignment_snapshots[\s\S]{0,200}service_role/.test(actions),
    "kein Dienstschlüssel für das Abbild"
  );

  // Das Abbild ist eine Nebenwirkung. Wenn es nicht gelingt, hat die Person
  // trotzdem ihren Report - diese Funktion beantwortet "wie sieht mein Report
  // aus" und nicht "konnte ich ihn ablegen".
  assert.match(actions, /person_alignment_snapshots[\s\S]{0,900}\.then\(/);
});

test("die Anzeige nennt den Stand und zeigt nichts ohne Werte", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /hasUsableAlignment\(alignment\)/);
  assert.match(page, /alignmentAsOf/);
  // In der kurzen Dichte: Wer hier liest, entscheidet über Menschen - eine
  // Wand aus Text ist dabei kein Vorteil.
  assert.match(page, /density="summary"/);
});
