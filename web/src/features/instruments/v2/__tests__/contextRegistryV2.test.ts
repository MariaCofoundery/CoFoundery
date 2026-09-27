import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ALIGNMENT_REGISTRY_V2, getMvpAlignmentItems } from "@/features/instruments/v2/alignmentRegistryV2";
import {
  CONTEXT_REGISTRY_V2,
  assertContextRegistryIntegrity,
  getContextBlocks,
  getMvpContextBlocks,
  getMvpValueCases,
  getValueCases,
  type ContextRegistryV2,
} from "@/features/instruments/v2/contextRegistryV2";

const PAPER = "../docs/CoFoundery_Wissenschaftliche_Neukonzeption.md";
const clone = (): ContextRegistryV2 =>
  JSON.parse(JSON.stringify(CONTEXT_REGISTRY_V2)) as ContextRegistryV2;

// ---------------------------------------------------------------------------
// Schritt 1b: Ziele, Ressourcen, Grenzen, Regeln und die Wertefälle
// ---------------------------------------------------------------------------

test("dreiunddreißig Kontextblöcke und zehn Wertefälle", () => {
  const byGroup = (group: string) => getContextBlocks().filter((b) => b.group === group).length;

  assert.equal(byGroup("S"), 8);
  assert.equal(byGroup("R"), 12);
  assert.equal(byGroup("B"), 6);
  assert.equal(byGroup("G"), 4);
  assert.equal(byGroup("L"), 3);
  assert.equal(getValueCases().length, 10);

  // Das Gutachten nennt 107 Frageblöcke: 64 + 30 + 10 + 3.
  const total = 64 + getContextBlocks().length + getValueCases().length;
  assert.equal(total, 107);
});

test("jeder Fragetext steht wörtlich so in der Quelle", () => {
  // Dieselbe Prüfung wie bei den Präferenzen, und aus demselben Grund: Ein
  // Instrument, dessen Fragen sich unbemerkt von ihrer Quelle entfernen, ist
  // nicht mehr das Instrument, das begutachtet wurde.
  const paper = readFileSync(PAPER, "utf8");

  const drifted: string[] = [];
  for (const block of getContextBlocks()) {
    if (!paper.includes(block.prompt)) drifted.push(`${block.blockId}: ${block.prompt}`);
  }
  for (const value of getValueCases()) {
    if (!paper.includes(value.situation)) drifted.push(`${value.caseId} (Situation)`);
    for (const path of value.paths) {
      if (!paper.includes(path.label)) drifted.push(`${value.caseId} ${path.key}: ${path.label}`);
    }
    for (const concern of value.concerns) {
      if (!paper.includes(concern.label)) drifted.push(`${value.caseId} Anliegen: ${concern.label}`);
    }
  }
  assert.deepEqual(drifted, [], "Nicht mehr wörtlich in der Quelle:\n" + drifted.join("\n"));

  // GEGENPROBE, damit ein leer gelesenes Dokument nicht alles bejaht.
  const first = getContextBlocks()[0].prompt;
  assert.ok(paper.includes(first));
  assert.ok(!paper.includes(first.replace("Welche", "Welches")), "der Abgleich unterscheidet");
});

test("beim Übertragen in Felder geht kein Segment der Quelle verloren", () => {
  // DIE EIGENTLICHE GEFAHR DIESES SCHRITTS. Die Antwortspalte der Quelle ist
  // Fließtext, in dem echte Antwortmöglichkeiten und bloße Feldhinweise in
  // derselben Aufzählung stehen: „keine feste Erwartung“ ist wählbar,
  // „brutto/netto kennzeichnen“ nicht. Beim Sortieren verschwindet leise eine
  // Option - und niemand merkt es, weil die Frage weiterhin funktioniert.
  //
  // Die Prüfung läuft schon beim Laden; hier ist die Gegenprobe, dass sie
  // wirklich anschlägt.
  const broken = clone();
  const target = broken.blocks.find((block) => block.blockId === "R02")!;
  target.options = [];
  assert.throws(() => assertContextRegistryIntegrity(broken), /keine feste Erwartung/);

  // Und die Feldhinweise sind wirklich Hinweise, keine Optionen.
  const r05 = getContextBlocks().find((block) => block.blockId === "R05")!;
  assert.deepEqual(r05.fieldNotes, ["brutto/netto kennzeichnen"]);
  assert.deepEqual(r05.options, []);
});

test("noch offen und vertraulich klären sind eigene Gründe", () => {
  const codes = new Set(ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => entry.code));
  assert.ok(codes.has("undecided"));
  assert.ok(codes.has("confidential_first"));

  // R04 BIETET BEIDE NEBENEINANDER AN - das ist der Beweis, dass „noch offen“
  // und „kann ich noch nicht einschätzen“ nicht dasselbe sind. Würde man sie
  // zusammenlegen, verlöre genau diese Frage eine Antwortmöglichkeit.
  const r04 = getContextBlocks().find((block) => block.blockId === "R04")!;
  assert.ok(r04.missing.includes("undecided"));
  assert.ok(r04.missing.includes("cannot_assess"));

  // Die Grenzfragen bieten kein „möchte ich nicht angeben“, sondern die Bitte
  // um ein Gespräch unter vier Augen. Das ist eine offene Tür, keine
  // geschlossene, und darf nicht zu „verweigert“ werden.
  for (const block of getContextBlocks("L")) {
    assert.deepEqual(block.missing, ["undecided", "confidential_first"], block.blockId);
    assert.ok(!block.missing.includes("withheld"), block.blockId);
  }

  // Und jeder Block bietet jeden Grund höchstens einmal an: die Quelle nennt
  // bei R11 und B01 „möchte ich nicht angeben“ zweimal und verlangt selbst,
  // solche Optionen zusammenzuführen statt sie doppelt anzuzeigen.
  for (const block of getContextBlocks()) {
    assert.equal(new Set(block.missing).size, block.missing.length, block.blockId);
  }
});

test("die Gesprächsfassung ist die des Gutachtens plus benannte Abweichungen", () => {
  // KEINE STILLE ABWEICHUNG VON DER QUELLE. Wer einen Block dazunimmt oder
  // herausnimmt, ohne den Grund zu hinterlegen, lässt diesen Test scheitern.
  const paper = new Set(CONTEXT_REGISTRY_V2.paperMvpSelection);
  const added = CONTEXT_REGISTRY_V2.deviationsFromSource
    .filter((deviation) => deviation.change === "added_to_mvp")
    .flatMap((deviation) => deviation.blocks);

  const expected = new Set([...paper, ...added]);
  const actual = new Set([
    ...getMvpContextBlocks().map((block) => block.blockId),
    ...getMvpValueCases().map((value) => value.caseId),
  ]);
  assert.deepEqual([...actual].sort(), [...expected].sort());

  // Jede Abweichung nennt Grund, Person und Datum - sonst ist sie in einem
  // halben Jahr nicht mehr von einem Versehen zu unterscheiden.
  for (const deviation of CONTEXT_REGISTRY_V2.deviationsFromSource) {
    assert.ok(deviation.reason.length > 60, deviation.change);
    assert.ok(deviation.decidedBy.trim(), deviation.change);
    assert.match(deviation.decidedOn, /^\d{4}-\d{2}-\d{2}$/);
  }

  // Die Zahl, die daraus folgt: 36 Blöcke im Gutachten, drei Grenzfragen dazu.
  assert.equal(getMvpAlignmentItems().length + actual.size, 39);
});

test("die Zusagen kommen im zweiten Schritt, nicht beim ersten Ausfüllen", () => {
  // Stunden, Geld und Termine sind Zusagen, keine Selbstauskunft. Sie beim
  // ersten Ausfüllen zu verlangen hieße, eine Festlegung zu fordern, bevor
  // überhaupt klar ist, mit wem.
  const second = getMvpContextBlocks(2).map((block) => block.blockId);
  assert.deepEqual(second, ["R01", "R02", "R03", "R04", "R06", "R12"]);

  // Und kein anderer Block ist in den zweiten Schritt gerutscht.
  for (const block of getMvpContextBlocks(1)) {
    assert.notEqual(block.group, "R", `${block.blockId} gehört in Schritt 2`);
  }
});

test("die Wertefälle bewerten beide Anliegen getrennt", () => {
  for (const value of getValueCases()) {
    assert.equal(value.concerns.length, 2, value.caseId);
    // BEIDE DÜRFEN SEHR WICHTIG SEIN. Ein Schieberegler zwischen zwei Polen
    // würde genau das unmöglich machen - und ein gemeinsam anerkanntes
    // Dilemma sieht dann aus wie eine mittlere Meinung.
    assert.notEqual(value.concerns[0].label, value.concerns[1].label, value.caseId);
    assert.deepEqual(
      value.paths.map((path) => path.key),
      ["A", "B", "other", "unknown"],
      value.caseId
    );
    assert.equal(value.paths.find((path) => path.key === "other")!.requiresText, true);
    assert.equal(value.paths.find((path) => path.key === "unknown")!.isMissing, true);
    assert.match(value.scoring, /Keine Differenz-, Summen- oder Werte-Gesamtskala/);
  }

  assert.equal(CONTEXT_REGISTRY_V2.importanceLabels.length, 5);
});

test("nichts hiervon ergibt eine Zahl", () => {
  const notes = CONTEXT_REGISTRY_V2.notes.join(" ");
  assert.match(notes, /KEINE GESAMTZAHL/);
  assert.match(notes, /KEINE INTERNE KONSISTENZ ALS GUETEKRITERIUM/);

  // Jede Auswertungsregel der Quelle schließt Reverse Coding aus, und keine
  // erlaubt eine Mittelwertbildung über Blöcke.
  for (const block of getContextBlocks()) {
    assert.match(block.scoring, /Kein Reverse|kein psychologischer Score|Kein numerischer Wert/,
      `${block.blockId}: ${block.scoring}`);
  }
});

test("Kennungen sind eindeutig und die Prüfung schlägt an", () => {
  const ids = [
    ...getContextBlocks().map((block) => block.blockId),
    ...getValueCases().map((value) => value.caseId),
  ];
  assert.equal(new Set(ids).size, ids.length);

  const broken = clone();
  broken.blocks[1].blockId = broken.blocks[0].blockId;
  assert.throws(() => assertContextRegistryIntegrity(broken), /doppelte Kennung/);

  const unknownCode = clone();
  (unknownCode.blocks[0].missing as string[]).push("erfunden");
  assert.throws(() => assertContextRegistryIntegrity(unknownCode), /unbekannter Auslassungsgrund/);
});
