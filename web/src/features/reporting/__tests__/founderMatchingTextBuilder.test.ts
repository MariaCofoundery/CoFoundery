import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderMatchingAgreements,
  buildFounderMatchingDailyDynamics,
  buildFounderMatchingFullText,
  buildFounderMatchingHero,
  buildFounderMatchingIntroBlocks,
  buildFounderMatchingTextExamples,
  buildStableBaseBlock,
} from "@/features/reporting/founderMatchingTextBuilder";
import { runFounderMatchingSelectionExamples } from "@/features/reporting/founderMatchingSelection";

test("founder matching hero is deterministic for complementary builders", () => {
  const selection = runFounderMatchingSelectionExamples().complementary_builders;
  const hero = buildFounderMatchingHero(selection);

  assert.match(hero, /Unterschied als aus Gleichlauf/);
  assert.match(hero, /wenn unter Zeitdruck entschieden werden muss/);
  assert.match(hero, /Commitment nicht jedes Mal neu aufgerollt werden muss/);
  assert.match(hero, /arbeitet ihr schnell aneinander vorbei|Dauerabstimmung/);
});

test("founder matching intro blocks are direct and tension-led for misaligned pairs", () => {
  const selection = runFounderMatchingSelectionExamples().misaligned_pressure_pair;
  const blocks = buildFounderMatchingIntroBlocks(selection);

  assert.match(blocks.hero, /Spannung ist kein Späteffekt/);
  assert.match(blocks.hero, /Präsenz, Verfügbarkeit und Zug/);
  assert.match(blocks.hero, /Unterschied in Entscheidungslogik nicht sofort wie Widerspruch/);
  assert.match(blocks.hero, /auseinanderzieht/);
  assert.equal(blocks.stableBase.title, "Keine klare Basislinie");
  assert.equal(blocks.strongestComplement.title, "Prüfung trifft Zuspitzung");
  assert.equal(blocks.biggestTension.title, "Wenn Einsatz auseinanderläuft");
});

test("founder matching builder handles high-similarity blind spot pairs", () => {
  const selection = runFounderMatchingSelectionExamples().highly_similar_but_blind_spot_pair;
  const blocks = buildFounderMatchingIntroBlocks(selection);

  assert.match(blocks.hero, /anfangs vieles erstaunlich glatt/);
  assert.equal(blocks.strongestComplement.title, "Keine klare Ergänzungsachse");
  assert.equal(blocks.biggestTension.title, "Was ihr leicht überseht");
});

test("strongest complement text becomes context-sensitive across duo types", () => {
  const examples = runFounderMatchingSelectionExamples();
  const complementary = buildFounderMatchingIntroBlocks(examples.complementary_builders);
  const misaligned = buildFounderMatchingIntroBlocks(examples.misaligned_pressure_pair);

  assert.notEqual(
    complementary.strongestComplement.body,
    misaligned.strongestComplement.body
  );
  assert.match(complementary.strongestComplement.body, /breiter machen|früher klärt/);
  assert.match(misaligned.strongestComplement.body, /wenig still trägt|nicht automatisch zur Stärke/);
});

test("daily dynamics simulates interaction instead of restating dimensions", () => {
  const selection = runFounderMatchingSelectionExamples().complementary_builders;
  const text = buildFounderMatchingDailyDynamics(selection);

  assert.match(text, /Wenn Arbeit nicht nur weiterlaufen, sondern für beide sichtbar bleiben soll/);
  assert.match(text, /arbeitet ihr oft am selben Thema, aber nicht am selben Stand|will dann früher sehen/);
  assert.match(text, /Das trägt nur|Das funktioniert nur/);
});

test("agreement builder returns direct rule sentences", () => {
  const selection = runFounderMatchingSelectionExamples().misaligned_pressure_pair;
  const agreements = buildFounderMatchingAgreements(selection);

  assert.equal(agreements.length >= 3, true);
  assert.match(agreements[0] ?? "", /Ihr braucht|Ihr solltet|Es sollte eindeutig sein/);
  assert.match(agreements.join(" "), /Einsatzniveau|Zwischenstände|Spannung|priorisiert/);
});

test("full text builder exposes daily dynamics and agreements", () => {
  const selection = runFounderMatchingSelectionExamples().balanced_but_manageable_pair;
  const full = buildFounderMatchingFullText(selection);

  assert.match(full.dailyDynamics, /Alltag/);
  assert.equal(full.agreements.length >= 3, true);
});

test("stable base block returns fallback when no stable base exists", () => {
  const block = buildStableBaseBlock(null);
  assert.equal(block.title, "Keine klare Basislinie");
});

test("founder matching text examples expose all four demo cases", () => {
  const examples = buildFounderMatchingTextExamples();

  assert.deepEqual(Object.keys(examples), [
    "complementary_builders",
    "misaligned_pressure_pair",
    "balanced_but_manageable_pair",
    "highly_similar_but_blind_spot_pair",
  ]);
});
