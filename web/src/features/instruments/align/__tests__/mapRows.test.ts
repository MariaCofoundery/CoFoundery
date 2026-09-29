import test from "node:test";
import assert from "node:assert/strict";

import {
  workMapGroups,
  differenceGroups,
} from "@/features/instruments/align/mapRows";
import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";
import type { ItemComparison } from "@/features/instruments/v21/comparisonV21";

const ordinal = (itemId: string, position: number): ReadoutEntry => ({
  itemId,
  section: "A",
  prompt: `Frage ${itemId}`,
  value: { kind: "ordinal", label: "manchmal", position, of: 5 },
  missing: null,
});

const wahl = (itemId: string): ReadoutEntry => ({
  itemId,
  section: "A",
  prompt: `Frage ${itemId}`,
  value: { kind: "choice", label: "sofort", text: null },
  missing: null,
});

const offen = (itemId: string): ReadoutEntry => ({
  itemId,
  section: "A",
  prompt: `Frage ${itemId}`,
  value: null,
  missing: { code: "cannot_assess", label: "kann ich noch nicht einschätzen" },
});

test("nur geordnete Antworten bekommen eine Stelle", () => {
  const gruppen = workMapGroups([
    { section: "A", entries: [ordinal("A01", 3), wahl("T01"), ordinal("A02", 5)] },
  ]);

  assert.deepEqual(
    gruppen[0].rows.map((row) => row.itemId),
    ["A01", "A02"],
    "eine Handlungswahl hat keine Reihenfolge und darf keine Stelle bekommen",
  );
});

test("ein Auslassungsgrund wird nicht zur Mitte gezeichnet", () => {
  // Genau dieser Fehler ist der Grund, warum es die Auslassungsgruende gibt:
  // In v1 wurde aus einer Auslassung stillschweigend die Mitte.
  const gruppen = workMapGroups([{ section: "A", entries: [offen("A01"), ordinal("A02", 2)] }]);

  assert.deepEqual(gruppen[0].rows.map((row) => row.itemId), ["A02"]);
});

test("ein Abschnitt ohne geordnete Antwort verschwindet ganz", () => {
  // Sonst stuende eine Ueberschrift ueber einem leeren Rahmen, und das saehe
  // aus, als fehlte etwas.
  assert.deepEqual(workMapGroups([{ section: "T/D", entries: [wahl("T01")] }]), []);
});

const paar = (
  itemId: string,
  a: ReadoutEntry | null,
  b: ReadoutEntry | null,
): ItemComparison => ({
  itemId,
  section: "A",
  prompt: `Frage ${itemId}`,
  a,
  b,
  state: "different",
  why: null,
});

test("eine Hantel braucht zwei Gewichte", () => {
  const gruppen = differenceGroups([
    {
      section: "A",
      items: [
        paar("A01", ordinal("A01", 2), ordinal("A01", 4)),
        paar("A02", ordinal("A02", 2), null),
        paar("A03", null, ordinal("A03", 4)),
        paar("A04", ordinal("A04", 1), offen("A04")),
      ],
    },
  ]);

  assert.deepEqual(gruppen[0].rows.map((row) => row.itemId), ["A01"]);
});

test("zwei verschieden lange Skalen kommen nicht auf eine Achse", () => {
  // Sie vergleichbar zu machen, indem man die kuerzere streckt, waere eine
  // Behauptung ueber Abstaende, die die Antworten nicht hergeben.
  const kurz: ReadoutEntry = {
    itemId: "A01",
    section: "A",
    prompt: "Frage A01",
    value: { kind: "ordinal", label: "mittel", position: 2, of: 3 },
    missing: null,
  };

  assert.deepEqual(
    differenceGroups([{ section: "A", items: [paar("A01", kurz, ordinal("A01", 4))] }]),
    [],
  );
});

test("die Reihenfolge der Quelle bleibt erhalten", () => {
  // Sonst haengt das Bild davon ab, in welcher Reihenfolge jemand geantwortet
  // hat - und zwei Berichte derselben Person saehen nach einem Nachtrag
  // anders aus.
  const gruppen = workMapGroups([
    { section: "A", entries: [ordinal("A01", 1), ordinal("A02", 5)] },
    { section: "X", entries: [ordinal("X01", 3)] },
  ]);

  assert.deepEqual(gruppen.map((group) => group.section), ["A", "X"]);
  assert.deepEqual(gruppen[0].rows.map((row) => row.itemId), ["A01", "A02"]);
});
