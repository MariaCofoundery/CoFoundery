import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  REPORT_INSTRUMENT_LABEL,
  buildAlignmentReport,
} from "@/features/instruments/v2/alignmentReportData";
import type { StoredAnswerRow } from "@/features/instruments/v2/alignmentReadout";

const row = (partial: Partial<StoredAnswerRow> & { block_id: string }): StoredAnswerRow => ({
  answer_format: "F", value: null, missing_code: null, ...partial,
});
const scale = (blockId: string, n: number) => row({ block_id: blockId, answer_format: "F", value: { scale: n } });

test("der Report zeigt Antworten, keine Einordnung", () => {
  const report = buildAlignmentReport([scale("A01", 4), scale("A02", 2)]);
  const asText = JSON.stringify(report);

  // Teil F4 fuer Solo: „Angezeigt werden eigene Praeferenzen, Angebotsrahmen
  // und offene Anforderungen an kuenftige Partner." Kein Profil, kein Typ.
  assert.ok(!/"(score|type|profile|percent|rank|level|overall)"/i.test(asText));
  assert.equal(report.sections[0].label, "Analytische Prüfung");
  assert.equal(report.sections[0].entries.length, 2);
});

test("was offen ist, steht in einem eigenen Abschnitt", () => {
  // „Noch offen" ist im Produkt der nuetzlichste Befund. Zwischen die
  // beantworteten Fragen gemischt waere er versteckt.
  const report = buildAlignmentReport([
    scale("A01", 3),
    row({ block_id: "S02", answer_format: "single_choice", missing_code: "undecided" }),
    row({ block_id: "L01", answer_format: "free_text", missing_code: "confidential_first" }),
    row({ block_id: "B01", answer_format: "money_range", missing_code: "withheld" }),
  ]);

  assert.deepEqual(report.open.map((entry) => entry.entry.blockId), ["S02", "L01"]);
  // „Moechte ich nicht angeben" ist KEIN Gespraechsanlass - es ist eine
  // Entscheidung, die zu respektieren ist. Sie hier aufzufuehren hiesse, sie
  // doch noch zur Diskussion zu stellen.
  assert.ok(!report.open.some((entry) => entry.entry.blockId === "B01"));
});

test("die Bedingung steht einmal über der Gruppe, nicht fünfmal", () => {
  const report = buildAlignmentReport([scale("U01", 5), scale("U04", 4)]);
  const section = report.sections.find((entry) => entry.key === "U")!;
  assert.match(section.condition ?? "", /Verantwortungsbereich und Budget sind vereinbart/);
  assert.equal(section.entries.length, 2);
  // An der einzelnen Antwort steht sie im Report nicht noch einmal.
  assert.equal(section.entries.filter((entry) => entry.condition).length, 2);
});

test("ohne Vergleich steht der Satz aus Teil G da", () => {
  const solo = buildAlignmentReport([scale("A01", 3)], { hasComparison: false });
  assert.match(solo.soloNote?.meaning ?? "", /noch kein Vergleich/);

  const paired = buildAlignmentReport([scale("A01", 3)], { hasComparison: true });
  assert.equal(paired.soloNote, null);
});

test("die drei Unsicherheiten stehen vollständig am Report", () => {
  const report = buildAlignmentReport([scale("A01", 3)]);
  assert.equal(report.uncertainties.length, 3);
});

test("die Fassung steht am Report", () => {
  // Wer ihn in einem halben Jahr wiederfindet, soll wissen, aus welchem Modell
  // die Angaben stammen - und dass es ein Entwurf war.
  assert.match(REPORT_INSTRUMENT_LABEL, /^founder-alignment-v2 \(0\.2\.0, draft\)$/);
});

test("was noch nicht beantwortet wurde, wird benannt", () => {
  const report = buildAlignmentReport([scale("A01", 3)]);
  assert.ok(report.unanswered.length > 30);
  assert.ok(!report.unanswered.includes("A01"));
});

test("der Report zeigt keine Balken und keine Prozente", () => {
  // Ein Balken macht aus „manchmal" eine Laenge - und eine Laenge laedt zum
  // Vergleichen ein, wo es nichts zu vergleichen gibt.
  const view = readFileSync("src/features/instruments/v2/AlignmentReportView.tsx", "utf8");
  for (const forbidden of [/width:\s*`/, /style=\{\{[^}]*width/, /%<\//, /progress/i]) {
    assert.ok(!forbidden.test(view), `${forbidden} im Report`);
  }
});

test("kein v2-Abbild landet in der Tabelle für abgeleitete Zahlen", () => {
  // `person_alignment_snapshots` hat `scores jsonb NOT NULL`. Eine v2-Zeile
  // muesste Werte erfinden - und ein Advisor saehe Zahlen unter einer
  // Ueberschrift, die Zahlen verspricht, ohne Anlass zu fragen, woher sie
  // kommen. Genau die Sorte Wert, deren Abschaffung der Anlass fuer diese
  // Neufassung war.
  const MIGRATIONS = "../supabase/migrations";
  const schema = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");
  assert.match(schema, /person_alignment_snapshots_v1_only/);
  assert.match(schema, /check \(instrument_id = 'founder-compatibility-v1'\)/);
});
