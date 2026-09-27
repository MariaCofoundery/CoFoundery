import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ALIGNMENT_REGISTRY_V2 } from "@/features/instruments/v2/alignmentRegistryV2";
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
  // steht in der Registratur, damit ein Ausfall speicherbar ist - und hat
  // dort als einziger Code gar keine Beschriftung.
  for (const [module, step] of [["base", 1], ["base", 2], ["values", undefined]] as const) {
    for (const section of buildAlignmentSections(module, step)) {
      for (const block of section.blocks) {
        assert.ok(!block.offeredMissing.some((entry) => entry.code === "technical"), block.blockId);
      }
    }
  }
});

test("die Beschriftungen kommen aus der Registratur, nicht aus dem Textbestand", () => {
  // SIE SIND TEIL DER MESSUNG WIE DIE FRAGEN. Bis zum 27.09.2026 standen sie
  // zusaetzlich im Textbestand - identisch, aber doppelt gepflegt und damit
  // eine Stelle, an der zwei Fassungen auseinanderlaufen können. Und
  // uebersetzen darf man sie so wenig wie eine Frage.
  const labels = new Map(ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => [entry.code, entry.label]));
  let seen = 0;
  for (const section of buildAlignmentSections("base", 1)) {
    for (const block of section.blocks) {
      for (const entry of block.offeredMissing) {
        assert.equal(entry.label, labels.get(entry.code), entry.code);
        seen += 1;
      }
    }
  }
  assert.ok(seen > 20, `zu wenige geprueft: ${seen}`);

  for (const locale of ["de", "en"] as const) {
    const bundle = JSON.parse(readFileSync(`messages/${locale}/alignment.json`, "utf8"));
    for (const code of labels.keys()) {
      assert.ok(!(code in bundle.missing), `${locale}: ${code} steht wieder im Textbestand`);
    }
  }
});
