import test from "node:test";
import assert from "node:assert/strict";

import {
  getItemsV22,
  getItemV22,
  SCOPES,
  VENTURE_ALIGNMENT,
} from "@/features/instruments/align/registries";

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
  //
  // NAMENTLICH BIS ZUR ANTWORT UND NICHT NUR BIS ZUR FRAGE. Das UX-Review
  // Teil 2, Abschnitt 16, verlangt die Prüfung „jeweils explizit" - eine
  // Frage, die eine Antwort mit Textfeld hat, könnte sonst eine zweite
  // dazubekommen, ohne dass es auffällt.
  const erwartet = new Map([
    ["K04", "andere Regel"],
    ["S01", "anderes Ziel"],
    ["S06", "andere Vorstellung"],
    ["R06", "andere Bedingung"],
    ["R09", "andere Vorgehensweise"],
    ["R12", "an einem bestimmten Datum – bitte angeben"],
    ["G04", "anderer Weg"],
    ["G05", "weitere"],
    ["B05", "andere Absicherung"],
    ["L03", "andere Regel"],
  ]);

  const gefunden = new Map<string, string[]>();
  for (const scope of SCOPES) {
    for (const item of getItemsV22(scope)) {
      const mitFeld = item.options.filter((option) => option.requiresText);
      if (mitFeld.length > 0) {
        gefunden.set(item.itemId, mitFeld.map((option) => option.label));
      }
    }
  }

  assert.deepEqual(
    [...gefunden.keys()].sort(),
    [...erwartet.keys()].sort(),
    "andere Fragen als erwartet öffnen ein Textfeld",
  );
  for (const [itemId, labels] of gefunden) {
    assert.deepEqual(labels, [erwartet.get(itemId)], itemId);
  }
});

test("die Entscheidung zu den Textfeldern ist aufgeschrieben", () => {
  // Abschnitt 16 des Reviews verlangt: „Wenn ja: Registry / Spec markieren,
  // optional vs. required festlegen." Markiert ist sie in der Registratur -
  // aufgeschrieben gehört, WARUM, denn die Master-Arbeitsfassung verlangt
  // bei keiner dieser zehn Antworten ausdrücklich einen Text.
  const abweichungen = VENTURE_ALIGNMENT.deviationsFromSource ?? [];
  const eintrag = abweichungen.find((entry) => entry.what.includes("Textfeld"));
  assert.ok(eintrag, "keine Abweichung zu den Textfeldern aufgeschrieben");
  assert.match(eintrag!.source, /Abschnitt 16/);
  assert.ok(eintrag!.reason.length > 200, "die Begründung ist zu knapp, um eine zu sein");
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
