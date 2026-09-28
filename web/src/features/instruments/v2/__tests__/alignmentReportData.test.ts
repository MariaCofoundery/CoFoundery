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

test("der Report zeigt Punkte statt Balken", () => {
  // Maria wollte, dass es „ein bisschen farbig" ist. Ein Balken wäre das
  // Naheliegende und genau das Falsche: Er macht aus „manchmal" eine LÄNGE,
  // und Längen laden zum Messen ein. Zwei Balken nebeneinander lesen sich wie
  // ein Abstand, und ein Abstand sieht aus wie ein Ergebnis.
  //
  // Fünf Punkte, von denen einer gefüllt ist, zeigen dasselbe, was der Readout
  // sagt: eine Position unter benannten Kategorien. Nichts daran ist eine
  // Strecke, nichts lässt sich davon subtrahieren.
  const view = readFileSync("src/features/instruments/v2/AlignmentReportView.tsx", "utf8");
  for (const forbidden of [/width:\s*`/, /style=\{\{[^}]*width/, /progress/i, /\bbar\b/i]) {
    assert.ok(!forbidden.test(view), `${forbidden} im Report`);
  }
  // Die Punktreihe ist da, und die Beschriftung steht weiterhin daneben.
  assert.match(view, /function ScalePosition/);
  assert.match(view, /Array\.from\(\{ length: of \}/);
  assert.match(view, /rounded-full/);
  assert.match(view, /<span className="text-base font-medium text-slate-900">\{label\}<\/span>/);
  // Und sie ist für Vorlesegeräte beschriftet.
  assert.match(view, /aria-label=\{`\$\{label\} \(\$\{position\}\/\$\{of\}\)`\}/);
});

test("ein leerer Report behauptet nichts über die Person", () => {
  // GEFUNDEN AM 28.09.2026 BEIM DURCHKLICKEN. Der Report zeigte bei einem
  // leeren Profil „Du hast beschrieben, welchen Entscheidungsspielraum du dir
  // wünschst und welche Zeit du anbieten kannst" - obwohl niemand etwas
  // beschrieben hatte. Ein Report, der etwas über mich behauptet, das nicht
  // stattgefunden hat, ist genau das, was dieses Instrument vermeiden soll.
  const empty = buildAlignmentReport([]);
  assert.equal(empty.isEmpty, true);
  assert.equal(empty.soloNote, null);
  assert.deepEqual(empty.sections, []);

  // Mit einer einzigen Antwort ist es kein leerer Report mehr.
  const some = buildAlignmentReport([scale("A01", 3)]);
  assert.equal(some.isEmpty, false);
  assert.ok(some.soloNote);
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

test("markiert wird am Report, nicht im Fragebogen", () => {
  // Maria am 28.09.2026: „Das ist auch ein bisschen zu viel für diesen
  // Fragebogen, weil man soll sich ja hier darauf konzentrieren."
  //
  // Das trifft etwas Genaueres, als es klingt: Beim Ausfüllen beantwortet man
  // eine Frage nach der anderen und sieht nie den Zusammenhang. Was man
  // besprechen möchte, weiß man erst, wenn die eigenen Antworten
  // nebeneinanderstehen.
  const questionnaire = readFileSync(
    "src/features/instruments/v2/AlignmentQuestionnaire.tsx", "utf8"
  );
  assert.ok(!/discussion\.mark/.test(questionnaire), "kein Ankreuzfeld im Fragebogen");
  assert.ok(!/changeCondition/.test(questionnaire), "und keine Notiz");

  const report = readFileSync("src/features/instruments/v2/AlignmentReportView.tsx", "utf8");
  assert.match(report, /<ReportMark/);
});

test("der Abgeben-Knopf steht am Ende, nicht über der ersten Frage", () => {
  // „Wenn man den Fragebogen aufmacht, kommt gleich ganz oben dieser Knopf
  // Fragebogen abschicken - der sollte dort nicht sein." Abgeben ist das
  // Letzte, was man tut.
  const source = readFileSync(
    "src/features/instruments/v2/AlignmentQuestionnaire.tsx", "utf8"
  );
  const kopf = source.indexOf('className="sticky top-0');
  const knopf = source.indexOf('shell.submit"');
  const fragen = source.indexOf("sections.map(");
  assert.ok(kopf < fragen, "die Fortschrittsanzeige steht oben");
  assert.ok(knopf > fragen, "der Abgeben-Knopf steht hinter den Fragen");

  // Und oben steht nur der Stand, kein Knopf.
  const kopfzeile = source.slice(kopf, source.indexOf("</div>", kopf));
  assert.ok(!/<button/.test(kopfzeile), "kein Knopf in der Kopfzeile");
});

test("die Markierung überlebt die Abgabe, die Antwort nicht", () => {
  // Sie ist keine Antwort: Sie sagt nichts darüber aus, wie jemand arbeiten
  // möchte, sondern „darüber möchte ich reden". Deshalb darf sie sich nach der
  // Abgabe noch ändern - gerade dann, wenn man den eigenen Report zum ersten
  // Mal im Zusammenhang liest.
  const MIGRATIONS = "../supabase/migrations";
  const schema = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");

  assert.match(schema, /alignment_answer_frozen_after_submit/);
  // Der Trigger friert die Antwort ein …
  assert.match(schema, /new\.value is distinct from old\.value/);
  // … und nennt marked_for_discussion bewusst NICHT.
  const trigger = schema.slice(
    schema.indexOf("keep_submitted_alignment_answers_frozen"),
    schema.indexOf("create trigger alignment_answers_frozen_after_submit")
  );
  assert.ok(!/marked_for_discussion/.test(trigger), "die Markierung bleibt änderbar");
  assert.ok(!/change_condition/.test(trigger), "die Notiz ebenfalls");
});
