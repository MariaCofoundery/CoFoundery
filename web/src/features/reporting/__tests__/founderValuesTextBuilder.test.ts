import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderValuesBlock,
  buildFounderValuesBlockExamples,
  buildFounderValuesBlockFromProfiles,
} from "@/features/reporting/founderValuesTextBuilder";
import {
  FOUNDER_VALUES_TEST_CASES,
  runFounderValuesSelectionExamples,
} from "@/features/reporting/founderValuesSelection";

test("founder values selection exposes the three example constellations", () => {
  const examples = runFounderValuesSelectionExamples();

  assert.deepEqual(Object.keys(examples), [
    "aehnliche_basis",
    "anderer_massstab_unter_druck",
    "aehnlich_mit_blind_spot",
  ]);
  assert.equal(examples.aehnliche_basis?.meta.pattern, "shared_basis");
  assert.equal(examples.anderer_massstab_unter_druck?.meta.pattern, "clear_difference");
  assert.equal(examples.aehnlich_mit_blind_spot?.meta.pattern, "blind_spot_watch");
});

test("founder values block stays restrained and avoids archetype labels", () => {
  const block = buildFounderValuesBlock(runFounderValuesSelectionExamples().anderer_massstab_unter_druck);

  assert.ok(block);
  const visibleText = [block?.intro, block?.gemeinsameBasis.body, block?.unterschiedUnterDruck.body, block?.leitplanke.body]
    .filter(Boolean)
    .join(" ");

  assert.doesNotMatch(visibleText, /impact_idealist|verantwortungs_stratege|business_pragmatiker/i);
  assert.doesNotMatch(visibleText, /wertekonflikt|dieselben werte|match score|prozent/i);
  assert.match(block?.unterschiedUnterDruck.body ?? "", /Runway|Ergebnis|Nebenfolgen|Team|Kundschaft/);
});

test("founder values block uses cautious wording for blind-spot pairs", () => {
  const block = buildFounderValuesBlock(runFounderValuesSelectionExamples().aehnlich_mit_blind_spot);

  assert.ok(block);
  assert.match(block?.intro ?? "", /ähnlich voraussetzt|leicht nicht mehr aussprecht/);
  assert.match(block?.leitplanke.body ?? "", /Gerade weil ihr hier ähnlich priorisiert|Gerade weil ihr hier ähnlich schaut/);
});

test("founder values block can be built directly from self values profiles", () => {
  const block = buildFounderValuesBlockFromProfiles(
    FOUNDER_VALUES_TEST_CASES.aehnliche_basis.a,
    FOUNDER_VALUES_TEST_CASES.aehnliche_basis.b
  );

  assert.ok(block);
  assert.equal(block?.gemeinsameBasis.title.length > 0, true);
});

test("founder values block examples expose all three report scenarios", () => {
  const examples = buildFounderValuesBlockExamples();

  assert.deepEqual(Object.keys(examples), [
    "aehnliche_basis",
    "anderer_massstab_unter_druck",
    "aehnlich_mit_blind_spot",
  ]);
  assert.ok(examples.aehnliche_basis);
  assert.equal(examples.aehnliche_basis.unterschiedUnterDruck.title.length > 0, true);
});
