import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAlignmentSections } from "@/features/instruments/v2/alignmentQuestionnaireData";
import { requiredBlocks } from "@/features/instruments/v2/alignmentProgress";
import { getAlignmentPreferences } from "@/features/instruments/v2/alignmentRegistryV2";

const idsOf = (module: "base" | "values", step?: 1 | 2) =>
  buildAlignmentSections(module, step).flatMap((section) => section.blocks.map((b) => b.blockId));

test("die Oberfläche zeigt genau das, was die Abgabe verlangt", () => {
  // Sonst gibt es Blöcke, die gefordert, aber nie angezeigt werden - jemand
  // käme dann nie zum Abgeben und wüsste nicht, warum.
  for (const [module, step] of [["base", 1], ["base", 2], ["values", undefined]] as const) {
    assert.deepEqual(
      idsOf(module, step).sort(),
      requiredBlocks(module, step).sort(),
      `${module}/${step}`
    );
  }
});

test("kein Block taucht zweimal auf", () => {
  for (const [module, step] of [["base", 1], ["base", 2], ["values", undefined]] as const) {
    const ids = idsOf(module, step);
    assert.equal(new Set(ids).size, ids.length, `${module}/${step}`);
  }
});

test("die Bedingung kommt bis auf den Bildschirm", () => {
  // OHNE SIE MISST DIE PRÄFERENZ ETWAS ANDERES. „Stell dir vor, dein
  // Verantwortungsbereich und dein Budget sind vereinbart" ist Teil der
  // Messversion - eine Oberfläche, die sie weglässt, stellt eine andere Frage.
  const withCondition = getAlignmentPreferences().filter((p) => p.condition);
  assert.ok(withCondition.length >= 4, "die Quelle hat Bedingungen");

  const sections = buildAlignmentSections("base", 1);
  for (const preference of withCondition) {
    const section = sections.find((entry) => entry.key === preference.id);
    assert.ok(section, `${preference.id} fehlt`);
    for (const block of section!.blocks) {
      assert.equal(block.condition, preference.condition, block.blockId);
    }
  }
});

test("jeder Block bringt mit, was der Browser zum Anzeigen braucht", () => {
  for (const [module, step] of [["base", 1], ["base", 2], ["values", undefined]] as const) {
    for (const section of buildAlignmentSections(module, step)) {
      for (const block of section.blocks) {
        assert.ok(block.prompt.trim(), block.blockId);
        assert.ok(block.answerFormat, block.blockId);
        // Die Auswahlformate brauchen ihre Optionen - sonst steht dort eine
        // Frage ohne Antwortmöglichkeiten.
        if (block.answerFormat === "single_choice" || block.answerFormat === "multi_choice") {
          assert.ok((block.block?.options.length ?? 0) >= 2, block.blockId);
        }
        if (block.answerFormat === "value_case") {
          assert.equal(block.valueCase?.concerns.length, 2, block.blockId);
          assert.equal(block.valueCase?.paths.length, 4, block.blockId);
        }
        if (["F", "C", "importance_rating"].includes(block.answerFormat)) {
          assert.equal(block.scaleLabels.length, 5, block.blockId);
        }
      }
    }
  }
});

test("der technische Ausfall wird niemandem angeboten", () => {
  // 'technical' ist ein Befund des Systems, keine Wahl eines Menschen. Er
  // steht in der Registratur, damit ein Ausfall speicherbar ist - nicht,
  // damit jemand ihn anklickt.
  //
  // ZWEI GETRENNTE AUSSAGEN, und die erste Fassung dieses Tests prüfte nur
  // die erste: Heute bietet ihn keine Frage an, deshalb wäre jede Prüfung
  // der Oberfläche grün, auch eine, die nichts filtert. Also wird beides
  // geprüft - der Bestand UND das Netz darunter.
  for (const [module, step] of [["base", 1], ["base", 2], ["values", undefined]] as const) {
    for (const section of buildAlignmentSections(module, step)) {
      for (const block of section.blocks) {
        assert.ok(!block.offeredMissing.includes("technical"), block.blockId);
      }
    }
  }

  // Und falls ihn doch einmal eine Frage führt: die Schale zeigt ihn nicht.
  const shell = readFileSync("src/features/instruments/v2/AlignmentQuestionnaire.tsx", "utf8");
  assert.match(shell, /filter\(\(code\) => code !== "technical"\)/);
});
