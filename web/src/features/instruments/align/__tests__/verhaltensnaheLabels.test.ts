import test from "node:test";
import assert from "node:assert/strict";

import { getItemV22, getItemsV22 } from "@/features/instruments/align/registries";

/**
 * UX-Review Teil 2, Abschnitt 2: Wo ein Konstrukt über abstrakte Begriffe wie
 * „Selbstständigkeit" erfasst wird, sollen die Antworten zeigen, wie das im
 * Alltag aussieht.
 */

const SPIELRAUM = ["U01", "U03", "U04", "U05"];

test("die Spielraum-Fragen sagen, wie es im Alltag aussieht", () => {
  for (const itemId of SPIELRAUM) {
    const item = getItemV22(itemId)!;
    assert.equal(item.options.length, 5, itemId);

    // Keine Antwort heisst mehr "sehr wenig selbststaendig" - das musste
    // jeder erst uebersetzen.
    for (const option of item.options) {
      assert.ok(
        !/^(sehr wenig|eher wenig|teils\/teils|eher|sehr) (selbstständig|frei)$/.test(option.label),
        `${itemId}: „${option.label}" ist wieder abstrakt`,
      );
      // Und sie beschreiben ein Vorgehen, nicht einen Grad: jede Antwort ist
      // ein halber Satz, kein Etikett.
      assert.ok(option.label.length > 20, `${itemId}: „${option.label}" ist zu knapp`);
    }
  }
});

test("die Reihenfolge bleibt von wenig zu viel eigenem Spielraum", () => {
  // Gespeicherte Antworten zeigen auf die STELLE. Wer die Reihenfolge dreht,
  // laesst jede bisherige Antwort das Gegenteil bedeuten.
  //
  // Geprueft an den Randpunkten: Die erste Antwort stimmt ab, die letzte
  // entscheidet selbst.
  for (const itemId of SPIELRAUM) {
    const options = getItemV22(itemId)!.options;
    assert.match(options[0].label, /gemeinsam|abstimmen/i, `${itemId}: erste Antwort`);
    assert.match(options[4].label, /selbst (entscheiden|anpassen)/i, `${itemId}: letzte Antwort`);
  }
});

test("die Kennungen der Antworten sind unverändert", () => {
  // Der Text darf sich aendern, die Stelle nicht - sonst zeigen gespeicherte
  // Antworten auf etwas anderes.
  for (const itemId of SPIELRAUM) {
    const options = getItemV22(itemId)!.options;
    assert.deepEqual(
      options.map((option) => option.optionId),
      [1, 2, 3, 4, 5].map((n) => `${itemId}_o${n}`),
    );
  }
});

test("W01 bis W06 sind in dieser Runde nicht angefasst", () => {
  // Sie werden auf ein Dreischritt-Muster umgebaut. Eine halbe Uebernahme
  // waere schlimmer als keine.
  for (const item of getItemsV22("venture_alignment")) {
    if (!item.itemId.startsWith("W")) continue;
    assert.equal(item.answerFormat, "value_case", item.itemId);
    assert.ok(item.concerns && item.concerns.length === 2, item.itemId);
  }
});
