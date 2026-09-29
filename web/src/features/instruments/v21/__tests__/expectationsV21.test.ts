import test from "node:test";
import assert from "node:assert/strict";

import { expectationGapsV21 } from "@/features/instruments/v21/expectationsV21";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

const gelesen = (answer: AlignmentAnswerV21) => readAnswer(answer)!;

const zusage = (stunden: number) =>
  gelesen({ blockId: "R01", value: { number: stunden, unit: "Stunden pro Woche" } });

const erwartung = (rows: { person: string; number: number | null; unit?: string }[]) =>
  gelesen({
    blockId: "R02",
    value: {
      perPerson: rows.map((row) => ({
        person: row.person,
        number: row.number,
        unit: row.unit ?? "Stunden pro Woche",
      })),
    },
  });

const leer = { offer: null, expectations: null };

test("die Erwartung trifft das Angebot der ANDEREN Seite", () => {
  // Maria sagt 12 zu. Alex erwartet von ihr 25. Das ist der Befund.
  const result = expectationGapsV21({
    a: { offer: zusage(12), expectations: null },
    b: { offer: zusage(40), expectations: erwartung([{ person: "Maria", number: 25 }]) },
  });

  assert.equal(result.gaps.length, 1);
  assert.deepEqual(result.gaps[0], {
    from: "b",
    recipientLabel: "Maria",
    unit: "Stunden pro Woche",
    expected: 25,
    offered: 12,
    shortfall: 13,
  });
});

test("Erwartungen sind gerichtet - A→B ist nicht B→A", () => {
  // Beides zu einer Zahl zu machen hiesse, zwei Beziehungen zu einer zu
  // verschmelzen: Wer zu viel erwartet, waere von dem entlastet, der zu wenig
  // erwartet.
  const result = expectationGapsV21({
    a: { offer: zusage(30), expectations: erwartung([{ person: "Alex", number: 5 }]) },
    b: { offer: zusage(10), expectations: erwartung([{ person: "Maria", number: 40 }]) },
  });

  assert.equal(result.gaps.length, 1, "nur eine Richtung hat eine Differenz");
  assert.equal(result.gaps[0].from, "b");
  assert.equal(result.gaps[0].shortfall, 10);
});

test("wer weniger erwartet als zugesagt wird, hat hier nichts zu besprechen", () => {
  const result = expectationGapsV21({
    a: { offer: zusage(30), expectations: null },
    b: { offer: zusage(30), expectations: erwartung([{ person: "Maria", number: 10 }]) },
  });
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.unmatched, []);
});

test("bei mehreren Personen wird NICHT geraten", () => {
  // R02 erfasst je Person eine Erwartung, und der Name wird frei getippt. Es
  // gibt keine Kennung, die auf ein Konto zeigt. Eine falsch zugeordnete
  // Erwartung stellt jemandem eine Forderung vor, die einem Dritten galt.
  const result = expectationGapsV21({
    a: { offer: zusage(10), expectations: null },
    b: {
      offer: zusage(40),
      expectations: erwartung([
        { person: "Maria", number: 25 },
        { person: "Jonas", number: 30 },
      ]),
    },
  });

  assert.deepEqual(result.gaps, [], "es wurde trotzdem zugeordnet");
  assert.equal(result.unmatched.length, 2);
  for (const entry of result.unmatched) {
    assert.equal(entry.why, "several_entries");
  }
});

test("„keine feste Stundenerwartung“ erzeugt keinen Abstand", () => {
  // Sie ist eine Erwartung und kein Fehlen - aber eben keine Zahl.
  const result = expectationGapsV21({
    a: { offer: zusage(10), expectations: null },
    b: { offer: zusage(40), expectations: erwartung([{ person: "Maria", number: null }]) },
  });
  assert.deepEqual(result.gaps, []);
  assert.deepEqual(result.unmatched, []);
});

test("verschiedene Einheiten werden nicht verrechnet", () => {
  // Stunden gegen Monate zu halten waere eine erfundene Zahl.
  const result = expectationGapsV21({
    a: { offer: zusage(10), expectations: null },
    b: {
      offer: zusage(40),
      expectations: erwartung([{ person: "Maria", number: 3, unit: "Tage pro Woche" }]),
    },
  });
  assert.deepEqual(result.gaps, []);
  assert.equal(result.unmatched[0]?.why, "different_unit");
});

test("ohne Zusage der anderen Seite bleibt die Erwartung offen", () => {
  // Sie verschwindet nicht - sie wird gezeigt, ohne dass ein Abstand
  // behauptet wird.
  const result = expectationGapsV21({
    a: leer,
    b: { offer: zusage(40), expectations: erwartung([{ person: "Maria", number: 25 }]) },
  });
  assert.deepEqual(result.gaps, []);
  assert.equal(result.unmatched[0]?.why, "no_offer");
  assert.equal(result.unmatched[0]?.expected, 25);
});

test("ohne Angaben passiert nichts", () => {
  assert.deepEqual(expectationGapsV21({ a: leer, b: leer }), { gaps: [], unmatched: [] });
});

test("nirgends entsteht ein Wort über die Person", () => {
  // "Geringes Commitment" ist der Satz, der hier nicht stehen darf. Was hier
  // steht, ist der heutige Abstand zwischen zwei Saetzen.
  const result = expectationGapsV21({
    a: { offer: zusage(5), expectations: null },
    b: { offer: zusage(40), expectations: erwartung([{ person: "Maria", number: 35 }]) },
  });
  const asText = JSON.stringify(result);
  for (const wort of ["commitment", "gering", "wenig", "risiko", "unzuverl", "%"]) {
    assert.ok(!asText.toLowerCase().includes(wort), `„${wort}“ steht im Ergebnis`);
  }
});
