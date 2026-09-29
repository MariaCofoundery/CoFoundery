import test from "node:test";
import assert from "node:assert/strict";

import {
  getItemsV22,
  getItemV22,
  offeredItemsV22,
} from "@/features/instruments/align/registries";
import { buildSections, answerableOf } from "@/features/instruments/align/questionnaireData";
import { validateAnswerV21 } from "@/features/instruments/v21/answersV21";

const ZIELE = ["S01a", "S01b", "S01c", "S01d", "S01e", "S01f"];

test("S01 wird nicht gelöscht, nur nicht mehr vorgelegt", () => {
  // Eine Kennung zu streichen, auf die gespeicherte Antworten zeigen, macht
  // sie unlesbar. Deshalb bleibt sie - und verschwindet nur aus dem
  // Fragebogen.
  const alt = getItemV22("S01");
  assert.ok(alt, "S01 ist verschwunden - gespeicherte Antworten zeigen ins Leere");
  assert.equal(alt.retired, true);

  assert.ok(!offeredItemsV22("venture_alignment").some((item) => item.itemId === "S01"));

  const gezeigt = buildSections("venture_alignment")
    .flatMap((group) => group.items)
    .map((item) => item.itemId);
  assert.ok(!gezeigt.includes("S01"), "die alte S01 steht noch im Fragebogen");
  for (const id of ZIELE) assert.ok(gezeigt.includes(id), `${id} fehlt im Fragebogen`);
  assert.ok(gezeigt.includes("S01_top"));
});

test("die sechs Ziele sind geordnete Stufen und teilen sich eine Frage", () => {
  const gemeinsam = new Set<string>();
  for (const id of ZIELE) {
    const item = getItemV22(id)!;
    assert.equal(item.answerFormat, "ordinal_choice", id);
    assert.equal(item.options.length, 5, id);
    assert.deepEqual(item.missing.map((entry) => entry.code), ["not_decided"], id);
    assert.ok(item.groupPrompt, `${id} hat keine gemeinsame Frage`);
    gemeinsam.add(item.groupPrompt!);
  }

  // EINE Frage ueber allen sechs, nicht sechs verschiedene.
  assert.equal(gemeinsam.size, 1);
  assert.match([...gemeinsam][0], /Wie wichtig sind dir/);
});

test("die Oberfläche zeigt die gemeinsame Frage genau einmal", () => {
  // Sechsmal waere Laerm, keinmal liesse sechs Saetze ohne Frage stehen.
  const items = buildSections("venture_alignment").flatMap((group) => group.items);
  const mitFrage = items.filter(
    (item, index) => item.groupPrompt && item.groupPrompt !== items[index - 1]?.groupPrompt,
  );
  assert.equal(mitFrage.length, 1);
  assert.equal(mitFrage[0].itemId, "S01a");
});

test("höchstens zwei Ziele — und weniger ist kein Mangel", () => {
  const top = getItemV22("S01_top")!;
  assert.equal(top.answerFormat, "multi_choice");
  assert.equal(top.maxChoices, 2);
  assert.equal(top.options.length, 6, "alle sechs Ziele stehen zur Wahl");

  const ids = top.options.map((option) => option.optionId);
  const bar = answerableOf(top);

  // Eins reicht.
  assert.equal(
    validateAnswerV21({ blockId: "S01_top", value: { optionIds: [ids[0]] } }, bar).ok,
    true,
  );
  // Zwei auch.
  assert.equal(
    validateAnswerV21({ blockId: "S01_top", value: { optionIds: ids.slice(0, 2) } }, bar).ok,
    true,
  );
  // Drei nicht - und zwar HIER, nicht erst im Eingabefeld.
  const zuviel = validateAnswerV21(
    { blockId: "S01_top", value: { optionIds: ids.slice(0, 3) } },
    bar,
  );
  assert.equal(zuviel.ok, false);
  assert.equal(zuviel.ok === false && zuviel.reason, "too_many_options");
});

test("aus der alten Mehrfachauswahl wird nichts umgerechnet", () => {
  // Aus "genannt oder nicht" eine Stufe zwischen eins und fuenf zu machen,
  // hiesse sich eine Wichtigkeit auszudenken, die niemand angegeben hat.
  // Geprueft wird das an der Struktur: Die alte Frage hat sieben Antworten,
  // die neuen je fuenf Stufen - es gibt keine Abbildung, die das leistet.
  const alt = getItemV22("S01")!;
  assert.equal(alt.answerFormat, "multi_choice");
  assert.equal(alt.options.length, 7);

  // Und die neuen Kennungen sind wirklich neu: keine teilt sich eine mit der
  // alten, sonst zeigten alte Antworten auf neue Fragen.
  const alle = getItemsV22("venture_alignment").map((item) => item.itemId);
  assert.equal(new Set(alle).size, alle.length);
});
