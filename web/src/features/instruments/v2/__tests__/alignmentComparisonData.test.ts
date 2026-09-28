import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAlignmentComparison, type ComparisonSideInput } from "@/features/instruments/v2/alignmentComparisonData";
import type { StoredAnswerRow } from "@/features/instruments/v2/alignmentReadout";

const row = (partial: Partial<StoredAnswerRow> & { block_id: string }): StoredAnswerRow => ({
  answer_format: "F", value: null, missing_code: null, ...partial,
});
const scale = (blockId: string, n: number) => row({ block_id: blockId, answer_format: "F", value: { scale: n } });

const side = (partial: Partial<ComparisonSideInput> & { name: string }): ComparisonSideInput => ({
  instrumentId: "founder-alignment-v2",
  rows: [], markedBlockIds: [], notSharedBlockIds: [], ...partial,
});

test("„nicht geteilt“ ist etwas anderes als „nicht beantwortet“", () => {
  // Teil F7: „Nicht teilbare Felder sind im Teamreport ‚nicht geteilt‘, nicht
  // ‚fehlendes Commitment‘." Wer die beiden zusammenwirft, macht aus einer
  // Entscheidung ein Versäumnis.
  const result = buildAlignmentComparison(
    side({ name: "Anna", rows: [scale("A01", 4)], notSharedBlockIds: ["B01"] }),
    side({ name: "Bert", rows: [scale("A01", 4), row({ block_id: "B01", answer_format: "money_range", value: { min: 1000, currency: "EUR" } })] })
  );

  const b01 = result.comparisons.find((entry) => entry.blockId === "B01")!;
  assert.equal(b01.state, "not_comparable");
  assert.equal(b01.reason, "not_shared_a");
  // Und die zurückgehaltene Seite gibt nichts preis.
  assert.equal(b01.a, null);
});

test("ein zurückgehaltener Block taucht auf, auch wenn er sonst fehlte", () => {
  // Sonst verschwände er ganz - und „nicht geteilt“ wäre nicht sichtbar,
  // sondern einfach nichts.
  const result = buildAlignmentComparison(
    side({ name: "Anna", rows: [], notSharedBlockIds: ["R05"] }),
    side({ name: "Bert", rows: [] })
  );
  assert.equal(result.comparisons.length, 1);
  assert.equal(result.comparisons[0].blockId, "R05");
  assert.equal(result.comparisons[0].reason, "not_shared_a");
});

test("Zusage und Erwartung finden zueinander", () => {
  const result = buildAlignmentComparison(
    side({
      name: "Anna",
      rows: [row({ block_id: "R01", answer_format: "number_range", value: { min: 12, max: 16, unit: "Stunden/Woche" } })],
    }),
    side({
      name: "Bert",
      rows: [row({
        block_id: "R02", answer_format: "person_number_range",
        value: { unit: "Stunden/Woche", per: [{ recipient: "Anna", min: 25, max: 30 }] },
      })],
    })
  );

  assert.equal(result.gaps.length, 1);
  assert.equal(result.gaps[0].shortfall, 9);
  assert.equal(result.clarifications[0].kind, "expectation_not_covered");
  // Und die Karte dazu trägt die echten Zahlen.
  assert.match(result.cards[0].observed, /16 Stunden\/Woche/);
});

test("zwei Fassungen werden nicht verglichen", () => {
  assert.throws(
    () => buildAlignmentComparison(
      side({ name: "Anna", instrumentId: "founder-compatibility-v1", rows: [scale("A01", 1)] }),
      side({ name: "Bert", rows: [scale("A01", 5)] })
    ),
    /instrument_mismatch_between_people/
  );
});

test("höchstens vier Karten, und die Agenda ist vollständig", () => {
  const many = ["A01", "A02", "I01", "I03", "E01", "E03"];
  const result = buildAlignmentComparison(
    side({ name: "Anna", rows: many.map((id) => scale(id, 1)), markedBlockIds: ["E03"] }),
    side({ name: "Bert", rows: many.map((id) => scale(id, 5)) })
  );

  // Die Agenda zeigt alles - gekürzt wird erst, was in einer Sitzung
  // besprochen wird.
  assert.equal(result.agenda.length, many.length);
  assert.ok(result.cards.length <= 4);
  // Das markierte Thema steht oben, obwohl alle denselben Abstand haben.
  assert.equal(result.agenda[0].blockId, "E03");
  assert.equal(result.agenda[0].priority, 1);
});

test("eine Erwartungslücke ergibt eine Karte, nicht zwei", () => {
  // GEFUNDEN AM 28.09.2026 BEIM DURCHKLICKEN. Die Lücke hängt an R01 und R02
  // zugleich, und die Agenda führt beide auf - also erschien derselbe Text
  // zweimal hintereinander. Im Test war das nicht zu sehen, weil dort nie
  // beide Blöcke gleichzeitig vorlagen.
  const result = buildAlignmentComparison(
    side({
      name: "Anna",
      rows: [row({ block_id: "R01", answer_format: "number_range", value: { min: 12, max: 16, unit: "Stunden/Woche" } })],
    }),
    side({
      name: "Bert",
      rows: [row({
        block_id: "R02", answer_format: "person_number_range",
        value: { unit: "Stunden/Woche", per: [{ recipient: "Anna", min: 25, max: 30 }] },
      })],
    })
  );

  // Die Agenda nennt beide Blöcke - das ist richtig, beide gehören dazu.
  assert.ok(result.agenda.filter((entry) => entry.reason === "expectation_or_limit").length >= 2);
  // Die Karte gibt es trotzdem nur einmal.
  const gapCards = result.cards.filter((card) => card.id === "time_and_expectations");
  assert.equal(gapCards.length, 1);
});

test("die Karten bekommen Namen in der dritten Person", () => {
  // Die Bausteine aus Teil G lauten „A sagt für die kommenden zwölf Wochen …
  // zu". Mit „Du" als Namen wird daraus „Du sagt für die kommenden zwölf
  // Wochen" - beim Durchklicken genau so dagestanden.
  const page = readFileSync(
    "src/app/(product)/debug/alignment-v2/compare/[partnerId]/page.tsx",
    "utf8"
  );
  // Die Anrede steht nur in den Spaltenüberschriften.
  assert.match(page, /columnA=\{t\("compare\.you"\)\}/);
  // Und die Karten bekommen echte Namen, im Zweifel „Person A".
  assert.match(page, /displayName\(auth\.user\.id, "Person A"\)/);
  assert.ok(!/nameA = "Du"/.test(page), "kein Pronomen als Name");
});
