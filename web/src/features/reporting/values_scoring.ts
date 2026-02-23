import { VALUES_PLAYBOOK } from "@/features/reporting/constants";
import { VALUES_ARCHETYPES_DE } from "@/features/reporting/report_texts.de";
import {
  SELF_VALUES_ARCHETYPE_INTERPRETATION,
  SELF_VALUES_PAIRING_HINTS,
} from "@/features/reporting/report_texts_values_self.de";
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

const ARCHETYPE_ORDER: ValuesArchetypeId[] = [
  "impact_idealist",
  "verantwortungs_stratege",
  "business_pragmatiker",
];

const ARCHETYPE_ALIGNMENT_ANCHOR: Record<ValuesArchetypeId, number> = {
  impact_idealist: 1,
  verantwortungs_stratege: 3.5,
  business_pragmatiker: 6,
};

// Known/legacy ids; fallback is keyword-based prompt matching.
const QUESTION_ID_CLUSTER_MAP: Record<string, ValuesArchetypeId> = {
  qv_1: "impact_idealist",
  qv_2: "impact_idealist",
  qv_3: "verantwortungs_stratege",
  qv_4: "verantwortungs_stratege",
  qv_5: "business_pragmatiker",
  qv_6: "business_pragmatiker",
  qv_7: "impact_idealist",
  qv_8: "verantwortungs_stratege",
  qv_9: "business_pragmatiker",
  qv_10: "verantwortungs_stratege",
  d1_q1: "impact_idealist",
  d1_q2: "business_pragmatiker",
  d1_q3: "impact_idealist",
  d1_q4: "verantwortungs_stratege",
  d1_q5: "verantwortungs_stratege",
  d1_q6: "impact_idealist",
};

const QUESTION_ID_CLUSTER_PATTERNS: Array<{
  pattern: RegExp;
  archetype: ValuesArchetypeId;
}> = [
  { pattern: /(impact|ethic|werte|purpose|fair|transparen)/i, archetype: "impact_idealist" },
  { pattern: /(verantwort|respons|balance|integrit|stakeholder)/i, archetype: "verantwortungs_stratege" },
  { pattern: /(business|profit|growth|scale|umsatz|effizienz|runway|marge)/i, archetype: "business_pragmatiker" },
];

const KEYWORD_ARCHETYPE_MAP: Array<{
  keywords: string[];
  archetype: ValuesArchetypeId;
}> = [
  {
    archetype: "impact_idealist",
    keywords: [
      "wirkung",
      "impact",
      "purpose",
      "sinn",
      "ethik",
      "integritat",
      "fair",
      "transparenz",
      "vertrauen",
      "werte",
    ],
  },
  {
    archetype: "verantwortungs_stratege",
    keywords: [
      "verantwort",
      "langfrist",
      "nachhalt",
      "balance",
      "kultur",
      "kompromiss",
      "team",
      "stakeholder",
      "zumutbarkeit",
    ],
  },
  {
    archetype: "business_pragmatiker",
    keywords: [
      "gewinn",
      "profit",
      "umsatz",
      "effizienz",
      "wachstum",
      "skalierung",
      "tempo",
      "leistung",
      "ergebnis",
      "runway",
      "marge",
    ],
  },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

  const weighted = ARCHETYPE_ORDER.reduce(
    (acc, archetypeId) => {
      const rawWeight = profile.clusterScores[archetypeId];
      const weight = Number.isFinite(rawWeight) ? Math.max(rawWeight, 0) : 0;
      acc.weightedSum += ARCHETYPE_ALIGNMENT_ANCHOR[archetypeId] * weight;
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

function resolveArchetypesForQuestion(
  questionId: string,
  prompt: string | null,
  dimension: string | null
): ValuesArchetypeId[] {
  const normalizedId = normalizeText(questionId);
  const byId = QUESTION_ID_CLUSTER_MAP[normalizedId];
  if (byId) return [byId];

  for (const entry of QUESTION_ID_CLUSTER_PATTERNS) {
    if (entry.pattern.test(questionId)) {
      return [entry.archetype];
    }
  }

  const corpus = normalizeText(`${dimension ?? ""} ${prompt ?? ""}`);
  const matches = KEYWORD_ARCHETYPE_MAP.filter((entry) =>
    entry.keywords.some((keyword) => corpus.includes(keyword))
  ).map((entry) => entry.archetype);

  return matches.length > 0 ? [...new Set(matches)] : [...ARCHETYPE_ORDER];
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

  const scoreBuckets = ARCHETYPE_ORDER.reduce(
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
    answered += 1;
    const archetypes = resolveArchetypesForQuestion(answer.questionId, answer.prompt, answer.dimension);
    const weight = archetypes.length > 0 ? 1 / archetypes.length : 1;
    for (const archetype of archetypes) {
      scoreBuckets[archetype].weightedSum += numeric * weight;
      scoreBuckets[archetype].weight += weight;
    }
  }

  if (answered === 0) return null;

  const clusterScores = ARCHETYPE_ORDER.reduce(
    (acc, archetypeId) => {
      const bucket = scoreBuckets[archetypeId];
      acc[archetypeId] =
        bucket.weight > 0 ? round(bucket.weightedSum / bucket.weight) : 0;
      return acc;
    },
    {} as Record<ValuesArchetypeId, number>
  );

  const ranked = [...ARCHETYPE_ORDER]
    .map((archetypeId) => ({
      archetypeId,
      score: clusterScores[archetypeId],
      order: ARCHETYPE_ORDER.indexOf(archetypeId),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });

  const primaryArchetypeId = ranked[0]?.archetypeId ?? "verantwortungs_stratege";
  const secondaryArchetypeId = ranked[1]?.archetypeId ?? null;
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
    `Aktueller Status: ${answered}/${valuesTotal > 0 ? valuesTotal : answered} beantwortete Werte-Fragen.`,
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
