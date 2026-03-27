import { type ValuesArchetypeId } from "@/features/reporting/types";

export type ValuesQuestionDefinition = {
  questionId: string;
  promptLabel: string;
  shortDescription: string;
  archetypeId: ValuesArchetypeId;
};

// Fachliche Quelle fuer die aktive Werte-Logik.
// Die Laufzeitquelle bleibt public.questions (category='values'), aber diese Datei
// versioniert die erwarteten aktiven Fragen und ihre eindeutige Zuordnung.
export const VALUES_QUESTION_DEFINITIONS: ValuesQuestionDefinition[] = [
  {
    questionId: "wv2_1",
    promptLabel: "Partner mit Grenzkosten",
    shortDescription:
      "Misst, wie stark Marken- und Vertrauensschutz gegen kurzfristige Entlastung gehalten werden.",
    archetypeId: "impact_idealist",
  },
  {
    questionId: "wv2_2",
    promptLabel: "Vorabzahlungen unter Risiko",
    shortDescription:
      "Misst, wie stark Kundenzumutbarkeit und Unternehmenssicherung gegeneinander abgewogen werden.",
    archetypeId: "verantwortungs_stratege",
  },
  {
    questionId: "wv2_3",
    promptLabel: "Launch-Risiko kommunizieren",
    shortDescription:
      "Misst, ob Planungssicherheit für Betroffene oder gesteuerte Marktkommunikation Vorrang bekommt.",
    archetypeId: "impact_idealist",
  },
  {
    questionId: "wv2_4",
    promptLabel: "Finanzlage im Team",
    shortDescription:
      "Misst, wie Teamzumutbarkeit und Informationskontrolle in unsicheren Finanzphasen balanciert werden.",
    archetypeId: "verantwortungs_stratege",
  },
  {
    questionId: "wv2_5",
    promptLabel: "Frühes Team unter Leistungsdruck",
    shortDescription:
      "Misst, wie Fürsorge, Loyalität und Systemleistung bei schwierigen Personalentscheidungen gewichtet werden.",
    archetypeId: "verantwortungs_stratege",
  },
  {
    questionId: "wv2_6",
    promptLabel: "Produktlinie schließen",
    shortDescription:
      "Misst, wie klar Fokus und Entlastung gegen Folgen für Bestandskund:innen priorisiert werden.",
    archetypeId: "business_pragmatiker",
  },
  {
    questionId: "wv2_7",
    promptLabel: "Wachstumspartner mit Preis",
    shortDescription:
      "Misst, wie stark inhaltliche Linie und Reichweitenhebel unter Wachstumsdruck gegeneinander stehen.",
    archetypeId: "impact_idealist",
  },
  {
    questionId: "wv2_8",
    promptLabel: "Vertriebshebel unter Last",
    shortDescription:
      "Misst, wie klar Marktfenster gegen operative Belastbarkeit priorisiert werden.",
    archetypeId: "business_pragmatiker",
  },
  {
    questionId: "wv2_9",
    promptLabel: "Kosten senken unter Druck",
    shortDescription:
      "Misst, wie Lastverteilung, Abfederung und schnelle finanzielle Wirkung gegeneinander abgewogen werden.",
    archetypeId: "verantwortungs_stratege",
  },
  {
    questionId: "wv2_10",
    promptLabel: "Margenbruch drehen",
    shortDescription:
      "Misst, wie entschlossen wirtschaftliche Wirkung auch bei spürbarer Härte priorisiert wird.",
    archetypeId: "business_pragmatiker",
  },
  {
    questionId: "wv2_11",
    promptLabel: "KI-Launch mit offenen Risiken",
    shortDescription:
      "Misst, wie stark Schutzleitplanken eine sichtbare Marktchance begrenzen dürfen.",
    archetypeId: "impact_idealist",
  },
  {
    questionId: "wv2_12",
    promptLabel: "Enterprise-Deal unter Stretch",
    shortDescription:
      "Misst, wie klar strategische Chance gegen operative Absicherung priorisiert wird.",
    archetypeId: "business_pragmatiker",
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
