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
    return `Dein Profil setzt aktuell relativ klar einen Schwerpunkt darin, woran du Entscheidungen zuerst festmachst.`;
  }
  return SELF_VALUES_PAIRING_HINTS[`${primaryArchetypeId}|${secondaryArchetypeId}`];
}

type ValuesSignalStrength = "balanced" | "mixed" | "clear" | "dominant";

function classifySignalStrength(
  clusterScores: Record<ValuesArchetypeId, number>,
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null
): ValuesSignalStrength {
  const orderedScores = [...VALUES_ARCHETYPE_ORDER]
    .map((archetypeId) => clusterScores[archetypeId] ?? 0)
    .sort((a, b) => b - a);
  const top = orderedScores[0] ?? 0;
  const second = orderedScores[1] ?? 0;
  const third = orderedScores[2] ?? 0;
  const gap = round(top - second);
  const spread = round(top - third);

  if (spread <= 0.35) {
    return "balanced";
  }

  if (secondaryArchetypeId && gap <= 0.45) {
    return "mixed";
  }

  if (gap >= 0.8) {
    return "dominant";
  }

  return "clear";
}

function buildSummary(
  primaryInterpretation: (typeof SELF_VALUES_ARCHETYPE_INTERPRETATION)[ValuesArchetypeId],
  secondaryInterpretation:
    | (typeof SELF_VALUES_ARCHETYPE_INTERPRETATION)[ValuesArchetypeId]
    | null,
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null,
  signalStrength: ValuesSignalStrength
) {
  switch (signalStrength) {
    case "balanced":
      return [
        `Deine Antworten setzen keinen harten Schwerpunkt. Je nach Situation sortierst du Entscheidungen etwas unterschiedlich: mal eher über ${primaryInterpretation.counterweightLabel}, mal stärker über ${secondaryInterpretation?.counterweightLabel ?? "andere Folgen und Nebenwirkungen"}.`,
        "Das wirkt nicht beliebig, aber auch nicht auf nur eine feste Linie festgelegt.",
      ];
    case "mixed":
      return [
        `Am ehesten ziehst du zu Entscheidungen, in denen ${primaryInterpretation.counterweightLabel} zuerst zählen. Gleichzeitig verlierst du ${secondaryInterpretation?.counterweightLabel ?? "eine zweite, spürbare Perspektive"} nicht aus dem Blick.`,
        pairingHint(primaryArchetypeId, secondaryArchetypeId),
      ];
    case "dominant":
      return [
        primaryInterpretation.lead,
        "Andere Erwägungen blendest du nicht aus, ordnest sie unter Druck aber meist diesem Zug zuerst unter.",
      ];
    case "clear":
    default:
      return [
        primaryInterpretation.lead,
        secondaryInterpretation
          ? `Gleichzeitig bleibt bei dir sichtbar im Blick, was ${lowerFirst(secondaryInterpretation.counterweightLabel)} für eine Entscheidung bedeutet.`
          : pairingHint(primaryArchetypeId, secondaryArchetypeId),
      ];
  }
}

function buildInsights(
  primaryInterpretation: (typeof SELF_VALUES_ARCHETYPE_INTERPRETATION)[ValuesArchetypeId],
  secondaryInterpretation:
    | (typeof SELF_VALUES_ARCHETYPE_INTERPRETATION)[ValuesArchetypeId]
    | null,
  signalStrength: ValuesSignalStrength
) {
  const first = primaryInterpretation.decisionPattern;

  if (signalStrength === "balanced") {
    return [
      first,
      `Je nach Lage kippt dieselbe Entscheidung bei dir etwas anders: mal eher in Richtung ${primaryInterpretation.counterweightLabel}, mal stärker in Richtung ${secondaryInterpretation?.counterweightLabel ?? "einer zweiten Perspektive"}.`,
      "Hilfreich ist, vor wichtigen Entscheidungen kurz zu benennen, was diesmal zuerst zählen soll.",
    ];
  }

  if (signalStrength === "mixed") {
    return [
      first,
      `Gerade in knappen Situationen merkst du, dass auch ${secondaryInterpretation?.counterweightLabel ?? "eine zweite Perspektive"} bei dir mitspielt. Dadurch werden Entscheidungen oft differenzierter, aber nicht automatisch leichter.`,
      "Hilfreich ist, vor heiklen Entscheidungen kurz festzuhalten, was diesmal zuerst zählen soll.",
    ];
  }

  return [
    first,
    primaryInterpretation.uncertaintyPattern,
    primaryInterpretation.operatingLeverage,
  ];
}

function buildWatchouts(
  primaryInterpretation: (typeof SELF_VALUES_ARCHETYPE_INTERPRETATION)[ValuesArchetypeId],
  secondaryInterpretation:
    | (typeof SELF_VALUES_ARCHETYPE_INTERPRETATION)[ValuesArchetypeId]
    | null,
  signalStrength: ValuesSignalStrength
) {
  if (signalStrength === "balanced") {
    return [
      "Kritisch wird es, wenn du situativ unterschiedlich priorisierst, das im Team aber wie eine feste Linie bei dir gelesen wird.",
      "Gerade bei Entscheidungen unter Zeitdruck hilft es, die Reihenfolge deiner Prioritäten vorher kurz sichtbar zu machen.",
    ];
  }

  if (signalStrength === "mixed") {
    return [
      "Kritisch wird es weniger bei den einzelnen Prioritäten als bei ihrer Reihenfolge. Unter Druck sollte für dich klar sein, was im Zweifel zuerst zählt.",
      secondaryInterpretation
        ? `Sonst wirkt es schnell so, als ob ${lowerFirst(
            secondaryInterpretation.counterweightLabel
          )} zwar wichtig ist, am Ende aber doch nur am Rand mitläuft.`
        : "Sonst wird für andere schnell schwer lesbar, woran du die Entscheidung am Ende festmachst.",
    ];
  }

  return [
    primaryInterpretation.tensionField,
    secondaryInterpretation
      ? `Gerade unter Druck lohnt es sich außerdem, nicht zu spät sichtbar zu machen, wie stark ${lowerFirst(
          secondaryInterpretation.counterweightLabel
        )} für dich trotzdem mitläuft.`
      : `Unter Druck hilft es, die eigene Linie früh auszusprechen, bevor andere nur noch das Ergebnis deiner Entscheidung sehen.`,
  ];
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
  const secondaryInterpretation = secondaryArchetypeId
    ? SELF_VALUES_ARCHETYPE_INTERPRETATION[secondaryArchetypeId]
    : null;
  const primaryInterpretation = SELF_VALUES_ARCHETYPE_INTERPRETATION[primaryArchetypeId];
  const signalStrength = classifySignalStrength(
    clusterScores,
    primaryArchetypeId,
    secondaryArchetypeId
  );

  const summarySentences = buildSummary(
    primaryInterpretation,
    secondaryInterpretation,
    primaryArchetypeId,
    secondaryArchetypeId,
    signalStrength
  );
  const insights = buildInsights(primaryInterpretation, secondaryInterpretation, signalStrength);
  const watchouts = buildWatchouts(primaryInterpretation, secondaryInterpretation, signalStrength);

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
