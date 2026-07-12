import {
  buildFounderValuesSelection,
  FOUNDER_VALUES_TEST_CASES,
  runFounderValuesSelectionExamples,
  type FounderValuesSelection,
  type FounderValuesSelectionEntry,
} from "@/features/reporting/founderValuesSelection";
import {
  getValuesContent,
  type ValuesContent,
} from "@/features/reporting/content/valuesContent";
import type { SelfValuesProfile } from "@/features/reporting/types";

export type FounderValuesBlockSection = {
  title: string;
  body: string;
};

export type FounderValuesBlock = {
  intro: string;
  gemeinsameBasis: FounderValuesBlockSection;
  unterschiedUnterDruck: FounderValuesBlockSection;
  leitplanke: FounderValuesBlockSection;
};

function buildIntro(selection: FounderValuesSelection, content: ValuesContent) {
  return content.intros[selection.meta.pattern];
}

function buildBasisBody(entry: FounderValuesSelectionEntry, content: ValuesContent) {
  return content.basisBodies[entry.themeId];
}

function buildDifferenceBody(selection: FounderValuesSelection, content: ValuesContent) {
  const { unterschiedUnterDruck } = selection;
  const copy = content.differenceBodies[unterschiedUnterDruck.themeId];

  return unterschiedUnterDruck.level === "clear" ? copy.clear : copy.default;
}

function buildDifferenceFollowUp(selection: FounderValuesSelection, content: ValuesContent) {
  return content.differenceFollowUps[selection.unterschiedUnterDruck.level];
}

function buildLeitplankeBody(selection: FounderValuesSelection, content: ValuesContent) {
  const entry = selection.leitplanke;
  return content.guardrailBodies[entry.mode][entry.themeId];
}

export function buildFounderValuesBlock(
  selection: FounderValuesSelection | null | undefined,
  locale?: string | null
): FounderValuesBlock | null {
  if (!selection) return null;
  const content = getValuesContent(locale);

  return {
    intro: buildIntro(selection, content),
    gemeinsameBasis: {
      title: content.basisTitles[selection.gemeinsameBasis.themeId],
      body: buildBasisBody(selection.gemeinsameBasis, content),
    },
    unterschiedUnterDruck: {
      title: content.differenceTitles[selection.unterschiedUnterDruck.themeId],
      body: `${buildDifferenceBody(selection, content)} ${buildDifferenceFollowUp(selection, content)}`,
    },
    leitplanke: {
      title: content.guardrailTitles[selection.leitplanke.themeId],
      body: buildLeitplankeBody(selection, content),
    },
  };
}

export function buildFounderValuesBlockFromProfiles(
  valuesProfileA: SelfValuesProfile | null | undefined,
  valuesProfileB: SelfValuesProfile | null | undefined,
  locale?: string | null
) {
  return buildFounderValuesBlock(buildFounderValuesSelection(valuesProfileA, valuesProfileB), locale);
}

export function buildFounderValuesBlockExamples() {
  const selections = runFounderValuesSelectionExamples();

  return {
    aehnliche_basis: buildFounderValuesBlock(selections.aehnliche_basis),
    anderer_massstab_unter_druck: buildFounderValuesBlock(selections.anderer_massstab_unter_druck),
    aehnlich_mit_blind_spot: buildFounderValuesBlock(selections.aehnlich_mit_blind_spot),
  };
}

export function buildFounderValuesBlockExampleProfiles() {
  return {
    aehnliche_basis: buildFounderValuesBlockFromProfiles(
      FOUNDER_VALUES_TEST_CASES.aehnliche_basis.a,
      FOUNDER_VALUES_TEST_CASES.aehnliche_basis.b
    ),
    anderer_massstab_unter_druck: buildFounderValuesBlockFromProfiles(
      FOUNDER_VALUES_TEST_CASES.anderer_massstab_unter_druck.a,
      FOUNDER_VALUES_TEST_CASES.anderer_massstab_unter_druck.b
    ),
    aehnlich_mit_blind_spot: buildFounderValuesBlockFromProfiles(
      FOUNDER_VALUES_TEST_CASES.aehnlich_mit_blind_spot.a,
      FOUNDER_VALUES_TEST_CASES.aehnlich_mit_blind_spot.b
    ),
  };
}
