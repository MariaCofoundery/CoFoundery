import {
  buildFounderMatchingSelectionFromScores,
  runFounderMatchingSelectionExamples,
  type FounderMatchingSelection,
  type MatchingSelectionEntry,
} from "@/features/reporting/founderMatchingSelection";
import type { FounderScores } from "@/features/reporting/founderMatchingEngine";
import {
  buildMatchingComplementSentences,
  buildMatchingTensionSentences,
  getMatchingHeroInteractionSentence,
  getMatchingAgreementSentence,
  getMatchingBiggestRiskSentence,
  getMatchingConditionSentence,
  getMatchingDynamicsConditionSentence,
  getMatchingDynamicsConsequenceSentence,
  getMatchingDynamicsInteractionSentence,
  getMatchingDynamicsSituationSentence,
  getMatchingDynamicsThirdSentence,
  getMatchingGroundArenaSentence,
  getPrimaryMatchingInteractionPattern,
  getMatchingStrongestQualitySentence,
  MATCHING_BASE_SENTENCES,
  MATCHING_BASE_TITLES,
  MATCHING_COMPLEMENT_TITLES,
  MATCHING_FALLBACK_BLOCKS,
  MATCHING_TENSION_TITLES,
} from "@/features/reporting/founderMatchingTextBlocks";

export type FounderMatchingBlock = {
  title: string;
  body: string;
};

export type FounderMatchingIntroBlocks = {
  hero: string;
  stableBase: FounderMatchingBlock;
  strongestComplement: FounderMatchingBlock;
  biggestTension: FounderMatchingBlock;
};

export type FounderMatchingFullText = FounderMatchingIntroBlocks & {
  dailyDynamics: string;
  agreements: string[];
};

function sentencesToParagraph(sentences: string[]) {
  return sentences.join(" ");
}

function buildFallbackBlock(title: string, body: string): FounderMatchingBlock {
  return { title, body };
}

export function buildFounderMatchingHero(selection: FounderMatchingSelection): string {
  const { groundDynamic, strongestQuality, biggestRisk } = selection.heroSelection;
  const primaryPattern = getPrimaryMatchingInteractionPattern(selection);

  const firstSentence =
    selection.heroSelection.mode === "blind_spot_watch"
      ? "Bei euch wirkt anfangs vieles klarer, als es später ist."
      : selection.heroSelection.mode === "tension_led"
        ? "Bei euch beginnt Reibung nicht spät. Sie sitzt früh im Arbeitsalltag."
      : selection.heroSelection.mode === "complement_led"
          ? "Bei euch liegt die Chance in einem Unterschied, der nützlich sein kann. Von selbst trägt er nicht."
          : selection.heroSelection.mode === "coordination_led"
            ? "Bei euch kippt wenig offen. Ihr verliert eher Zeit, weil Abstimmung still mehr zieht, als ihr denkt."
            : "Bei euch gibt es eine gemeinsame Linie. Das senkt offene Reibung, macht Randthemen aber nicht automatisch klar.";

  const secondSentence = getMatchingGroundArenaSentence(groundDynamic);
  const thirdSentence = getMatchingStrongestQualitySentence(strongestQuality);
  const fourthSentence = getMatchingBiggestRiskSentence(
    biggestRisk,
    selection.meta.highSimilarityBlindSpotRisk
  );
  const fifthSentence = getMatchingHeroInteractionSentence(selection, primaryPattern);
  const sixthSentence = getMatchingConditionSentence(
    selection,
    groundDynamic,
    strongestQuality,
    biggestRisk
  );

  return [
    firstSentence,
    secondSentence,
    thirdSentence,
    fourthSentence,
    fifthSentence,
    sixthSentence,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildStableBaseBlock(stableBase: MatchingSelectionEntry | null): FounderMatchingBlock {
  if (!stableBase) {
    return buildFallbackBlock(
      MATCHING_FALLBACK_BLOCKS.stableBase.title,
      MATCHING_FALLBACK_BLOCKS.stableBase.body
    );
  }

  return {
    title: MATCHING_BASE_TITLES[stableBase.dimension],
    body: sentencesToParagraph(MATCHING_BASE_SENTENCES[stableBase.dimension]),
  };
}

export function buildStrongestComplementBlock(
  strongestComplement: MatchingSelectionEntry | null,
  selection?: FounderMatchingSelection
): FounderMatchingBlock {
  if (!strongestComplement) {
    return buildFallbackBlock(
      MATCHING_FALLBACK_BLOCKS.strongestComplement.title,
      MATCHING_FALLBACK_BLOCKS.strongestComplement.body
    );
  }

  return {
    title: MATCHING_COMPLEMENT_TITLES[strongestComplement.dimension],
    body: sentencesToParagraph(buildMatchingComplementSentences(strongestComplement, selection)),
  };
}

export function buildBiggestTensionBlock(
  biggestTension: MatchingSelectionEntry | null,
  selection?: FounderMatchingSelection
): FounderMatchingBlock {
  if (!biggestTension) {
    return buildFallbackBlock(
      MATCHING_FALLBACK_BLOCKS.biggestTension.title,
      MATCHING_FALLBACK_BLOCKS.biggestTension.body
    );
  }

  if (biggestTension.status === "nah") {
    return buildFallbackBlock(
      MATCHING_FALLBACK_BLOCKS.blindSpot.title,
      MATCHING_FALLBACK_BLOCKS.blindSpot.body
    );
  }

  return {
    title: MATCHING_TENSION_TITLES[biggestTension.dimension],
    body: sentencesToParagraph(buildMatchingTensionSentences(biggestTension, selection)),
  };
}

export function buildFounderMatchingIntroBlocks(
  selection: FounderMatchingSelection
): FounderMatchingIntroBlocks {
  return {
    hero: buildFounderMatchingHero(selection),
    stableBase: buildStableBaseBlock(selection.stableBase),
    strongestComplement: buildStrongestComplementBlock(selection.strongestComplement, selection),
    biggestTension: buildBiggestTensionBlock(selection.biggestTension, selection),
  };
}

export function buildFounderMatchingDailyDynamics(selection: FounderMatchingSelection): string {
  const primaryPattern = getPrimaryMatchingInteractionPattern(selection);
  const sentences = [
    getMatchingDynamicsSituationSentence(selection),
    getMatchingDynamicsInteractionSentence(
      selection.dailyDynamicsDimensions[0],
      selection.dailyDynamicsDimensions[1],
      primaryPattern
    ),
    getMatchingDynamicsConsequenceSentence(selection, primaryPattern),
    getMatchingDynamicsThirdSentence(selection),
    getMatchingDynamicsConditionSentence(selection, primaryPattern),
  ].filter(Boolean) as string[];

  return sentences.join(" ");
}

export function buildFounderMatchingAgreements(
  selection: FounderMatchingSelection
): string[] {
  return selection.agreementFocusDimensions
    .slice(0, 5)
    .map((entry) => getMatchingAgreementSentence(entry));
}

export function buildFounderMatchingIntroBlocksFromScores(
  a: FounderScores,
  b: FounderScores
): FounderMatchingIntroBlocks {
  return buildFounderMatchingIntroBlocks(buildFounderMatchingSelectionFromScores(a, b));
}

export function buildFounderMatchingFullText(
  selection: FounderMatchingSelection
): FounderMatchingFullText {
  return {
    ...buildFounderMatchingIntroBlocks(selection),
    dailyDynamics: buildFounderMatchingDailyDynamics(selection),
    agreements: buildFounderMatchingAgreements(selection),
  };
}

export function buildFounderMatchingTextExamples() {
  const examples = runFounderMatchingSelectionExamples();

  return {
    complementary_builders: buildFounderMatchingFullText(examples.complementary_builders),
    misaligned_pressure_pair: buildFounderMatchingFullText(examples.misaligned_pressure_pair),
    balanced_but_manageable_pair: buildFounderMatchingFullText(examples.balanced_but_manageable_pair),
    highly_similar_but_blind_spot_pair: buildFounderMatchingFullText(
      examples.highly_similar_but_blind_spot_pair
    ),
  };
}
