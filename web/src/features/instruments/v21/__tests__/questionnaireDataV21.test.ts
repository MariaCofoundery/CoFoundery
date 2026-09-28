import test from "node:test";
import assert from "node:assert/strict";

import { buildSectionsV21 } from "@/features/instruments/v21/questionnaireDataV21";
import { getItemsV21, getItemV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

const sections = buildSectionsV21();
const items = sections.flatMap((section) => section.items);

test("der Fragebogen zeigt alle 36 Fragen in 20 Abschnitten", () => {
  assert.equal(sections.length, REGISTRY_V21.sections.length);
  assert.equal(items.length, getItemsV21().length);
  assert.deepEqual(
    sections.map((section) => section.section),
    REGISTRY_V21.sections,
    "die Reihenfolge der Abschnitte stammt aus der Quelle",
  );
});

test("kein Abschnitt ist leer", () => {
  for (const section of sections) {
    assert.ok(section.items.length > 0, section.section);
  }
});

test("die Begründungen gehen NICHT an den Browser", () => {
  // „Kein Beleg für Analysefähigkeit“ ist eine Notiz an uns. Auf dem
  // Bildschirm läse sie sich wie ein Kommentar zur Person, die gerade
  // antwortet. Dasselbe gilt für den Auswertungshinweis und die Herkunft.
  const asText = JSON.stringify(sections);
  for (const item of getItemsV21()) {
    assert.ok(!asText.includes(item.note), `${item.itemId}: die Begründung steht im Bundle`);
  }
  assert.ok(!asText.includes("sourcePrompt"));
  assert.ok(!/"scoring"/.test(asText));
});

test("jede Frage bringt ihre Auslassungsgründe mit", () => {
  // Sie kommen als Eigenschaft herein, nicht als Import - sonst läge die
  // vollständige Registratur im Bundle jedes Browsers.
  for (const item of items) {
    assert.ok(item.offeredMissing.length > 0, item.itemId);
    for (const entry of item.offeredMissing) {
      assert.equal(entry.label, getItemV21(item.itemId)!.missing
        .find((m) => m.code === entry.code)!.label);
    }
  }
});

test("jede Frage bringt mit, was ihr Format braucht", () => {
  // Der Fall, den das verhindert: ein Wertefall ohne seine beiden Anliegen
  // erscheint als leerer Kasten, und niemand sieht, wonach gefragt wird.
  for (const item of items) {
    switch (item.answerFormat) {
      case "ordinal_choice":
      case "single_choice":
      case "multi_choice":
      case "multi_choice_priority":
        assert.ok(item.options.length >= 3, `${item.itemId}: zu wenige Optionen`);
        break;
      case "value_case":
        assert.equal(item.concerns?.length, 2, `${item.itemId}: Anliegen`);
        assert.equal(item.ratingOptions?.length, 5, `${item.itemId}: Stufen`);
        break;
      case "time_windows":
        assert.ok(item.fields?.includes("Zeitzone"), `${item.itemId}: Zeitzone fehlt`);
        break;
      case "free_text_per_entry":
        assert.notEqual(item.basisItemId, null, `${item.itemId}: keine Voraussetzung`);
        break;
    }
  }
});

test("die Folgefragen kommen vollständig oder gar nicht", () => {
  for (const item of items) {
    if (!item.followup) continue;
    assert.ok(item.followup.question.trim().length > 5, item.itemId);
    assert.ok(
      item.followup.options.length > 0 || item.followup.other,
      `${item.itemId}: eine Folgefrage ohne Antwortmöglichkeit`,
    );
  }
});

test("die ausschließenden Optionen kommen als solche im Browser an", () => {
  // Ohne diese Markierung könnte die Oberfläche den Widerspruch nicht
  // auflösen und würde ihn stattdessen als Fehlermeldung zurückwerfen.
  const exclusive = items
    .filter((item) => item.options.some((option) => option.exclusive))
    .map((item) => item.itemId);
  assert.deepEqual(exclusive.sort(), ["B05", "G02b"]);
});

test("jede Option, die einen Text verlangt, sagt das auch", () => {
  const withText = items.flatMap((item) =>
    item.options.filter((option) => option.requiresText).map((option) => option.optionId));
  assert.equal(withText.length, 17, "die Zahl stammt aus der Quelle");
});
