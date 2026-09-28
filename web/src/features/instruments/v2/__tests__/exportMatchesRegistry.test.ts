import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getMvpAlignmentItems } from "@/features/instruments/v2/alignmentRegistryV2";
import { getMvpContextBlocks, getMvpValueCases } from "@/features/instruments/v2/contextRegistryV2";

/**
 * Das ausgegebene Dokument ist der Fragebogen, nicht eine Abschrift davon.
 *
 * Maria liest den Fragebogen in Word und entscheidet danach über
 * Formulierungen. Wenn das Dokument von dem abweicht, was die Anwendung
 * ausliefert, entscheidet sie über etwas, das es nicht gibt - und es fällt
 * niemandem auf, weil beides plausibel aussieht.
 *
 * Dieser Test ist der Grund, warum das Dokument erzeugt und nicht gepflegt
 * wird: `npm run export:questionnaire`.
 */

const doc = readFileSync("../docs/fragebogen-v2.md", "utf8");

test("jede Frage der Gesprächsfassung steht im Dokument", () => {
  const missing: string[] = [];
  for (const item of getMvpAlignmentItems()) {
    if (!doc.includes(item.prompt)) missing.push(`${item.itemId}: ${item.prompt}`);
  }
  for (const block of getMvpContextBlocks()) {
    if (!doc.includes(block.prompt)) missing.push(`${block.blockId}: ${block.prompt}`);
  }
  for (const card of getMvpValueCases()) {
    if (!doc.includes(card.situation)) missing.push(`${card.caseId}`);
  }
  assert.deepEqual(
    missing,
    [],
    "Das Dokument ist nicht mehr aktuell. `npm run export:questionnaire` läuft " +
      "in Sekunden:\n" + missing.join("\n")
  );
});

test("es sind genau die 39 Blöcke der Gesprächsfassung", () => {
  const ueberschriften = doc.match(/^### /gm) ?? [];
  const erwartet =
    getMvpAlignmentItems().length + getMvpContextBlocks().length + getMvpValueCases().length;
  assert.equal(ueberschriften.length, erwartet);
  assert.equal(erwartet, 39);
});

test("die Antwortmöglichkeiten stehen dabei, nicht nur die Fragen", () => {
  // Ein Fragebogen ohne Antwortmöglichkeiten lässt sich nicht beurteilen -
  // gerade der Deckeneffekt zeigt sich erst an den Stufen.
  assert.match(doc, /bei keiner · bei ein bis zwei · bei etwa der Hälfte · bei den meisten · bei allen/);
  assert.match(doc, /gar nicht wichtig · wenig wichtig · mittel wichtig/);
  // Und die Auslassungsgründe als das, was sie sind.
  assert.match(doc, /Oder: kann ich noch nicht einschätzen/);
  assert.match(doc, /vollwertige Antworten und kein Überspringen/);
});
