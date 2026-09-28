import test from "node:test";
import assert from "node:assert/strict";

import { completenessV21, validateAnswerV21 } from "@/features/instruments/v21/answersV21";
import { getItemV21, getItemsV21 } from "@/features/instruments/v21/registryV21";

const opt = (itemId: string, index: number) => getItemV21(itemId)!.options[index].optionId;

/**
 * Diese Tests halten den Unterschied fest, an dem das Speichern hing:
 * „noch nicht fertig“ ist kein Fehler.
 */

test("angekreuzt, aber der verlangte Text fehlt noch: mittendrin, nicht falsch", () => {
  // Der gemeldete Fall: Man hakt „eine andere Absicherung - bitte beschreiben“
  // an und bekommt rot „Bitte beschreibe kurz, was du meinst“, bevor der
  // Cursor im Feld ist.
  const withText = getItemV21("B05")!.options.find((option) => option.requiresText)!;
  const value = { optionIds: [withText.optionId] };

  assert.equal(completenessV21("B05", value), "incomplete");
  // Die Prüfung sagt weiterhin, dass das so nicht gespeichert werden darf -
  // sie wird nur nicht mehr gefragt, solange jemand tippt.
  assert.equal(validateAnswerV21({ blockId: "B05", value }).ok, false);

  const fertig = { optionIds: [withText.optionId], texts: { [withText.optionId]: "ein Ausstiegstermin" } };
  assert.equal(completenessV21("B05", fertig), "complete");
  assert.equal(validateAnswerV21({ blockId: "B05", value: fertig }).ok, true);
});

test("ein Wertefall mit einer Bewertung ist mittendrin", () => {
  const fall = getItemsV21().find((item) => item.answerFormat === "value_case")!.itemId;
  assert.equal(completenessV21(fall, { importanceA: 4 }), "incomplete");
  assert.equal(completenessV21(fall, { importanceA: 4, importanceB: 2 }), "incomplete");
  assert.equal(completenessV21(fall, { importanceA: 4, importanceB: 2, path: "A" }), "complete");
  assert.equal(completenessV21(fall, {}), "empty");
});

test("ein angefangenes Zeitfenster ist mittendrin", () => {
  const halb = { windows: [{ day: "Dienstag", from: "18:00", to: "", timezone: "Europe/Berlin" }] };
  assert.equal(completenessV21("R03", halb), "incomplete");
  const ganz = { windows: [{ day: "Dienstag", from: "18:00", to: "20:00", timezone: "Europe/Berlin" }] };
  assert.equal(completenessV21("R03", ganz), "complete");
});

test("eine frisch angelegte leere Grenze ist mittendrin, keine leere Antwort", () => {
  // Sonst löscht der Autospeicher beim Klick auf „weitere Grenze“ genau das,
  // was schon dasteht.
  assert.equal(completenessV21("L01", { entries: [{ entryId: "e1", text: "" }] }), "empty");
  assert.equal(
    completenessV21("L01", {
      entries: [{ entryId: "e1", text: "ohne Absprache Geld ausgeben" }, { entryId: "e2", text: "" }],
    }),
    "incomplete",
  );
  assert.equal(
    completenessV21("L01", { entries: [{ entryId: "e1", text: "ohne Absprache Geld ausgeben" }] }),
    "complete",
  );
});

test("0 Stunden ist eine vollständige Antwort", () => {
  // Der Hinweis am Item sagt ausdrücklich: „0 ist eine mögliche Antwort.“
  assert.equal(completenessV21("R01", { number: 0, unit: "Stunden pro Woche" }), "complete");
  assert.equal(completenessV21("R01", {}), "empty");
});

test("eine angefangene Personenzeile ist mittendrin", () => {
  assert.equal(
    completenessV21("R02", { perPerson: [{ person: "", number: null, unit: "" }] }),
    "empty",
  );
  assert.equal(
    completenessV21("R02", {
      perPerson: [{ person: "Mitgründerin", number: 10, unit: "Stunden pro Woche" },
                  { person: "", number: null, unit: "" }],
    }),
    "incomplete",
  );
});

test("leer heißt leer - dann wird eine bestehende Antwort zurückgenommen", () => {
  // „Ich möchte das doch nicht angeben“ darf keine Sackgasse sein.
  for (const item of getItemsV21()) {
    assert.equal(completenessV21(item.itemId, {}), "empty", item.itemId);
    assert.equal(completenessV21(item.itemId, undefined), "empty", item.itemId);
  }
});

test("was vollständig ist, ist auch gültig - sonst hätte der Stand keinen Wert", () => {
  // DIE ENTSCHEIDENDE ZUSAGE: Wenn `complete` etwas durchlässt, das die
  // Prüfung danach ablehnt, sieht die Person wieder eine rote Meldung für
  // etwas, das sie richtig gemacht hat. Beide Funktionen müssen dasselbe
  // meinen.
  const abgelehnt: string[] = [];
  for (const item of getItemsV21()) {
    const plain = item.options.find((option) => !option.requiresText && !option.exclusive);
    const value = (() => {
      switch (item.answerFormat) {
        case "ordinal_choice":
        case "single_choice":
          return plain ? { optionId: plain.optionId } : null;
        case "multi_choice":
        case "multi_choice_priority":
          return plain ? { optionIds: [plain.optionId] } : null;
        case "value_case":
          return { importanceA: 4, importanceB: 2, path: "A" as const };
        case "money_range":
          return { amount: 5000, currency: "EUR" };
        case "number_range":
          return { number: 12, unit: "Stunden pro Woche" };
        case "person_number_range":
          return { perPerson: [{ person: "Mitgründerin", number: 10, unit: "Stunden pro Woche" }] };
        case "time_windows":
          return { windows: [{ day: "Dienstag", from: "18:00", to: "20:00", timezone: "Europe/Berlin" }] };
        case "date":
          return { date: "2027-03-01" };
        case "structured_text":
          return { text: "eine erste zahlende Kundin" };
        case "free_text_repeatable":
          return { entries: [{ entryId: "e1", text: "ohne Absprache Geld ausgeben" }] };
        case "free_text_per_entry":
          return { perEntry: { e1: "wenn eine Rechnung kommt" } };
      }
    })();
    if (!value) continue;

    if (completenessV21(item.itemId, value) !== "complete") {
      abgelehnt.push(`${item.itemId}: gilt nicht als vollständig`);
      continue;
    }
    const verdict = validateAnswerV21({ blockId: item.itemId, value });
    if (!verdict.ok) abgelehnt.push(`${item.itemId}: vollständig, aber ${verdict.reason}`);
  }
  assert.deepEqual(abgelehnt, []);
});
