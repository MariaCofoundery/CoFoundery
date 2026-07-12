import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFounderValuesBlock,
  buildFounderValuesBlockExamples,
  buildFounderValuesBlockFromProfiles,
} from "@/features/reporting/founderValuesTextBuilder";
import { getValuesContent } from "@/features/reporting/content/valuesContent";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";
import {
  FOUNDER_VALUES_TEST_CASES,
  runFounderValuesSelectionExamples,
} from "@/features/reporting/founderValuesSelection";

function visibleBlockText(block: NonNullable<ReturnType<typeof buildFounderValuesBlock>>) {
  return [
    block.intro,
    block.gemeinsameBasis.title,
    block.gemeinsameBasis.body,
    block.unterschiedUnterDruck.title,
    block.unterschiedUnterDruck.body,
    block.leitplanke.title,
    block.leitplanke.body,
  ].join("\n");
}

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

test("founder values block keeps existing German copy as the default", () => {
  const block = buildFounderValuesBlock(runFounderValuesSelectionExamples().aehnliche_basis);

  assert.ok(block);
  assert.equal(
    block.intro,
    "Im Werteblock zeigt sich vor allem, woran ihr Entscheidungen unter Druck ähnlich ausrichtet."
  );
  assert.equal(block.gemeinsameBasis.title, "Folgen nicht ausblenden");
  assert.match(
    block.gemeinsameBasis.body,
    /Wenn Entscheidungen Folgen für Team, Kundschaft oder Partner haben/
  );
});

test("founder values block returns English copy for locale en", () => {
  const block = buildFounderValuesBlock(
    runFounderValuesSelectionExamples().anderer_massstab_unter_druck,
    "en"
  );

  assert.ok(block);
  assert.equal(
    block.intro,
    "The values block does not show a hard opposition, but it does show a different standard for what matters first under pressure."
  );
  assert.equal(block.unterschiedUnterDruck.title, "When firmness enters earlier");
  assert.match(block.unterschiedUnterDruck.body, /commercial firmness may enter at different moments/i);
});

test("founder values block falls back to German for unsupported locales", () => {
  const block = buildFounderValuesBlock(runFounderValuesSelectionExamples().aehnliche_basis, "fr");

  assert.ok(block);
  assert.equal(block.intro, getValuesContent("de").intros.shared_basis);
  assert.equal(block.leitplanke.title, "Eine klare Prüfschwelle");
});

test("English founder values block copy passes report copy guards", () => {
  const examples = runFounderValuesSelectionExamples();
  const visibleCopy = [
    buildFounderValuesBlock(examples.aehnliche_basis, "en"),
    buildFounderValuesBlock(examples.anderer_massstab_unter_druck, "en"),
    buildFounderValuesBlock(examples.aehnlich_mit_blind_spot, "en"),
  ]
    .filter((block): block is NonNullable<typeof block> => Boolean(block))
    .map(visibleBlockText)
    .join("\n");

  assert.deepEqual(findEnglishReportCopyQualityIssues(visibleCopy), []);
  assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleCopy), []);
});

test("values content lookup does not transform stored values payload text", () => {
  const storedValuesPreview =
    "Gespeicherter Werte-Payload-Text bleibt in der Sprache, in der der Report erzeugt wurde.";
  const payload = {
    report: {
      valuesModulePreview: storedValuesPreview,
    },
  };

  getValuesContent("en");

  assert.equal(payload.report.valuesModulePreview, storedValuesPreview);
});

test("founder values block can be built directly from self values profiles", () => {
  const block = buildFounderValuesBlockFromProfiles(
    FOUNDER_VALUES_TEST_CASES.aehnliche_basis.a,
    FOUNDER_VALUES_TEST_CASES.aehnliche_basis.b
  );

  assert.ok(block);
  assert.equal(block?.gemeinsameBasis.title.length > 0, true);
});

test("founder values block from profiles accepts locale en without changing selection inputs", () => {
  const block = buildFounderValuesBlockFromProfiles(
    FOUNDER_VALUES_TEST_CASES.aehnliche_basis.a,
    FOUNDER_VALUES_TEST_CASES.aehnliche_basis.b,
    "en"
  );

  assert.ok(block);
  assert.equal(block.gemeinsameBasis.title, "Keep consequences visible");
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
