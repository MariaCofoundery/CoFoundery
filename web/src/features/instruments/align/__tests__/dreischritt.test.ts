import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getItemsV22, getItemV22, SCOPES } from "@/features/instruments/align/registries";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import { readableItems } from "@/features/instruments/align/questionnaireData";

/**
 * Das Dreischritt-Muster der Zielkonflikte — UX-Review Teil 2, Abschnitt 11.
 *
 * Kurzes Szenario, zwei GETRENNTE Wichtigkeitsbewertungen, danach die
 * Wegwahl. Die Prüfung liest das Review, statt es abzuschreiben.
 */
const review = readFileSync(
  join("..", "docs", "ALIGN_UX_QA_Teil2_Was_du_aufbauen_willst_v0.1.md"), "utf8");

/** Alle Fragen dieses Formats — in beiden Bögen, falls je einer dazukommt. */
const wertefaelle = SCOPES.flatMap((scope) =>
  getItemsV22(scope).filter((item) => item.answerFormat === "value_case"));

test("es gibt sechs Zielkonflikte, und jeder hat drei Schritte", () => {
  assert.equal(wertefaelle.length, 6);

  for (const item of wertefaelle) {
    // Schritt 1: das Szenario. Schritt 2: zwei Aspekte mit je fünf Stufen.
    // Schritt 3: zwei Wege.
    assert.ok(item.prompt, item.itemId);
    assert.equal(item.concerns?.length, 2, item.itemId);
    assert.equal(item.paths?.length, 2, item.itemId);
    assert.equal(item.ratingOptions?.length, 5, item.itemId);
  }
});

test("die Texte des Musters stehen so im Review", () => {
  for (const item of wertefaelle) {
    const muster = item.valueCase!;
    assert.ok(muster, item.itemId);
    assert.ok(review.includes(muster.importancePrompt), muster.importancePrompt);
    assert.ok(review.includes(muster.otherLabel), muster.otherLabel);
    assert.ok(review.includes(muster.unknownLabel), muster.unknownLabel);

    // Die Wegfrage steht im Review auf zwei Zeilen - Vorsatz und Frage.
    for (const teil of muster.pathPrompt.split(": ")) {
      assert.ok(review.includes(teil), teil);
    }
  }

  // Und alle sechs tragen denselben Text: Er steht einmal im Review.
  assert.equal(new Set(wertefaelle.map((item) => item.valueCase!.pathPrompt)).size, 1);
});

test("die zwei Aspekte stehen so im Review", () => {
  for (const item of wertefaelle) {
    for (const aspekt of item.concerns!) {
      assert.ok(review.includes(aspekt), `${item.itemId}: ${aspekt}`);
    }
  }
});

test("das Szenario stellt keine Frage", () => {
  // Die Fragen stellt das Muster - erst nach der Wichtigkeit, dann nach dem
  // Weg. Die Master-Arbeitsfassung endete zusätzlich mit „Wie würdest du in
  // dieser Situation eher vorgehen?": dieselbe Frage in anderen Worten, zwei
  // Zeilen darüber.
  for (const item of wertefaelle) {
    assert.ok(!item.prompt.trim().endsWith("?"), `${item.itemId}: ${item.prompt}`);
    assert.ok(item.prompt.length > 40, `${item.itemId}: vom Szenario ist nichts übrig`);
  }

  // W01 hat im Review ein eigenes, kürzeres Szenario.
  assert.ok(review.includes(getItemV22("W01")!.prompt));
});

test("die Wegwahl nennt den Weg und nicht das Anliegen", () => {
  // GEMELDET NICHT, SONDERN GEFUNDEN. Die Wegwahl trug bis zum 30.09.2026 die
  // Anliegen als Beschriftung: „Welchen Weg würdest du zuerst wählen?" und
  // darunter „früh wissen, wie sich die finanzielle Situation entwickeln
  // könnte". Das ist der Grund für einen Weg und keiner.
  const w01 = readableItems("venture_alignment").find((item) => item.itemId === "W01")!;
  assert.deepEqual(w01.paths, getItemV22("W01")!.paths);

  const gelesen = readAnswer(
    { blockId: "W01", value: { importanceA: 5, importanceB: 2, path: "A" } },
    [],
    w01,
  )!;
  assert.equal(gelesen.value?.kind, "case");
  assert.equal(gelesen.value!.path, getItemV22("W01")!.paths![0]);
  assert.notEqual(gelesen.value!.path, getItemV22("W01")!.concerns![0]);
});

test("die zwei Wichtigkeiten werden nicht verrechnet", () => {
  // Das Review wörtlich: „Die zwei Wichtigkeitsratings nicht automatisch zu
  // einer ,richtigen' Entscheidung verrechnen." Wer beide hoch bewertet, hat
  // nicht widersprochen - er hat den Zielkonflikt beschrieben, um den es geht.
  const w01 = readableItems("venture_alignment").find((item) => item.itemId === "W01")!;
  const gelesen = readAnswer(
    { blockId: "W01", value: { importanceA: 5, importanceB: 5, path: "B" } },
    [],
    w01,
  )!;

  const fall = gelesen.value as { kind: "case"; concerns: unknown[]; path: string };
  // Beide Bewertungen stehen einzeln da - und kein dritter Wert daneben.
  assert.deepEqual(Object.keys(fall).sort(), ["concerns", "kind", "path"]);
  assert.equal(fall.concerns.length, 2);
});
