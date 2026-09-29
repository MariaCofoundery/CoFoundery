import test from "node:test";
import assert from "node:assert/strict";

import { compareV21, agendaV21, type ItemComparison } from "@/features/instruments/v21/comparisonV21";
import { buildComparisonV21 } from "@/features/instruments/v21/comparisonDataV21";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import { getItemV21, getItemsV21 } from "@/features/instruments/v21/registryV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

const opt = (itemId: string, index: number) => getItemV21(itemId)!.options[index].optionId;

/** Aus Antworten die gelesene Form machen - so wie die Seite es täte. */
const side = (answers: AlignmentAnswerV21[]) =>
  Object.fromEntries(
    answers.map((answer) => [answer.blockId, readAnswer(answer)!]),
  );

const find = (
  result: ReturnType<typeof compareV21>,
  itemId: string,
): ItemComparison => result.flatMap((group) => group.items).find((item) => item.itemId === itemId)!;

test("dieselbe Stufe heißt gleich, eine andere heißt anders", () => {
  const gleich = compareV21(
    side([{ blockId: "A01", value: { optionId: opt("A01", 2) } }]),
    side([{ blockId: "A01", value: { optionId: opt("A01", 2) } }]),
  );
  assert.equal(find(gleich, "A01").state, "same");
  assert.equal(find(gleich, "A01").stepsApart, 0);

  const anders = compareV21(
    side([{ blockId: "A01", value: { optionId: opt("A01", 0) } }]),
    side([{ blockId: "A01", value: { optionId: opt("A01", 3) } }]),
  );
  assert.equal(find(anders, "A01").state, "different");
  assert.equal(find(anders, "A01").stepsApart, 3);
});

test("zwei Handlungswahlen bekommen KEINEN Abstand", () => {
  // Eine nominale Kategorie mit einem Abstand zu versehen wäre eine
  // Behauptung über Nähe, die es nicht gibt.
  const result = compareV21(
    side([{ blockId: "K01", value: { optionId: opt("K01", 0) } }]),
    side([{ blockId: "K01", value: { optionId: opt("K01", 4) } }]),
  );
  assert.equal(find(result, "K01").state, "different");
  assert.equal(find(result, "K01").stepsApart, null);
});

test("nirgends entsteht ein Gesamtwert oder eine Passungszahl", () => {
  // Ein globaler Abstandswert könnte eine ausdrückliche Haftungsgrenze durch
  // mehrere harmlose Gemeinsamkeiten verdecken.
  const a: AlignmentAnswerV21[] = [];
  const b: AlignmentAnswerV21[] = [];
  for (const item of getItemsV21()) {
    if (!item.answerFormat.includes("choice") || item.options.length < 2) continue;
    a.push({ blockId: item.itemId, ...pickValue(item.itemId, 0) } as AlignmentAnswerV21);
    b.push({ blockId: item.itemId, ...pickValue(item.itemId, 1) } as AlignmentAnswerV21);
  }
  const result = compareV21(side(a), side(b));
  const asText = JSON.stringify(result);
  assert.ok(!/"score"|"total"|"percent"|"match"|"overall"|"fit"/i.test(asText));

  // Und auch keine, die sich aus stepsApart summieren ließe, ohne es zu sagen:
  // Die Summe existiert nirgends als Feld.
  assert.ok(!/"sum"|"distance"|"gap"/i.test(asText));
});

function pickValue(itemId: string, index: number) {
  const item = getItemV21(itemId)!;
  const at = Math.min(index, item.options.length - 1);
  return item.answerFormat.startsWith("multi")
    ? { value: { optionIds: [item.options[at].optionId] } }
    : { value: { optionId: item.options[at].optionId } };
}

test("„nicht beantwortet“ und „möchte ich nicht angeben“ sind verschiedene Dinge", () => {
  // Wer die beiden zusammenwirft, macht aus einer Entscheidung ein Versäumnis.
  const nichtsGesagt = compareV21(
    side([{ blockId: "G01", value: { optionId: opt("G01", 0) } }]),
    {},
  );
  assert.equal(find(nichtsGesagt, "G01").state, "no_basis");
  assert.equal(find(nichtsGesagt, "G01").why, "unanswered_b");

  const bewusst = compareV21(
    side([{ blockId: "G01", value: { optionId: opt("G01", 0) } }]),
    side([{ blockId: "G01", missingCode: "withheld" }]),
  );
  assert.equal(find(bewusst, "G01").why, "withheld_b");
});

test("keine dieser Lagen heißt „unterschiedlich“", () => {
  // „Fehlt“ darf nicht aussehen wie „passt nicht“.
  for (const result of [
    compareV21({}, {}),
    compareV21(side([{ blockId: "G01", missingCode: "withheld" }]), {}),
    compareV21(
      side([{ blockId: "G01", missingCode: "withheld" }]),
      side([{ blockId: "G01", missingCode: "withheld" }]),
    ),
  ]) {
    assert.equal(find(result, "G01").state, "no_basis");
  }
});

test("teilweise gleich ist ein eigener Zustand", () => {
  // Drei geteilte Absicherungen unter „unterschiedlich“ fallen zu lassen wäre
  // eine Auskunft, die das Gegenteil von dem sagt, was da steht.
  const result = compareV21(
    side([{ blockId: "B05", value: { optionIds: [opt("B05", 0), opt("B05", 1)] } }]),
    side([{ blockId: "B05", value: { optionIds: [opt("B05", 1), opt("B05", 2)] } }]),
  );
  assert.equal(find(result, "B05").state, "partly_same");

  const garnicht = compareV21(
    side([{ blockId: "B05", value: { optionIds: [opt("B05", 0)] } }]),
    side([{ blockId: "B05", value: { optionIds: [opt("B05", 2)] } }]),
  );
  assert.equal(find(garnicht, "B05").state, "different");
});

test("derselbe Weg bei anderer Gewichtung ist nicht dasselbe", () => {
  // Zwei Menschen tun dasselbe aus verschiedenen Gründen - und beim nächsten
  // Fall tun sie es nicht mehr. Genau das ist ein Gespräch wert.
  const wertefall = getItemsV21().find((item) => item.answerFormat === "value_case")!.itemId;
  const result = compareV21(
    side([{ blockId: wertefall, value: { importanceA: 5, importanceB: 1, path: "A" } }]),
    side([{ blockId: wertefall, value: { importanceA: 3, importanceB: 3, path: "A" } }]),
  );
  assert.equal(find(result, wertefall).state, "partly_same");
});

test("Zahlen und Zusagen stehen nebeneinander, nicht verrechnet", () => {
  // 10 Stunden und 30 Stunden sind keine „20 Stunden Abstand“ - sie sind zwei
  // Zusagen, über die zu sprechen ist.
  const result = compareV21(
    side([{ blockId: "R01", value: { number: 10, unit: "Stunden pro Woche" } }]),
    side([{ blockId: "R01", value: { number: 30, unit: "Stunden pro Woche" } }]),
  );
  assert.equal(find(result, "R01").state, "side_by_side");
  assert.equal(find(result, "R01").stepsApart, null);
});

test("die Abschnitte stehen in der Reihenfolge der Quelle", () => {
  const result = compareV21(
    side([{ blockId: "A01", value: { optionId: opt("A01", 0) } }]),
    side([{ blockId: "A01", value: { optionId: opt("A01", 0) } }]),
  );
  assert.equal(result[0].section, getItemV21("A01")!.section);
  assert.equal(
    result.flatMap((group) => group.items).length,
    getItemsV21().length,
    "jede Frage taucht auf - auch die unbeantworteten, als no_basis",
  );
});

test("die Agenda nennt, was anders ist - ohne Rangfolge nach Schwere", () => {
  const result = compareV21(
    side([
      { blockId: "A01", value: { optionId: opt("A01", 0) } },
      { blockId: "A02", value: { optionId: opt("A02", 0) } },
    ]),
    side([
      { blockId: "A01", value: { optionId: opt("A01", 4) } },
      { blockId: "A02", value: { optionId: opt("A02", 0) } },
    ]),
  );
  const agenda = agendaV21(result);
  const a01 = agenda.find((entry) => entry.itemId === "A01")!;
  assert.equal(a01.kind, "preference");
  // Gleiches steht drauf - aber in der eigenen Gruppe. Ein Report, der nur
  // Unterschiede zeigt, liest sich wie eine Maengelliste.
  assert.equal(agenda.find((entry) => entry.itemId === "A02")?.kind, "shared");

  // Kein Feld, das eine Schwere behauptet.
  assert.ok(!/"severity"|"rank"|"priority"|"risk"/i.test(JSON.stringify(agenda)));
});

test("eine Markierung kommt auf die Agenda, auch wenn beide dasselbe geantwortet haben", () => {
  // Wer sagt „darüber möchte ich sprechen“, hat einen Grund, den kein
  // Vergleich kennt.
  const result = compareV21(
    side([{ blockId: "A02", value: { optionId: opt("A02", 0) } }]),
    side([{ blockId: "A02", value: { optionId: opt("A02", 0) } }]),
  );
  const agenda = agendaV21(result, ["A02"]);
  assert.equal(agenda.find((entry) => entry.itemId === "A02")?.kind, "marked");
});

test("was niemand beantwortet hat, steht nicht auf der Agenda", () => {
  // Sonst wäre die Agenda voll mit Fragen, über die es nichts zu sagen gibt -
  // und das Eigentliche ginge darin unter.
  const agenda = agendaV21(compareV21({}, {}));
  assert.deepEqual(agenda, []);
});

// ---------------------------------------------------------------------------
// Der Zusammenbau aus gespeicherten Zeilen
// ---------------------------------------------------------------------------

test("zwei verschiedene Fassungen werden nicht verglichen, sondern abgelehnt", () => {
  // A01 heißt in v2 und v2.1 nicht dasselbe. Die Alternative zum Abbrechen
  // wäre, so zu tun, als wäre es die eigene Fassung - die stille Umdeutung,
  // gegen die dieses ganze Instrument gebaut ist.
  assert.throws(
    () =>
      buildComparisonV21(
        { name: "A", instrumentId: "founder-alignment-v2-1", rows: [] },
        { name: "B", instrumentId: "founder-alignment-v2", rows: [] },
      ),
    /instrument_mismatch/,
  );
  assert.throws(
    () =>
      buildComparisonV21(
        { name: "A", instrumentId: "founder-compatibility-v1", rows: [] },
        { name: "B", instrumentId: "founder-alignment-v2-1", rows: [] },
      ),
    /instrument_mismatch/,
  );
});

test("eine zurückgehaltene Antwort wird gar nicht erst gelesen", () => {
  // Nicht ausgegraut, nicht als „fehlt“ - sie kommt nicht herein. Sie durch
  // den Vergleich laufen zu lassen und erst in der Anzeige zu verstecken wäre
  // ein Versehen weg vom Datenleck.
  const result = buildComparisonV21(
    {
      name: "A",
      instrumentId: "founder-alignment-v2-1",
      rows: [{ block_id: "A01", value: { optionId: opt("A01", 0) }, missing_code: null }],
      notSharedItemIds: ["A01"],
    },
    {
      name: "B",
      instrumentId: "founder-alignment-v2-1",
      rows: [{ block_id: "A01", value: { optionId: opt("A01", 4) }, missing_code: null }],
    },
  );
  const a01 = result.sections.flatMap((group) => group.items).find((item) => item.itemId === "A01")!;
  assert.equal(a01.a, null);
  assert.equal(a01.why, "unanswered_a");
  assert.ok(!JSON.stringify(result.sections).includes(opt("A01", 0)));
  assert.deepEqual(result.notShared, [{ itemId: "A01", side: "a" }]);
});

test("die Markierung EINER Person reicht für die Agenda", () => {
  // „Darüber möchte ich sprechen“ ist ein Wunsch an das Gespräch, nicht an
  // die andere Person.
  const result = buildComparisonV21(
    {
      name: "A",
      instrumentId: "founder-alignment-v2-1",
      rows: [{ block_id: "A02", value: { optionId: opt("A02", 0) }, missing_code: null,
               marked_for_discussion: true }],
    },
    {
      name: "B",
      instrumentId: "founder-alignment-v2-1",
      rows: [{ block_id: "A02", value: { optionId: opt("A02", 0) }, missing_code: null }],
    },
  );
  assert.equal(result.agenda.find((entry) => entry.itemId === "A02")?.kind, "marked");
});

// ---------------------------------------------------------------------------
// Die Ordnung der Agenda - nach Art, nicht nach Schwere
// ---------------------------------------------------------------------------

test("Zusagen und Regeln stehen vor Arbeitspräferenzen", () => {
  // Nicht weil sie schwerer waeren, sondern weil sie konkreter sind: Ueber
  // eine Zahl laesst sich am Dienstag reden, ueber "wie ihr mit Unsicherheit
  // umgeht" erst nach einem Gespraech.
  const result = compareV21(
    side([
      { blockId: "A01", value: { optionId: opt("A01", 0) } },
      { blockId: "G01", value: { optionId: opt("G01", 0) } },
    ]),
    side([
      { blockId: "A01", value: { optionId: opt("A01", 4) } },
      { blockId: "G01", value: { optionId: opt("G01", 1) } },
    ]),
  );
  const agenda = agendaV21(result);
  const arten = agenda.map((entry) => entry.kind);
  assert.deepEqual(arten, ["commitment", "preference"]);
  assert.equal(agenda[0].itemId, "G01");
});

test("Gemeinsamkeiten stehen aktiv drauf, nicht nur Unterschiede", () => {
  // Ein Report, der nur Unterschiede zeigt, liest sich wie eine Maengelliste.
  const result = compareV21(
    side([{ blockId: "A01", value: { optionId: opt("A01", 2) } }]),
    side([{ blockId: "A01", value: { optionId: opt("A01", 2) } }]),
  );
  const agenda = agendaV21(result);
  assert.equal(agenda.length, 1);
  assert.equal(agenda[0].kind, "shared");
  assert.equal(agenda[0].state, "same");
});

test("eine Markierung steht vor allen Gruppen", () => {
  const result = compareV21(
    side([
      { blockId: "A01", value: { optionId: opt("A01", 0) } },
      { blockId: "G01", value: { optionId: opt("G01", 0) } },
    ]),
    side([
      { blockId: "A01", value: { optionId: opt("A01", 4) } },
      { blockId: "G01", value: { optionId: opt("G01", 1) } },
    ]),
  );
  const agenda = agendaV21(result, ["A01"]);
  assert.equal(agenda[0].itemId, "A01");
  assert.equal(agenda[0].kind, "marked");
});

test("innerhalb einer Gruppe bleibt die Reihenfolge des Fragebogens", () => {
  // Kein Rang innerhalb der Gruppe: Es gibt keinen Schwellwert, ab dem ein
  // Unterschied "ernster" wird.
  const result = compareV21(
    side([
      { blockId: "X01", value: { optionId: opt("X01", 0) } },
      { blockId: "A01", value: { optionId: opt("A01", 0) } },
    ]),
    side([
      { blockId: "X01", value: { optionId: opt("X01", 4) } },
      { blockId: "A01", value: { optionId: opt("A01", 4) } },
    ]),
  );
  const agenda = agendaV21(result).filter((entry) => entry.kind === "preference");
  const quelle = getItemsV21().map((item) => item.itemId);
  const sortiert = [...agenda].sort(
    (a, b) => quelle.indexOf(a.itemId) - quelle.indexOf(b.itemId),
  );
  assert.deepEqual(agenda.map((e) => e.itemId), sortiert.map((e) => e.itemId));
});

test("die Gruppen tragen weiterhin keine Zahl und keine Schwere", () => {
  const result = compareV21(
    side([{ blockId: "G01", value: { optionId: opt("G01", 0) } }]),
    side([{ blockId: "G01", value: { optionId: opt("G01", 1) } }]),
  );
  const asText = JSON.stringify(agendaV21(result));
  assert.ok(!/"severity"|"rank"|"priority"|"risk"|"score"|"weight"/i.test(asText));
});
