import { type ValuesArchetypeId } from "@/features/reporting/types";

export type ValuesQuestionDefinition = {
  questionId: string;
  promptLabel: string;
  shortDescription: string;
  archetypeId: ValuesArchetypeId;
  legacyAliases?: string[];
};

// Fachliche Quelle fuer die aktive Werte-Logik.
// Die Laufzeitquelle bleibt public.questions (category='values'), aber diese Datei
// versioniert die erwarteten aktiven Fragen und ihre eindeutige Zuordnung.
export const VALUES_QUESTION_DEFINITIONS: ValuesQuestionDefinition[] = [
  {
    questionId: "qv_1",
    promptLabel: "Wirkung vor kurzfristigem Gewinn",
    shortDescription: "Misst, wie stark gesellschaftliche Wirkung und Sinn den wirtschaftlichen Takt vorgeben.",
    archetypeId: "impact_idealist",
    legacyAliases: ["d1_q1", "w1"],
  },
  {
    questionId: "qv_2",
    promptLabel: "Ethische Standards unter Druck",
    shortDescription: "Misst, wie konsequent ethische Leitplanken auch in schwierigen Phasen gehalten werden.",
    archetypeId: "impact_idealist",
    legacyAliases: ["w2"],
  },
  {
    questionId: "qv_3",
    promptLabel: "Verantwortung gegenüber Stakeholdern",
    shortDescription: "Misst, wie stark Entscheidungen auch mit Blick auf Team, Kunden und Umfeld getroffen werden.",
    archetypeId: "verantwortungs_stratege",
    legacyAliases: ["w3"],
  },
  {
    questionId: "qv_4",
    promptLabel: "Tragfähige Kompromisse",
    shortDescription: "Misst die Präferenz für balancierte Lösungen zwischen Werten, Zumutbarkeit und Businessrealität.",
    archetypeId: "verantwortungs_stratege",
    legacyAliases: ["d1_q4", "w4"],
  },
  {
    questionId: "qv_5",
    promptLabel: "Wirtschaftliche Schlagkraft",
    shortDescription: "Misst, wie stark Entscheidbarkeit, Profitabilität und operative Wirksamkeit priorisiert werden.",
    archetypeId: "business_pragmatiker",
    legacyAliases: ["d1_q2", "w5"],
  },
  {
    questionId: "qv_6",
    promptLabel: "Ergebnisorientierung im Alltag",
    shortDescription: "Misst die klare Orientierung an Umsetzung, Leistung und messbarem Fortschritt.",
    archetypeId: "business_pragmatiker",
    legacyAliases: ["w6"],
  },
  {
    questionId: "qv_7",
    promptLabel: "Fairness und Transparenz",
    shortDescription: "Misst, wie stark Vertrauen, Fairness und Offenheit als nicht verhandelbare Werte erlebt werden.",
    archetypeId: "impact_idealist",
    legacyAliases: ["d1_q3", "d1_q6", "w7"],
  },
  {
    questionId: "qv_8",
    promptLabel: "Nachhaltige Teamverantwortung",
    shortDescription: "Misst, wie stark Kultur, Zumutbarkeit und nachhaltige Verantwortung in Entscheidungen mitlaufen.",
    archetypeId: "verantwortungs_stratege",
    legacyAliases: ["d1_q5", "w8"],
  },
  {
    questionId: "qv_9",
    promptLabel: "Wachstum und Skalierung",
    shortDescription: "Misst, wie deutlich Wachstum, Effizienz und Marktchancen im Vordergrund stehen.",
    archetypeId: "business_pragmatiker",
    legacyAliases: ["w9"],
  },
  {
    questionId: "qv_10",
    promptLabel: "Verantwortung in Grenzfällen",
    shortDescription: "Misst, wie stark Verantwortung auch bei Zielkonflikten handlungsleitend bleibt.",
    archetypeId: "verantwortungs_stratege",
    legacyAliases: ["w10"],
  },
];

export const VALUES_ARCHETYPE_ORDER: ValuesArchetypeId[] = [
  "impact_idealist",
  "verantwortungs_stratege",
  "business_pragmatiker",
];

export const VALUES_ARCHETYPE_ALIGNMENT_ANCHOR: Record<ValuesArchetypeId, number> = {
  impact_idealist: 1,
  verantwortungs_stratege: 3.5,
  business_pragmatiker: 6,
};

function normalizeId(value: string) {
  return value.trim().toLowerCase();
}

const VALUE_QUESTION_BY_ID = new Map<string, ValuesQuestionDefinition>();
for (const definition of VALUES_QUESTION_DEFINITIONS) {
  VALUE_QUESTION_BY_ID.set(normalizeId(definition.questionId), definition);
  for (const alias of definition.legacyAliases ?? []) {
    VALUE_QUESTION_BY_ID.set(normalizeId(alias), definition);
  }
}

export function getValuesQuestionDefinition(questionId: string | null | undefined) {
  if (!questionId) return null;
  return VALUE_QUESTION_BY_ID.get(normalizeId(questionId)) ?? null;
}

export function getCanonicalValuesQuestionId(questionId: string | null | undefined) {
  return getValuesQuestionDefinition(questionId)?.questionId ?? null;
}

export function getValuesQuestionArchetypeId(questionId: string | null | undefined) {
  return getValuesQuestionDefinition(questionId)?.archetypeId ?? null;
}

export function getCanonicalValuesQuestionIds() {
  return VALUES_QUESTION_DEFINITIONS.map((definition) => definition.questionId);
}

export function getValuesQuestionVersionMismatch(questionIds: string[]) {
  const normalizedActiveIds = [...new Set(questionIds.map(normalizeId).filter(Boolean))];
  const normalizedCanonicalIds = normalizedActiveIds
    .map((id) => getCanonicalValuesQuestionId(id))
    .filter((id): id is string => Boolean(id))
    .map(normalizeId);

  const unknownIds = normalizedActiveIds.filter((id) => !getCanonicalValuesQuestionId(id));
  const missingIds = VALUES_QUESTION_DEFINITIONS.map((entry) => normalizeId(entry.questionId)).filter(
    (id) => !normalizedCanonicalIds.includes(id)
  );

  return {
    unknownIds,
    missingIds,
    isAligned: unknownIds.length === 0 && missingIds.length === 0,
  };
}
