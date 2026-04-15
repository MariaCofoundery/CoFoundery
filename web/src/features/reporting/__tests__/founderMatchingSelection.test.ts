import assert from "node:assert/strict";
import test from "node:test";
import {
  compareFounders,
  FOUNDER_MATCHING_TEST_CASES,
} from "@/features/reporting/founderMatchingEngine";
import {
  buildFounderMatchingSelection,
  runFounderMatchingSelectionExamples,
} from "@/features/reporting/founderMatchingSelection";

test("buildFounderMatchingSelection prefers complement-led hero for complementary builders", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      FOUNDER_MATCHING_TEST_CASES.complementary_builders.a,
      FOUNDER_MATCHING_TEST_CASES.complementary_builders.b
    )
  );

  assert.equal(selection.heroSelection.mode, "complement_led");
  assert.equal(selection.heroSelection.groundDynamic?.dimension, "Unternehmenslogik");
  assert.equal(selection.stableBase?.dimension, "Konfliktstil");
  assert.equal(selection.strongestComplement?.dimension, "Unternehmenslogik");
  assert.equal(selection.biggestTension?.dimension, "Arbeitsstruktur & Zusammenarbeit");
  assert.deepEqual(
    selection.dailyDynamicsDimensions.map((entry) => entry.dimension),
    ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"]
  );
});

test("buildFounderMatchingSelection becomes tension-led for critically misaligned pairs", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.a,
      FOUNDER_MATCHING_TEST_CASES.misaligned_pressure_pair.b
    )
  );

  assert.equal(selection.heroSelection.mode, "tension_led");
  assert.equal(selection.heroSelection.groundDynamic?.dimension, "Unternehmenslogik");
  assert.equal(selection.biggestTension?.dimension, "Unternehmenslogik");
  assert.equal(selection.strongestComplement?.dimension, "Risikoorientierung");
  assert.ok(
    selection.agreementFocusDimensions
      .slice(0, 3)
      .every((entry) => entry.status === "kritisch" || entry.status === "abstimmung_nötig")
  );
});

test("buildFounderMatchingSelection reads fully mid-range pairs as alignment-led instead of forcing false complexity", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.a,
      FOUNDER_MATCHING_TEST_CASES.balanced_but_manageable_pair.b
    )
  );

  assert.equal(selection.meta.balancedButManageable, false);
  assert.equal(selection.meta.highSimilarityBlindSpotRisk, false);
  assert.equal(selection.strongestComplement, null);
  assert.equal(selection.biggestTension, null);
  assert.equal(selection.stableBase?.dimension, "Commitment");
});

test("buildFounderMatchingSelection flags high-similarity blind spot pairs", () => {
  const selection = buildFounderMatchingSelection(
    compareFounders(
      FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.a,
      FOUNDER_MATCHING_TEST_CASES.highly_similar_but_blind_spot_pair.b
    )
  );

  assert.equal(selection.meta.highSimilarityBlindSpotRisk, true);
  assert.equal(selection.heroSelection.mode, "blind_spot_watch");
  assert.equal(selection.biggestTension?.status, "nah");
  assert.equal(selection.agreementFocusDimensions.length >= 3, true);
});

test("runFounderMatchingSelectionExamples exposes all report selection demo cases", () => {
  const examples = runFounderMatchingSelectionExamples();

  assert.deepEqual(Object.keys(examples), [
    "complementary_builders",
    "misaligned_pressure_pair",
    "balanced_but_manageable_pair",
    "highly_similar_but_blind_spot_pair",
  ]);
});
