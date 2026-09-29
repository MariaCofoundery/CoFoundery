import test from "node:test";
import assert from "node:assert/strict";

import { readAnswer, readAll } from "@/features/instruments/v21/readoutV21";
import { getItemV21, getItemsV21 } from "@/features/instruments/v21/registryV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

const opt = (itemId: string, index: number) => getItemV21(itemId)!.options[index].optionId;

test("eine geordnete Stufe kommt als Beschriftung und Stelle, nie als Wert", () => {
  const entry = readAnswer({ blockId: "A01", value: { optionId: opt("A01", 2) } })!;
  assert.equal(entry.value?.kind, "ordinal");
  assert.deepEqual(entry.value, {
    kind: "ordinal", label: "manchmal", position: 3, of: 5,
  });
  // Die Stelle heißt `position` und nicht `value` - damit niemand versucht,
  // damit zu rechnen.
  assert.ok(!("value" in (entry.value as object)));
});

test("eine Handlungswahl bekommt KEINE Stelle", () => {
  // K01s letzte Antwort („je nach Aufgabe unterschiedlich“) steht neben der
  // Reihenfolge, nicht an ihrem Ende. Eine Position dafür auszugeben hieße zu
  // behaupten, sie sei „später“ als „wenn es fertig ist“.
  const entry = readAnswer({ blockId: "K01", value: { optionId: opt("K01", 4) } })!;
  assert.equal(entry.value?.kind, "choice");
  assert.ok(!("position" in (entry.value as object)));
});

test("nirgends entsteht eine Zahl, mit der sich rechnen ließe", () => {
  // Der Weg, den v1 gegangen ist: Eine 3 sieht aus wie eine Zahl, also wird
  // sie addiert, gemittelt, verglichen - und am Ende steht „ihr liegt 1,4
  // auseinander“, was nichts bedeutet.
  const answers: Record<string, AlignmentAnswerV21> = {};
  for (const item of getItemsV21()) {
    if (item.options.length > 0 && item.answerFormat.includes("choice")) {
      answers[item.itemId] = item.answerFormat.startsWith("multi")
        ? { blockId: item.itemId, value: { optionIds: [item.options[0].optionId] } }
        : { blockId: item.itemId, value: { optionId: item.options[0].optionId } };
    }
  }
  const asText = JSON.stringify(readAll(answers));
  assert.ok(!/"score"|"weight"|"mean"|"average"|"sum"|"index"/.test(asText));
});

test("ein Auslassungsgrund erscheint mit seinem eigenen Satz", () => {
  // Nicht als leeres Feld: Das ist der Unterschied zu v1, wo aus einer
  // Auslassung stillschweigend die Mitte wurde.
  const entry = readAnswer({ blockId: "G01", missingCode: "not_decided" })!;
  assert.equal(entry.value, null);
  assert.deepEqual(entry.missing, { code: "not_decided", label: "habe ich noch nicht entschieden" });
});

test("ein Grund, den die Frage nicht anbietet, wird nicht geglättet", () => {
  // K01 bietet nur cannot_assess. Eine erfundene Beschriftung dafür wäre eine
  // Auskunft, die niemand gegeben hat.
  const entry = readAnswer({ blockId: "K01", missingCode: "prefer_not_to_say" })!;
  assert.equal(entry.missing, null);
  assert.equal(entry.value, null);
});

test("eine Mehrfachwahl nennt den Vorrang, wenn es einen gibt", () => {
  const entry = readAnswer({
    blockId: "S01",
    value: { optionIds: [opt("S01", 0), opt("S01", 1)], priorityOptionId: opt("S01", 1) },
  })!;
  assert.equal(entry.value?.kind, "choices");
  const value = entry.value as { labels: string[]; priority: string | null };
  assert.equal(value.labels.length, 2);
  assert.equal(value.priority, getItemV21("S01")!.options[1].label);
});

test("ein Wertefall zeigt beide Wichtigkeiten getrennt", () => {
  // Getrennt und nicht als Schieberegler zwischen zwei Polen: Beide dürfen
  // sehr wichtig sein. Genau daran erkennt man, für wen der Fall schwer ist.
  const wertefall = getItemsV21().find((item) => item.answerFormat === "value_case")!;
  const entry = readAnswer({
    blockId: wertefall.itemId,
    value: { importanceA: 5, importanceB: 5, path: "A" },
  })!;
  const value = entry.value as { concerns: { importance: { position: number } }[] };
  assert.equal(value.concerns.length, 2);
  assert.equal(value.concerns[0].importance.position, 5);
  assert.equal(value.concerns[1].importance.position, 5);
});

test("Zeitfenster behalten ihre Zeitzone bis in den Bericht", () => {
  const entry = readAnswer({
    blockId: "R03",
    value: { windows: [{ day: "Dienstag", from: "18:00", to: "20:00", timezone: "Europe/Lisbon" }] },
  })!;
  assert.match(JSON.stringify(entry.value), /Europe\/Lisbon/);
});

test("eine Anschlussantwort nennt die Grenze, zu der sie gehört", () => {
  const answers: Record<string, AlignmentAnswerV21> = {
    L01: { blockId: "L01", value: { entries: [{ entryId: "e1", text: "ohne Absprache Geld ausgeben" }] } },
    L02: { blockId: "L02", value: { perEntry: { e1: "wenn eine Rechnung kommt" } } },
  };
  const sections = readAll(answers);
  const l02 = sections.flatMap((s) => s.entries).find((e) => e.itemId === "L02")!;
  const value = l02.value as { entries: { about: string; text: string }[] };
  assert.equal(value.entries[0].about, "ohne Absprache Geld ausgeben");
});

test("eine gestrichene Grenze lässt den geschriebenen Satz nicht verschwinden", () => {
  // Er wird als heimatlos ausgewiesen, statt lautlos wegzufallen. Was jemand
  // geschrieben hat, verschwindet nicht, weil eine Zeile darüber fehlt.
  const answers: Record<string, AlignmentAnswerV21> = {
    L01: { blockId: "L01", value: { entries: [{ entryId: "e2", text: "andere Grenze" }] } },
    L02: { blockId: "L02", value: { perEntry: { e1: "ein wichtiger Satz" } } },
  };
  const l02 = readAll(answers).flatMap((s) => s.entries).find((e) => e.itemId === "L02")!;
  const value = l02.value as { entries: { about: string; text: string }[] };
  assert.equal(value.entries[0].text, "ein wichtiger Satz");
  assert.match(value.entries[0].about, /nicht mehr gibt/);
});

test("eine unbekannte Frage bringt den Bericht nicht zum Absturz", () => {
  // Ein Bericht, der wegen einer einzigen unlesbaren Zeile gar nicht
  // erscheint, ist schlechter als einer, der diese Zeile ausweist.
  assert.equal(readAnswer({ blockId: "Z99", value: { text: "x" } }), null);
});

test("jede der 36 Fragen lässt sich lesen, wenn sie beantwortet ist", () => {
  const unreadable: string[] = [];
  for (const item of getItemsV21()) {
    const entry = readAnswer({ blockId: item.itemId, missingCode: item.missing[0].code });
    if (!entry || !entry.missing) unreadable.push(item.itemId);
  }
  assert.deepEqual(unreadable, []);
});

test("die Abschnitte stehen in der Reihenfolge der Quelle, nicht der Antworten", () => {
  // Sonst hinge die Reihenfolge davon ab, in welcher jemand geantwortet hat -
  // und zwei Berichte derselben Person sähen nach einem Nachtrag anders aus.
  const spaet: Record<string, AlignmentAnswerV21> = {
    L01: { blockId: "L01", value: { entries: [{ entryId: "e1", text: "x" }] } },
    A01: { blockId: "A01", value: { optionId: opt("A01", 0) } },
  };
  const frueh: Record<string, AlignmentAnswerV21> = {
    A01: spaet.A01,
    L01: spaet.L01,
  };
  assert.deepEqual(
    readAll(spaet).map((group) => group.section),
    readAll(frueh).map((group) => group.section),
  );
  assert.equal(readAll(spaet)[0].section, getItemV21("A01")!.section);
});

test("innerhalb eines Abschnitts steht die Reihenfolge der Quelle", () => {
  const answers: Record<string, AlignmentAnswerV21> = {
    A02: { blockId: "A02", value: { optionId: opt("A02", 0) } },
    A01: { blockId: "A01", value: { optionId: opt("A01", 0) } },
  };
  assert.deepEqual(
    readAll(answers)[0].entries.map((entry) => entry.itemId),
    ["A01", "A02"],
  );
});
