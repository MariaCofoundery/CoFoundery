import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getItemsV22, SCOPES } from "@/features/instruments/align/registries";
import { getItemsV21 } from "@/features/instruments/v21/registryV21";

/**
 * Sprachreview v0.1, Abschnitt 3.2: Ein Auslassungsgrund ist keine Stufe.
 *
 * Geprüft wird beides — die Daten und die Darstellung. Nur eines davon reichte
 * nicht: Eine saubere Registratur nützt nichts, wenn die Oberfläche beides in
 * eine Reihe setzt, und eine saubere Oberfläche nützt nichts, wenn derselbe
 * Satz schon als Antwortmöglichkeit dasteht.
 */

const alleItems = () => [
  ...SCOPES.flatMap((scope) => getItemsV22(scope)),
  ...getItemsV21(),
];

test("kein Auslassungsgrund steht zugleich als Antwortmöglichkeit da", () => {
  for (const item of alleItems()) {
    const gruende = new Set(item.missing.map((entry) => entry.label));
    for (const option of item.options) {
      assert.ok(
        !gruende.has(option.label),
        `${item.itemId}: „${option.label}“ ist Antwort UND Auslassungsgrund`,
      );
    }
  }
});

test("die Gegenprobe: es gibt überhaupt Gründe zu verwechseln", () => {
  // Ohne sie bestuende die Pruefung oben auch, wenn gar keine
  // Auslassungsgruende existierten.
  const mitGrund = alleItems().filter((item) => item.missing.length > 0);
  assert.ok(mitGrund.length > 40, `zu wenige gefunden: ${mitGrund.length}`);
});

test("die Oberfläche setzt sie nicht in dieselbe Reihe", () => {
  const feld = readFileSync(
    join("src", "features", "instruments", "v21", "AnswerFieldV21.tsx"), "utf8");

  // Die Gruende werden AUSSERHALB der Eingabe gezeichnet - renderInput()
  // kennt sie nicht.
  const eingabe = feld.slice(feld.indexOf("function renderInput()"));
  assert.ok(
    !eingabe.includes("offeredMissing"),
    "die Eingabe zeichnet die Auslassungsgruende mit",
  );

  // Und dazwischen liegt eine sichtbare Grenze.
  assert.match(feld, /border-t border-dashed/);
});
