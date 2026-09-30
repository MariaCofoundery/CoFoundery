import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getItemV22, getItemsV22, SCOPES } from "@/features/instruments/align/registries";

test("jede Zahlenfrage sagt, worin gezählt wird", () => {
  // GEMELDET AM 30.09.2026: Bei B04 stand „Stunden pro Woche" neben dem
  // Zahlenfeld - bei einer Frage nach einer finanziellen Reserve. Die Einheit
  // war im Eingabefeld fest verdrahtet, weil es sie zuerst nur fuer eine
  // Frage gab.
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      if (item.answerFormat !== "number_range") continue;
      assert.ok(item.unit, `${item.itemId} sagt nicht, worin gezaehlt wird`);
    }
  }

  assert.equal(getItemV22("R01")!.unit, "Stunden pro Woche");
  assert.equal(getItemV22("B04")!.unit, "Monate laufender Ausgaben");
});

test("das Eingabefeld nimmt die Einheit vom Item", () => {
  const feld = readFileSync(
    join("src", "features", "instruments", "v21", "AnswerFieldV21.tsx"), "utf8");
  const block = feld.slice(feld.indexOf("function NumberRange()"));
  assert.match(block, /const unit = item\.unit/);
  assert.ok(
    !/const unit = "Stunden pro Woche"/.test(block),
    "die Einheit steht wieder fest im Feld",
  );

  // Und der freiwillige Zusatz steht nur, wo er hingehoert.
  assert.match(block, /item\.conditionHint &&/);
});

test("eine Frage mit Anschlussfragen sagt, dass welche folgen", () => {
  // „In der aktuellen gerenderten Fassung endet der Bereich nach L01." Das
  // stimmt und ist so gewollt - L02 fragt zu jeder einzelnen Grenze. Nur
  // weiss das niemand, der davorsitzt.
  const l02 = getItemV22("L02")!;
  const l03 = getItemV22("L03")!;
  assert.equal(l02.showAfter, "L01");
  assert.equal(l03.showAfter, "L01");

  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");
  assert.match(fragebogen, /wartendeAnschlussfragen/);
  assert.match(fragebogen, /Ohne Eintrag gibt es dazu nichts zu fragen/);
});
