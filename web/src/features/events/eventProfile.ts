import { EVENT_CORE_QUESTIONS } from "@/features/events/eventQuestions";
import type {
  EventAnswer,
  EventParticipant,
  EventProfile,
  EventProfileScale,
  EventProfileScaleKey,
} from "@/features/events/eventTypes";
import type { DimensionId } from "@/features/scoring/founderCompatibilityRegistry";

type EventProfileScaleDefinition = {
  key: EventProfileScaleKey;
  label: string;
  questionKeys: string[];
  lowLabel: string;
  balancedLabel: string;
  highLabel: string;
};

const EVENT_PROFILE_SCALE_DEFINITIONS: readonly EventProfileScaleDefinition[] = [
  {
    key: "vision_ambition",
    label: "Vision & Ambition",
    questionKeys: ["core_vision_ambition", "core_vision_time_horizon"],
    lowLabel: "langfristig und fokussiert aufbauen",
    balancedLabel: "balanciert zwischen Aufbau und Hebel",
    highLabel: "stark wachstums- und exit-orientiert",
  },
  {
    key: "tempo",
    label: "Tempo",
    questionKeys: ["core_execution_tempo"],
    lowLabel: "eher bedacht und schrittweise",
    balancedLabel: "mit gutem Zug",
    highLabel: "sehr schnell und offensiv",
  },
  {
    key: "risk",
    label: "Risikobereitschaft",
    questionKeys: ["core_risk_orientation"],
    lowLabel: "eher abgesichert",
    balancedLabel: "bewusst abwaegend",
    highLabel: "mutig und risikofreudig",
  },
  {
    key: "structure_roles",
    label: "Rollen & Struktur",
    questionKeys: ["core_role_clarity"],
    lowLabel: "eher gemeinsam entwickelnd",
    balancedLabel: "teils klar, teils flexibel",
    highLabel: "stark strukturiert",
  },
  {
    key: "sync",
    label: "Abstimmung im Alltag",
    questionKeys: ["core_visibility_sync"],
    lowLabel: "viel Autonomie",
    balancedLabel: "gut ausbalanciert",
    highLabel: "enge Abstimmung wichtig",
  },
  {
    key: "conflict_decision",
    label: "Konflikt & Entscheidung",
    questionKeys: ["core_decision_speed", "core_conflict_addressing"],
    lowLabel: "eher bedaechtig und vorsichtig",
    balancedLabel: "direkt, aber dosiert",
    highLabel: "frueh und klar ansprechend",
  },
] as const;

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getBandForScore(score: number): EventProfileScale["band"] {
  if (score <= 33) return "low";
  if (score >= 67) return "high";
  return "balanced";
}

function getBandLabel(definition: EventProfileScaleDefinition, band: EventProfileScale["band"]) {
  switch (band) {
    case "low":
      return definition.lowLabel;
    case "high":
      return definition.highLabel;
    default:
      return definition.balancedLabel;
  }
}

function getScaleDefinition(scaleKey: EventProfileScaleKey) {
  return EVENT_PROFILE_SCALE_DEFINITIONS.find((definition) => definition.key === scaleKey) ?? null;
}

function getScoreForQuestionKey(answers: EventAnswer[], questionKey: string) {
  return answers.find((answer) => answer.questionKey === questionKey)?.answerValue ?? null;
}

function buildDimensionScores(answers: EventAnswer[]) {
  const dimensionBuckets = new Map<DimensionId, number[]>();

  for (const question of EVENT_CORE_QUESTIONS) {
    if (question.kind !== "core") continue;

    const answerValue = getScoreForQuestionKey(answers, question.key);
    if (answerValue == null) continue;

    const existing = dimensionBuckets.get(question.dimensionId) ?? [];
    dimensionBuckets.set(question.dimensionId, [...existing, answerValue]);
  }

  return Object.fromEntries(
    Array.from(dimensionBuckets.entries()).map(([dimensionId, values]) => [dimensionId, mean(values)])
  ) as Partial<Record<DimensionId, number | null>>;
}

function buildScales(answers: EventAnswer[]): EventProfileScale[] {
  return EVENT_PROFILE_SCALE_DEFINITIONS.map((definition) => {
    const values = definition.questionKeys
      .map((questionKey) => getScoreForQuestionKey(answers, questionKey))
      .filter((value): value is NonNullable<ReturnType<typeof getScoreForQuestionKey>> => value != null);
    const score = mean(values);
    const band = getBandForScore(score);

    return {
      key: definition.key,
      label: definition.label,
      score,
      band,
      bandLabel: getBandLabel(definition, band),
    };
  });
}

export function deriveEventProfile(params: {
  participant: EventParticipant;
  answers: EventAnswer[];
}): EventProfile {
  return {
    participantId: params.participant.id,
    displayName: params.participant.displayName,
    completedAt: params.participant.assessmentCompletedAt,
    dimensionScores: buildDimensionScores(params.answers),
    scales: buildScales(params.answers),
  };
}

export function getEventScaleSemanticLabel(scaleKey: EventProfileScaleKey, score: number) {
  const definition = getScaleDefinition(scaleKey);
  if (!definition) {
    return "";
  }

  return getBandLabel(definition, getBandForScore(score));
}
