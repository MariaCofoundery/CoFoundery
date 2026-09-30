import test from "node:test";
import assert from "node:assert/strict";

import { getItemsV22, getItemV22, SCOPES } from "@/features/instruments/align/registries";

/**
 * UX-Regel: Feste Auswahlfragen erzeugen keine zusätzlichen Textfelder,
 * außer es ist für ein konkretes Item ausdrücklich so gewollt.
 */

test("D01 öffnet nirgends ein Textfeld", () => {
  // GEMELDET AM 30.09.2026. Die Antworten auf D01 sind FORMULIERUNGEN - „Ich
  // sehe das anders, weil …" und „Ich würde gern noch eine andere
  // Möglichkeit anschauen …". Beide enthalten „ander", und das Muster im
  // Generator machte daraus ein Eingabefeld, in das niemand etwas schreiben
  // wollte.
  const d01 = getItemV22("D01")!;
  for (const option of d01.options) {
    assert.equal(option.requiresText, false, `${option.optionId}: „${option.label}"`);
  }
});

test("ein Textfeld gibt es nur, wo die Antwort danach verlangt", () => {
  // Die Liste ist kurz und absichtlich namentlich: „anderes Ziel", „weitere",
  // „andere Regel" - Antworten, die ohne den Text nichts aussagen. Alles
  // andere bekommt keins.
  const erwartet = new Set([
    "K04", "S01", "S06", "R06", "R09", "R12", "G04", "G05", "B05", "L03",
  ]);

  const gefunden = new Set<string>();
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      if (item.options.some((option) => option.requiresText)) gefunden.add(item.itemId);
    }
  }

  assert.deepEqual([...gefunden].sort(), [...erwartet].sort());
});

test("keine Frage mit fester Skala hat ein Textfeld", () => {
  // Bei fuenf geordneten Stufen ist ein Eingabefeld immer ein Versehen: Die
  // Stufen sind vollstaendig, sonst waeren sie keine Skala.
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      if (item.answerFormat !== "ordinal_choice") continue;
      for (const option of item.options) {
        assert.equal(option.requiresText, false, `${item.itemId}/${option.optionId}`);
      }
    }
  }
});
