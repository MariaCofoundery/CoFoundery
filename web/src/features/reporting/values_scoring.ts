import { VALUES_PLAYBOOK } from "@/features/reporting/constants";
import { VALUES_ARCHETYPES_DE } from "@/features/reporting/report_texts.de";
import {
  SELF_VALUES_ARCHETYPE_INTERPRETATION,
  SELF_VALUES_PAIRING_HINTS,
} from "@/features/reporting/report_texts_values_self.de";
import {
  VALUES_ARCHETYPE_ALIGNMENT_ANCHOR,
  VALUES_ARCHETYPE_ORDER,
  getValuesQuestionArchetypeId,
} from "@/features/reporting/valuesQuestionMeta";
import {
  type SelfValuesProfile,
  type ValuesArchetypeId,
} from "@/features/reporting/types";

export type ValuesAnswerForScoring = {
  questionId: string;
  choiceValue: string;
  prompt: string | null;
  dimension: string | null;
};

function parseChoiceValue(raw: string) {
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function computeValuesContinuumScore(
  profile: Pick<SelfValuesProfile, "clusterScores"> | null | undefined
): number | null {
  if (!profile) return null;

  const weighted = VALUES_ARCHETYPE_ORDER.reduce(
    (acc, archetypeId) => {
      const rawWeight = profile.clusterScores[archetypeId];
      const weight = Number.isFinite(rawWeight) ? Math.max(rawWeight, 0) : 0;
      acc.weightedSum += VALUES_ARCHETYPE_ALIGNMENT_ANCHOR[archetypeId] * weight;
      acc.weight += weight;
      return acc;
    },
    { weightedSum: 0, weight: 0 }
  );

  if (weighted.weight <= 0) return null;
  return round(weighted.weightedSum / weighted.weight);
}

function lowerFirst(value: string) {
  if (!value) return value;
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function archetypeLabel(archetypeId: ValuesArchetypeId) {
  return VALUES_ARCHETYPES_DE[archetypeId].name;
}

function pairingHint(
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null
) {
  if (!secondaryArchetypeId) {
    return `Dein Profil ist aktuell klar von ${archetypeLabel(primaryArchetypeId)} geprägt.`;
  }
  return SELF_VALUES_PAIRING_HINTS[`${primaryArchetypeId}|${secondaryArchetypeId}`];
}

export function scoreSelfValuesProfile(
  answers: ValuesAnswerForScoring[],
  valuesTotal: number
): SelfValuesProfile | null {
  if (answers.length === 0) return null;

  const scoreBuckets = VALUES_ARCHETYPE_ORDER.reduce(
    (acc, archetypeId) => {
      acc[archetypeId] = { weightedSum: 0, weight: 0 };
      return acc;
    },
    {} as Record<ValuesArchetypeId, { weightedSum: number; weight: number }>
  );

  let answered = 0;
  for (const answer of answers) {
    const numeric = parseChoiceValue(answer.choiceValue);
    if (numeric == null) continue;
    const archetype = getValuesQuestionArchetypeId(answer.questionId);
    if (!archetype) continue;
    answered += 1;
    scoreBuckets[archetype].weightedSum += numeric;
    scoreBuckets[archetype].weight += 1;
  }

  if (answered === 0) return null;

  const clusterScores = VALUES_ARCHETYPE_ORDER.reduce(
    (acc, archetypeId) => {
      const bucket = scoreBuckets[archetypeId];
      acc[archetypeId] =
        bucket.weight > 0 ? round(bucket.weightedSum / bucket.weight) : 0;
      return acc;
    },
    {} as Record<ValuesArchetypeId, number>
  );

  const ranked = [...VALUES_ARCHETYPE_ORDER]
    .map((archetypeId) => ({
      archetypeId,
      score: clusterScores[archetypeId],
      order: VALUES_ARCHETYPE_ORDER.indexOf(archetypeId),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });

  const primaryArchetypeId = ranked[0]?.archetypeId ?? "verantwortungs_stratege";
  const secondaryArchetypeId = ranked[1] && ranked[1].score > 0 ? ranked[1].archetypeId : null;
  const primaryLabel = archetypeLabel(primaryArchetypeId);
  const secondaryLabel = secondaryArchetypeId ? archetypeLabel(secondaryArchetypeId) : null;

  const primaryValuesText = VALUES_ARCHETYPES_DE[primaryArchetypeId];
  const primaryPlaybook = VALUES_PLAYBOOK[primaryArchetypeId];
  const secondaryValuesText = secondaryArchetypeId ? VALUES_ARCHETYPES_DE[secondaryArchetypeId] : null;
  const secondaryInterpretation = secondaryArchetypeId
    ? SELF_VALUES_ARCHETYPE_INTERPRETATION[secondaryArchetypeId]
    : null;

  const summarySentences = [
    `Dein Werteprofil zeigt derzeit als stärkste Ausprägung ${primaryLabel}. ${primaryValuesText.identity}`,
    pairingHint(primaryArchetypeId, secondaryArchetypeId),
    secondaryInterpretation
      ? `Als zweiter Schwerpunkt ist ${secondaryLabel} erkennbar. ${secondaryInterpretation.founderMeaning}`
      : "Deine Antworten zeichnen ein konsistentes, klar fokussiertes Werteprofil.",
  ];

  const primaryInterpretation = SELF_VALUES_ARCHETYPE_INTERPRETATION[primaryArchetypeId];
  const insights = [
    `Stärkster Schwerpunkt: ${primaryLabel}. ${primaryInterpretation.founderMeaning}`,
    `Umsetzungshebel: ${primaryInterpretation.operatingLeverage}`,
    secondaryInterpretation
      ? `Ergänzende Stärke: ${secondaryLabel}. ${secondaryInterpretation.operatingLeverage}`
      : `Profilstabilität: ${primaryPlaybook.identity}`,
  ];

  const watchouts = [
    primaryInterpretation.watchout,
    secondaryValuesText
      ? `Achte außerdem darauf, dass ${lowerFirst(secondaryValuesText.warning)}`
      : `Achte außerdem darauf, dass ${lowerFirst(primaryPlaybook.warning)}`,
  ];

  return {
    primaryArchetypeId,
    secondaryArchetypeId,
    primaryLabel,
    secondaryLabel,
    summary: summarySentences.join(" "),
    insights,
    watchouts,
    answered,
    total: valuesTotal > 0 ? valuesTotal : answered,
    clusterScores,
  };
}
