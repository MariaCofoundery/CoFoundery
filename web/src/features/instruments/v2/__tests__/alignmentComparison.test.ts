import assert from "node:assert/strict";
import test from "node:test";
import { buildReadout, type StoredAnswerRow } from "@/features/instruments/v2/alignmentReadout";
import {
  CLARIFICATIONS_NOT_DERIVABLE,
  assertComparableInstruments,
  clarificationsNeeded,
  compareBlocks,
  expectationGaps,
} from "@/features/instruments/v2/alignmentComparison";
import { AGENDA_OUTCOMES, buildAgenda } from "@/features/instruments/v2/alignmentAgenda";
import { getContextBlocks } from "@/features/instruments/v2/contextRegistryV2";

const row = (partial: Partial<StoredAnswerRow> & { block_id: string }): StoredAnswerRow => ({
  answer_format: "F", value: null, missing_code: null, ...partial,
});
const scale = (blockId: string, n: number) => row({ block_id: blockId, answer_format: "F", value: { scale: n } });

// ---------------------------------------------------------------------------
// Teil F3: nebeneinander, nicht gegeneinander
// ---------------------------------------------------------------------------

test("gleiche und verschiedene Kategorien werden benannt, nicht bewertet", () => {
  const a = buildReadout([scale("A01", 2), scale("A02", 4)]);
  const b = buildReadout([scale("A01", 2), scale("A02", 5)]);
  const compared = compareBlocks(a, b);

  assert.equal(compared.find((entry) => entry.blockId === "A01")!.state, "same");
  assert.equal(compared.find((entry) => entry.blockId === "A02")!.state, "different");

  // KEIN GRAD UND KEINE STAERKE. Teil F6: „Es gibt keinen Schwellwert für
  // ‚deutlich‘, ‚riskant‘ oder ‚unpassend‘." Ein Abstand von 1 und einer von 4
  // sind beide schlicht „verschieden".
  const far = compareBlocks(buildReadout([scale("A01", 1)]), buildReadout([scale("A01", 5)]));
  assert.equal(far[0].state, "different");
  assert.ok(!Object.keys(far[0]).some((key) => /distance|delta|severity|risk|score/i.test(key)));
});

test("ein fehlender Grund macht den Vergleich unmöglich, nicht negativ", () => {
  const a = buildReadout([row({ block_id: "B01", answer_format: "money_range", missing_code: "prefer_not_to_say" })]);
  const b = buildReadout([row({ block_id: "B01", answer_format: "money_range", value: { min: 5000, currency: "EUR" } })]);
  const compared = compareBlocks(a, b);

  assert.equal(compared[0].state, "not_comparable");
  // Der Grund wird benannt, damit „hat nichts gesagt" nicht wie „passt nicht"
  // aussieht.
  assert.equal(compared[0].reason, "missing_a");
});

test("es gibt keinen Gesamtwert, auch keinen versteckten", () => {
  // Teil F5, wörtlich: „Keinen Gesamt-Alignment- oder Kompatibilitätsscore
  // einführen." Der Grund steht dort daneben: Ein globaler Abstand könnte
  // „eine ausdrückliche Haftungsgrenze durch mehrere harmlose Gemeinsamkeiten
  // verdecken".
  const a = buildReadout([scale("A01", 1), scale("A02", 1), scale("I01", 1)]);
  const b = buildReadout([scale("A01", 5), scale("A02", 1), scale("I01", 1)]);
  const compared = compareBlocks(a, b);

  const asText = JSON.stringify(compared);
  assert.ok(!/"(score|match|percent|overall|total|fit)"/i.test(asText));
  // Die Rückgabe ist eine Liste je Block - es gibt gar keine Stelle, an der
  // eine Zahl über alle stehen könnte.
  assert.ok(Array.isArray(compared));
  assert.equal(compared.length, 3);
});

test("ein Vergleich über zwei Fassungen hinweg ist keiner", () => {
  // Teil F2 und der Prüfplan in F7: „Teamvergleich bei Versionsunterschied
  // deaktiviert." Dieselbe Beschriftung kann in v1 und v2 etwas anderes heißen.
  assert.throws(
    () => assertComparableInstruments("founder-compatibility-v1", "founder-alignment-v2"),
    /instrument_mismatch_between_people/
  );
  assert.doesNotThrow(() => assertComparableInstruments("founder-alignment-v2", "founder-alignment-v2"));
});

// ---------------------------------------------------------------------------
// Teil F3: die gerichtete Erwartungslücke
// ---------------------------------------------------------------------------

test("das Beispiel aus dem Gutachten kommt richtig heraus", () => {
  // „A bietet 12–16 Stunden, B erwartet von A 25–30. ‚Die Angaben überlappen
  // nicht; B erwartet mindestens neun Stunden mehr als A maximal zusagt.‘"
  const gaps = expectationGaps(
    [{ side: "a", min: 12, max: 16, unit: "Stunden/Woche" }],
    [{ side: "b", recipient: "A", min: 25, max: 30, unit: "Stunden/Woche" }]
  );
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].shortfall, 9);
  assert.equal(gaps[0].expectedAtLeast, 25);
  assert.equal(gaps[0].offeredAtMost, 16);
});

test("die Mittelpunkte werden nicht verglichen", () => {
  // Teil F3: „Bei Bereichen werden zunächst Überlappung und Bedingungen
  // gezeigt; nicht willkürlich die Mittelpunkte vergleichen." Angebot 10–40,
  // Erwartung 20–25: Die Mitten lägen 2,5 auseinander - aber die Bereiche
  // überlappen, es fehlt nichts.
  const gaps = expectationGaps(
    [{ side: "a", min: 10, max: 40, unit: "Stunden/Woche" }],
    [{ side: "b", recipient: "A", min: 20, max: 25, unit: "Stunden/Woche" }]
  );
  assert.deepEqual(gaps, []);
});

test("A→B und B→A sind getrennte Beziehungen", () => {
  const gaps = expectationGaps(
    [
      { side: "a", min: 10, max: 10, unit: "Stunden/Woche" },
      { side: "b", min: 40, max: 40, unit: "Stunden/Woche" },
    ],
    [
      { side: "a", recipient: "B", min: 5, max: null, unit: "Stunden/Woche" },
      { side: "b", recipient: "A", min: 30, max: null, unit: "Stunden/Woche" },
    ]
  );
  // A erwartet 5 von B, B bietet 40 - keine Lücke. B erwartet 30 von A, A
  // bietet 10 - Lücke von 20. Beide zu einer Zahl zu verrechnen hieße, zwei
  // Beziehungen zu einer zu verschmelzen.
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].from, "b");
  assert.equal(gaps[0].shortfall, 20);
});

test("verschiedene Einheiten werden gar nicht erst verrechnet", () => {
  const gaps = expectationGaps(
    [{ side: "a", min: 2, max: 3, unit: "Tage/Woche" }],
    [{ side: "b", recipient: "A", min: 30, max: null, unit: "Stunden/Woche" }]
  );
  assert.deepEqual(gaps, [], "Stunden gegen Tage waere eine erfundene Zahl");
});

// ---------------------------------------------------------------------------
// Teil F5: „kritisch" heißt konkret klärungsbedürftig
// ---------------------------------------------------------------------------

test("hohe Selbstständigkeit plus hohe Offenheit ist KEIN kritischer Fall", () => {
  // Wörtlich aus F5: „Hohe U plus hohe K ist keine kritische Kombination."
  // Wer viel selbst entscheiden und viel teilen möchte, hat keinen
  // Widerspruch, sondern eine Arbeitsweise. Dieser Test existiert, damit
  // niemand aus Plausibilität eine Regel dafür baut.
  const a = buildReadout([scale("U01", 5), scale("K01", 5)]);
  const b = buildReadout([scale("U01", 5), scale("K01", 5)]);
  const found = clarificationsNeeded(compareBlocks(a, b), []);
  assert.deepEqual(found, []);
});

test("eine ungedeckte Erwartung und eine offene Entscheidungsregel werden benannt", () => {
  const g01 = getContextBlocks().find((block) => block.blockId === "G01")!;
  const a = buildReadout([row({ block_id: "G01", answer_format: "single_choice", value: { optionId: g01.options[0].optionId } })]);
  const b = buildReadout([row({ block_id: "G01", answer_format: "single_choice", value: { optionId: g01.options[2].optionId } })]);

  const gaps = expectationGaps(
    [{ side: "a", min: 12, max: 16, unit: "Stunden/Woche" }],
    [{ side: "b", recipient: "A", min: 25, max: 30, unit: "Stunden/Woche" }]
  );
  const found = clarificationsNeeded(compareBlocks(a, b), gaps);

  assert.deepEqual(found.map((entry) => entry.kind).sort(), ["decision_rule_unclear", "expectation_not_covered"]);
  // Eine Beschreibung der Angaben, kein Befund über Menschen.
  const text = found.map((entry) => entry.detail).join(" ");
  assert.ok(!/unzuverlässig|mangel|versag|charakter|riskant/i.test(text));
  assert.match(text, /Die Angaben ueberlappen nicht/);
});

test("was sich nicht ableiten lässt, steht als Text da statt geraten zu werden", () => {
  // Zwei der vier Fälle aus F5 brauchen einen Menschen. Sie zu erraten wäre
  // schlimmer als sie wegzulassen: Eine falsche Grenzwarnung zerstört mehr
  // Vertrauen, als eine fehlende kostet.
  assert.equal(CLARIFICATIONS_NOT_DERIVABLE.length, 2);
  for (const entry of CLARIFICATIONS_NOT_DERIVABLE) {
    assert.ok(entry.why.length > 100, entry.case);
  }
});

// ---------------------------------------------------------------------------
// Teil F6: die Gesprächsagenda
// ---------------------------------------------------------------------------

test("ein selbst markiertes Thema steht oben, auch bei gleicher Antwort", () => {
  // DER KERN DER REGEL. Wer sagt „darüber möchte ich reden", weiß besser als
  // jede Rechnung, was bei ihm dran ist.
  const a = buildReadout([scale("A01", 3), scale("A02", 1)]);
  const b = buildReadout([scale("A01", 3), scale("A02", 5)]);
  const agenda = buildAgenda(compareBlocks(a, b, ["A01"], []), []);

  assert.equal(agenda[0].blockId, "A01");
  assert.equal(agenda[0].priority, 1);
  assert.deepEqual(agenda[0].markedBy, ["a"]);
  // Obwohl A02 den größeren Abstand hat.
  assert.equal(agenda[1].blockId, "A02");
  assert.equal(agenda[1].priority, 4);
});

test("die Agenda sortiert nicht nach Abstand", () => {
  // Teil F6, wörtlich: „Nicht still die größten numerischen Differenzen als
  // die wichtigsten Konflikte wählen."
  const a = buildReadout([scale("A01", 1), scale("A02", 3), scale("I01", 1)]);
  const b = buildReadout([scale("A01", 2), scale("A02", 3), scale("I01", 5)]);
  const agenda = buildAgenda(compareBlocks(a, b), []);

  // A01 (Abstand 1) und I01 (Abstand 4) sind beide Stufe 4, und A01 steht
  // vorn - weil es im Fragebogen vorn steht, nicht weil es harmloser wäre.
  assert.deepEqual(agenda.map((entry) => entry.blockId), ["A01", "I01"]);
  assert.ok(agenda.every((entry) => entry.priority === 4));
});

test("eine ungedeckte Erwartung steht über einem bloßen Unterschied", () => {
  const a = buildReadout([scale("A01", 1)]);
  const b = buildReadout([scale("A01", 5)]);
  const gaps = expectationGaps(
    [{ side: "a", min: 12, max: 16, unit: "Stunden/Woche" }],
    [{ side: "b", recipient: "A", min: 25, max: null, unit: "Stunden/Woche" }]
  );
  const comparisons = compareBlocks(a, b);
  const agenda = buildAgenda(comparisons, clarificationsNeeded(comparisons, gaps));

  assert.equal(agenda[0].priority, 2);
  assert.equal(agenda[0].reason, "expectation_or_limit");
  assert.match(agenda[0].detail ?? "", /mindestens 25 Stunden\/Woche/);
});

test("was ein Team danach markieren kann, heißt nicht Kompatibilität", () => {
  // Teil F6: „verstanden / vereinbart / weiterer Gesprächsbedarf / derzeit
  // nicht relevant" - und: „‚Vereinbart‘ heißt dokumentierter Konsens, nicht
  // gemessene psychologische Kompatibilität."
  assert.deepEqual([...AGENDA_OUTCOMES], ["understood", "agreed", "needs_more_talk", "not_relevant_now"]);
});
