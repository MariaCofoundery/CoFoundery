import test from "node:test";
import assert from "node:assert/strict";

import { agesWithTime, itemsThatAge, itemsThatKeep } from "@/features/instruments/align/whatAges";
import { getItemsV22, getItemV22 } from "@/features/instruments/align/registries";

test("jede Zahl-, Betrags- und Zeitangabe altert", () => {
  // Wer eine Zahl angibt, hat etwas gesagt, das in drei Monaten anders sein
  // kann. Abgeleitet und nicht aufgezaehlt, damit es eine Umformulierung
  // ueberlebt.
  for (const item of getItemsV22("venture_alignment")) {
    const konkret = ["number_range", "money_range", "person_number_range", "time_windows"];
    if (konkret.includes(item.answerFormat)) {
      assert.ok(agesWithTime(item), `${item.itemId} (${item.answerFormat}) altert nicht`);
    }
  }
});

test("eine Handlungspräferenz altert nicht", () => {
  // "Wie sprichst du Einwaende an" aendert sich nicht, weil ein Quartal
  // vergeht. Sie noch einmal vorzulegen waere eine zweite Runde Fragebogen.
  for (const id of ["K01", "K04", "G01", "G05"]) {
    const item = getItemV22(id);
    assert.ok(item, `${id} gibt es nicht`);
    assert.equal(agesWithTime(item!), false, `${id} gilt als alternd`);
  }
});

test("die Stunden und das Geld sind dabei", () => {
  // Das sind die, die Maria genannt hat.
  for (const id of ["R01", "R02", "B01", "R05"]) {
    assert.ok(agesWithTime(getItemV22(id)!), id);
  }
});

test("die beiden Listen teilen den Bogen vollständig", () => {
  const alle = getItemsV22("venture_alignment").length;
  assert.equal(itemsThatAge().length + itemsThatKeep().length, alle);
  assert.ok(itemsThatAge().length >= 6, "zu wenige, das waere keine Auswahl");
  assert.ok(
    itemsThatAge().length < alle / 2,
    "mehr als die Haelfte - dann ist es keine Vorauswahl mehr, sondern der Bogen",
  );
});

test("die Reihenfolge ist die des Bogens, nicht nach Wichtigkeit", () => {
  // „Wichtig“ hiesse: Wir wuessten, was dieser Person am meisten zu schaffen
  // macht. Wissen wir nicht.
  const reihenfolge = itemsThatAge().map((item) => item.order);
  assert.deepEqual(reihenfolge, [...reihenfolge].sort((a, b) => a - b));
});

test("nichts aus dem Arbeitsprofil steht darin", () => {
  // Das Profil gehoert zur Person und nicht zum Vorhaben - es wird beim
  // Verbinden nicht bestaetigt.
  const ids = new Set(getItemsV22("founder_profile").map((item) => item.itemId));
  for (const item of itemsThatAge()) {
    assert.ok(!ids.has(item.itemId), `${item.itemId} gehört zum Profil`);
  }
});
