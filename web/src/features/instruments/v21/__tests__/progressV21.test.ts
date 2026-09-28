import test from "node:test";
import assert from "node:assert/strict";

import {
  visibleItemIds,
  missingItemIds,
  progressV21,
  orphanedFollowUps,
  hasEntries,
  basisOf,
} from "@/features/instruments/v21/progressV21";
import { getItemsV21, getItemV21 } from "@/features/instruments/v21/registryV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

const grenze = (...ids: string[]): AlignmentAnswerV21 => ({
  blockId: "L01",
  value: { entries: ids.map((entryId) => ({ entryId, text: `Grenze ${entryId}` })) },
});

/** Eine beliebige gültige Antwort, damit „beantwortet“ nicht heißt „leer“. */
const irgendwas = (itemId: string): AlignmentAnswerV21 => ({
  blockId: itemId,
  missingCode: getItemV21(itemId)!.missing[0].code,
});

test("ohne eine Grenze in L01 werden die Anschlussfragen nicht gezeigt", () => {
  const visible = visibleItemIds({});
  assert.ok(!visible.includes("L02"), "L02 wird gezeigt, obwohl es keine Grenze gibt");
  assert.ok(!visible.includes("L03"));
  assert.equal(visible.length, getItemsV21().length - 2);
});

test("mit einer Grenze erscheinen sie", () => {
  const visible = visibleItemIds({ L01: grenze("e1") });
  assert.ok(visible.includes("L02"));
  assert.ok(visible.includes("L03"));
  assert.equal(visible.length, getItemsV21().length);
});

test("wer L01 auslässt, bekommt die Anschlussfragen auch nicht", () => {
  // „Möchte ich nicht angeben“ ist eine zulässige Antwort. Daraus dann zwei
  // unbeantwortbare Fragen zu machen, wäre eine Strafe für eine Haltung.
  const visible = visibleItemIds({ L01: { blockId: "L01", missingCode: "withheld" } });
  assert.ok(!visible.includes("L02"));
});

test("die Abgabe verlangt nur, was diese Person sieht", () => {
  const answers: Record<string, AlignmentAnswerV21> = {};
  for (const item of getItemsV21()) {
    if (item.itemId === "L02" || item.itemId === "L03") continue;
    answers[item.itemId] = irgendwas(item.itemId);
  }
  // L01 ist mit einem Auslassungsgrund beantwortet - also keine Grenze, also
  // keine Anschlussfragen, also vollständig.
  assert.deepEqual(missingItemIds(answers), []);
});

test("mit einer Grenze fehlen die beiden Anschlussfragen wirklich", () => {
  const answers: Record<string, AlignmentAnswerV21> = {};
  for (const item of getItemsV21()) {
    if (item.itemId === "L02" || item.itemId === "L03") continue;
    answers[item.itemId] = irgendwas(item.itemId);
  }
  answers.L01 = grenze("e1");
  assert.deepEqual(missingItemIds(answers).sort(), ["L02", "L03"]);
});

test("der Fortschritt zählt gegen die sichtbaren Fragen, nicht gegen 36", () => {
  // Ein Balken, der bei 34 von 36 stehen bleibt, wäre eine Auskunft über
  // etwas, das gar nicht fehlt.
  const answers: Record<string, AlignmentAnswerV21> = {};
  for (const item of getItemsV21()) {
    if (item.itemId === "L02" || item.itemId === "L03") continue;
    answers[item.itemId] = irgendwas(item.itemId);
  }
  const ohne = progressV21(answers);
  assert.deepEqual(ohne, { done: 34, of: 34 });

  answers.L01 = grenze("e1");
  const mit = progressV21(answers);
  assert.deepEqual(mit, { done: 34, of: 36 });
});

test("eine gestrichene Grenze lässt ihre Anschlussantwort sichtbar zurück", () => {
  // Sie verschwindet nicht von selbst - und stillschweigend zu löschen, was
  // jemand geschrieben hat, wäre der schlechtere Weg.
  const answers: Record<string, AlignmentAnswerV21> = {
    L01: grenze("e2"),
    L02: { blockId: "L02", value: { perEntry: { e1: "zu e1", e2: "zu e2" } } },
  };
  assert.deepEqual(orphanedFollowUps(answers), [{ itemId: "L02", entryIds: ["e1"] }]);
});

test("solange alles zusammenpasst, gibt es keine verwaisten Antworten", () => {
  const answers: Record<string, AlignmentAnswerV21> = {
    L01: grenze("e1", "e2"),
    L02: { blockId: "L02", value: { perEntry: { e1: "a", e2: "b" } } },
    L03: { blockId: "L03", value: { perEntry: { e1: "c" } } },
  };
  assert.deepEqual(orphanedFollowUps(answers), []);
});

test("die Hilfsprüfungen sagen, was sie sagen sollen", () => {
  assert.equal(basisOf("L02"), "L01");
  assert.equal(basisOf("L03"), "L01");
  assert.equal(basisOf("A01"), null);

  assert.equal(hasEntries(grenze("e1")), true);
  assert.equal(hasEntries({ blockId: "L01", value: { entries: [] } }), false);
  assert.equal(hasEntries({ blockId: "L01", missingCode: "withheld" }), false);
  assert.equal(hasEntries(null), false);
});

test("nur L02 und L03 sind Anschlussfragen - die Registratur sagt es auch", () => {
  // Gegenprobe gegen die fest eingetragene Liste: Wenn die Quelle eine dritte
  // Anschlussfrage bekommt, muss FOLLOW_UPS mitwachsen, und das fällt hier auf.
  const withShowWhen = getItemsV21().filter((item) => item.showWhen).map((item) => item.itemId);
  assert.deepEqual(withShowWhen.sort(), ["L02", "L03"]);
  for (const itemId of withShowWhen) {
    assert.notEqual(basisOf(itemId), null, `${itemId} hat showWhen, aber keine Voraussetzung`);
  }
});
