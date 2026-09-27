import assert from "node:assert/strict";
import test from "node:test";
import { getMvpAlignmentItems } from "@/features/instruments/v2/alignmentRegistryV2";
import { missingRequiredBlocks, requiredBlocks } from "@/features/instruments/v2/alignmentProgress";
import { allBlockIds, moduleOfBlock } from "@/features/instruments/v2/alignmentAnswersV2";
import { offeredMissingCodes, validateAlignmentAnswer } from "@/features/instruments/v2/validateAlignmentAnswer";
import { answerFormatOfBlock, type AlignmentAnswer } from "@/features/instruments/v2/alignmentAnswersV2";

test("die Gesprächsfassung verteilt sich auf zwei Fragebögen und zwei Schritte", () => {
  const base1 = requiredBlocks("base", 1);
  const base2 = requiredBlocks("base", 2);
  const values = requiredBlocks("values");

  // 16 Präferenzitems + 4 Ziele + 2 Risiko + 2 Regeln
  assert.equal(base1.length, 24);
  // Die sechs Zusagen, und sonst nichts.
  assert.deepEqual(base2, ["R01", "R02", "R03", "R04", "R06", "R12"]);
  // 6 Wertefälle + 3 Grenzfragen
  assert.equal(values.length, 9);

  assert.equal(base1.length + base2.length + values.length, 39);

  // Kein Block liegt in zwei Töpfen.
  const all = [...base1, ...base2, ...values];
  assert.equal(new Set(all).size, all.length);
});

test("kein Block landet im falschen Fragebogen", () => {
  for (const blockId of requiredBlocks("base")) assert.equal(moduleOfBlock(blockId), "base", blockId);
  for (const blockId of requiredBlocks("values")) assert.equal(moduleOfBlock(blockId), "values", blockId);

  // Die Präferenzitems gehören zum ersten Ausfüllen, nicht zu den Zusagen.
  for (const item of getMvpAlignmentItems()) {
    assert.ok(!requiredBlocks("base", 2).includes(item.itemId), item.itemId);
  }
});

test("was fehlt, wird benannt - und Vollständigkeit ist erreichbar", () => {
  assert.deepEqual(missingRequiredBlocks("values", []), requiredBlocks("values"));
  assert.deepEqual(missingRequiredBlocks("values", requiredBlocks("values")), []);

  // Eine Antwort, die nicht verlangt war, macht nichts vollständig.
  assert.ok(missingRequiredBlocks("values", ["W07", "W08", "W09", "W10"]).length > 0);
});

test("Vollständigkeit ist zumutbar, weil jedes Auslassen ein Wort hat", () => {
  // DIE BEGRÜNDUNG DER REGEL, ALS TEST. Eine Abgabe verlangt für jeden Block
  // eine Zeile. Das wäre eine Härte, wenn man irgendwo nichts sagen KÖNNTE -
  // hier kann man überall etwas sagen, notfalls warum nicht.
  const stuck: string[] = [];
  for (const blockId of allBlockIds()) {
    const offered = offeredMissingCodes(blockId);
    const candidate = offered.length
      ? ({ blockId, answerFormat: answerFormatOfBlock(blockId)!, missingCode: offered[0] } as AlignmentAnswer)
      : ({
          blockId,
          answerFormat: answerFormatOfBlock(blockId)!,
          value: { importanceA: 3, importanceB: 3, path: "unknown" },
        } as AlignmentAnswer);
    if (!validateAlignmentAnswer(candidate).ok) stuck.push(blockId);
  }
  assert.deepEqual(stuck, [], "Diese Blöcke kann man weder beantworten noch begründet auslassen");
});
