import { FOUNDER_DIMENSION_ORDER, type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import { type SelfAlignmentReport, type SelfBaseCoverage, type SelfParticipantDebugReport } from "@/features/reporting/selfReportTypes";
import { type SelfValuesProfile, type ValuesArchetypeId } from "@/features/reporting/types";

export const DEBUG_INDIVIDUAL_REPORT_PROFILE_IDS = [
  "balanced_founder",
  "high_conflict_direct",
  "high_structure_high_commitment",
  "low_commitment_boundary_focused",
  "high_risk_high_speed",
  "cautious_reflective_founder",
] as const;

export type DebugIndividualReportProfileId =
  (typeof DEBUG_INDIVIDUAL_REPORT_PROFILE_IDS)[number];

export type DebugIndividualReportProfile = {
  id: DebugIndividualReportProfileId;
  label: string;
  description: string;
  report: SelfAlignmentReport;
};

type ScoreMap = SelfAlignmentReport["scoresA"];

const FULL_COVERAGE = 24;
const EMPTY_DIMENSION_QUESTIONS: Array<{
  questionId: string;
  value: number;
  max: number;
  normalized: number;
}> = [];

function buildScores(values: Record<FounderDimensionKey, number>): ScoreMap {
  return {
    Unternehmenslogik: values.Unternehmenslogik,
    Entscheidungslogik: values.Entscheidungslogik,
    Risikoorientierung: values.Risikoorientierung,
    "Arbeitsstruktur & Zusammenarbeit": values["Arbeitsstruktur & Zusammenarbeit"],
    Commitment: values.Commitment,
    Konfliktstil: values.Konfliktstil,
  };
}

function buildCoverage(): SelfBaseCoverage {
  const answeredNumericByDimension = Object.fromEntries(
    FOUNDER_DIMENSION_ORDER.map((dimension) => [dimension, 4])
  ) as Record<FounderDimensionKey, number>;

  const expectedByDimension = Object.fromEntries(
    FOUNDER_DIMENSION_ORDER.map((dimension) => [dimension, 4])
  ) as Record<FounderDimensionKey, number>;

  return {
    answeredNumericByDimension,
    expectedByDimension,
    numericAnsweredTotal: FULL_COVERAGE,
    expectedTotal: FULL_COVERAGE,
    baseCoveragePercent: 100,
  };
}

function buildDebugReport(participantName: string, scores: ScoreMap): SelfParticipantDebugReport {
  return {
    participantName,
    dimensions: FOUNDER_DIMENSION_ORDER.map((dimension) => {
      const score = scores[dimension];
      return {
        dimension,
        rawScore: score,
        normalizedScore: score,
        category:
          score == null ? null : score <= 40 ? "left" : score >= 60 ? "right" : "center",
        questions: EMPTY_DIMENSION_QUESTIONS,
      };
    }),
  };
}

function buildValuesProfile(input: {
  primaryArchetypeId: ValuesArchetypeId;
  secondaryArchetypeId: ValuesArchetypeId | null;
  primaryLabel: string;
  secondaryLabel: string | null;
  summary: string;
  insights: string[];
  watchouts: string[];
  clusterScores: Record<ValuesArchetypeId, number>;
}): SelfValuesProfile {
  return {
    ...input,
    answered: 12,
    total: 12,
  };
}

function buildReport(input: {
  id: string;
  participantAName: string;
  createdAt: string;
  scoresA: ScoreMap;
  keyInsights: SelfAlignmentReport["keyInsights"];
  conversationGuideQuestions: string[];
  valuesModulePreview: string;
  valuesModuleStatus: SelfAlignmentReport["valuesModuleStatus"];
  valuesAnsweredA: number;
  valuesTotal: number;
  valuesIdentityCategoryA: string | null;
  valuesPrimaryArchetypeIdA?: ValuesArchetypeId | null;
  valuesScoreA?: number | null;
  requestedScope: SelfAlignmentReport["requestedScope"];
  selfValuesProfile?: SelfAlignmentReport["selfValuesProfile"];
}): SelfAlignmentReport {
  return {
    sessionId: `debug-individual-${input.id}`,
    createdAt: input.createdAt,
    participantAId: `debug-${input.id}`,
    participantAName: input.participantAName,
    scoresA: input.scoresA,
    keyInsights: input.keyInsights,
    conversationGuideQuestions: input.conversationGuideQuestions,
    valuesModulePreview: input.valuesModulePreview,
    valuesModuleStatus: input.valuesModuleStatus,
    valuesAnsweredA: input.valuesAnsweredA,
    valuesTotal: input.valuesTotal,
    basisAnsweredA: FULL_COVERAGE,
    basisTotal: FULL_COVERAGE,
    valuesIdentityCategoryA: input.valuesIdentityCategoryA,
    valuesPrimaryArchetypeIdA: input.valuesPrimaryArchetypeIdA ?? null,
    valuesScoreA: input.valuesScoreA ?? null,
    requestedScope: input.requestedScope,
    selfAssessmentMeta: {
      baseAssessmentId: `debug-base-${input.id}`,
      valuesAssessmentId:
        input.valuesModuleStatus === "completed" ? `debug-values-${input.id}` : null,
    },
    selfValuesProfile: input.selfValuesProfile ?? null,
    baseCoverageA: buildCoverage(),
    debugA: buildDebugReport(input.participantAName, input.scoresA),
  };
}

const BALANCED_VALUES_PROFILE = buildValuesProfile({
  primaryArchetypeId: "verantwortungs_stratege",
  secondaryArchetypeId: "impact_idealist",
  primaryLabel: "Verantwortungs-Stratege",
  secondaryLabel: "Impact-Idealist",
  summary:
    "Du verbindest im Werteprofil Verantwortung für Wirkung mit einem nüchternen Blick auf Umsetzbarkeit, Ressourcen und Verbindlichkeit im Alltag.",
  insights: [
    "Du willst Wirkung nicht nur behaupten, sondern in Entscheidungen und Prioritäten nachvollziehbar machen.",
    "Du achtest darauf, dass Zusagen, Tempo und Verantwortung auch über mehrere Monate tragfähig bleiben.",
    "Du arbeitest gerne mit Menschen, die Sinn und Struktur gleichzeitig ernst nehmen.",
  ],
  watchouts: [
    "Wenn andere stark über Tempo oder Opportunität führen, brauchst du oft früher Klarheit über Leitplanken und reale Konsequenzen.",
  ],
  clusterScores: {
    impact_idealist: 82,
    verantwortungs_stratege: 91,
    business_pragmatiker: 63,
  },
});

const STRUCTURED_VALUES_PROFILE = buildValuesProfile({
  primaryArchetypeId: "verantwortungs_stratege",
  secondaryArchetypeId: "business_pragmatiker",
  primaryLabel: "Verantwortungs-Stratege",
  secondaryLabel: "Business-Pragmatiker",
  summary:
    "Du suchst Verbindlichkeit, belastbare Verantwortung und eine Form von Wachstum, die sich organisatorisch und menschlich tragen lässt.",
  insights: [
    "Du willst, dass Rollen, Zusagen und Prioritäten auch unter Druck noch lesbar bleiben.",
    "Du verbindest hohe Ambition gerne mit klarer Struktur und verlässlichen Arbeitsrealitäten.",
    "Du suchst Wirkung eher über Disziplin und saubere Ausführung als über maximale Offenheit.",
  ],
  watchouts: [
    "Wenn andere sehr spontan zwischen Prioritäten wechseln, wirkt das für dich schnell wie fehlende Belastbarkeit im System.",
  ],
  clusterScores: {
    impact_idealist: 54,
    verantwortungs_stratege: 94,
    business_pragmatiker: 76,
  },
});

const RISK_SPEED_VALUES_PROFILE = buildValuesProfile({
  primaryArchetypeId: "business_pragmatiker",
  secondaryArchetypeId: "impact_idealist",
  primaryLabel: "Business-Pragmatiker",
  secondaryLabel: "Impact-Idealist",
  summary:
    "Du misst Wert stark daran, ob Bewegung, Marktfeedback und sichtbare Wirkung entstehen, und bist bereit, dafür Unsicherheit in Kauf zu nehmen.",
  insights: [
    "Du willst Chancen nicht zu lange theoretisch prüfen, wenn ein echter Lern- oder Markthebel sichtbar wird.",
    "Du denkst Wirkung gerne in Tests, Traktion und konkreten nächsten Schritten.",
    "Du arbeitest gut mit Menschen, die Tempo nicht romantisieren, aber es auch nicht vorschnell abwürgen.",
  ],
  watchouts: [
    "Wenn Leitplanken und Kapazitätsgrenzen unausgesprochen bleiben, wirkst du auf andere schnell druckvoller, als du dich selbst erlebst.",
  ],
  clusterScores: {
    impact_idealist: 68,
    verantwortungs_stratege: 49,
    business_pragmatiker: 93,
  },
});

const CAUTIOUS_VALUES_PROFILE = buildValuesProfile({
  primaryArchetypeId: "verantwortungs_stratege",
  secondaryArchetypeId: "impact_idealist",
  primaryLabel: "Verantwortungs-Stratege",
  secondaryLabel: "Impact-Idealist",
  summary:
    "Du willst unternehmerische Wirkung so aufbauen, dass sie mit Verantwortung, Berechenbarkeit und sauberer Einordnung von Risiken zusammenpasst.",
  insights: [
    "Du suchst eher nach tragfähigen Schritten als nach maximaler Beschleunigung.",
    "Du achtest darauf, dass Entscheidungen begründbar bleiben und nicht nur aus Momentum entstehen.",
    "Du arbeitest gerne mit Menschen, die Unterschiedlichkeit früh lesbar machen und nicht erst im Druckfall.",
  ],
  watchouts: [
    "Wenn andere auf Tempo oder direkte Zuspitzung setzen, brauchst du meist früher Klarheit darüber, worauf sich der Schritt wirklich stützt.",
  ],
  clusterScores: {
    impact_idealist: 71,
    verantwortungs_stratege: 92,
    business_pragmatiker: 41,
  },
});

const DEBUG_INDIVIDUAL_REPORT_PROFILES: Record<
  DebugIndividualReportProfileId,
  DebugIndividualReportProfile
> = {
  balanced_founder: {
    id: "balanced_founder",
    label: "balanced_founder",
    description:
      "Ausgewogenes Profil mit sichtbarer Beweglichkeit zwischen Struktur, Risiko und Zusammenarbeit.",
    report: buildReport({
      id: "balanced_founder",
      participantAName: "Nora Weiss",
      createdAt: "2026-04-01T09:30:00.000Z",
      scoresA: buildScores({
        Unternehmenslogik: 53,
        Entscheidungslogik: 49,
        Risikoorientierung: 52,
        "Arbeitsstruktur & Zusammenarbeit": 54,
        Commitment: 51,
        Konfliktstil: 50,
      }),
      keyInsights: [
        {
          dimension: "profile",
          title: "Balanciertes Grundmuster",
          text: "Du wechselst je nach Lage zwischen Struktur und Offenheit, ohne klar auf nur einen Pol festgelegt zu sein.",
          priority: 1,
        },
      ],
      conversationGuideQuestions: [
        "Wann reicht euch situatives Abwägen, und wann braucht ihr bewusst eine klare Leitlinie?",
        "Wie macht ihr sichtbar, wann aus Beweglichkeit Unklarheit wird?",
      ],
      valuesModulePreview:
        "Das Werteprofil ergänzt dein Basisprofil um die Frage, worauf du im Aufbau eines Startups Sinn, Verantwortung und Priorität legst.",
      valuesModuleStatus: "completed",
      valuesAnsweredA: 12,
      valuesTotal: 12,
      valuesIdentityCategoryA: BALANCED_VALUES_PROFILE.primaryLabel,
      valuesPrimaryArchetypeIdA: BALANCED_VALUES_PROFILE.primaryArchetypeId,
      valuesScoreA: 74,
      requestedScope: "basis_plus_values",
      selfValuesProfile: BALANCED_VALUES_PROFILE,
    }),
  },
  high_conflict_direct: {
    id: "high_conflict_direct",
    label: "high_conflict_direct",
    description:
      "Direktes, schnelles Spannungsprofil mit hoher Sichtbarkeit von Widerspruch und klarem Vorwärtsimpuls.",
    report: buildReport({
      id: "high_conflict_direct",
      participantAName: "Lea Sommer",
      createdAt: "2026-04-01T09:45:00.000Z",
      scoresA: buildScores({
        Unternehmenslogik: 34,
        Entscheidungslogik: 71,
        Risikoorientierung: 67,
        "Arbeitsstruktur & Zusammenarbeit": 72,
        Commitment: 68,
        Konfliktstil: 91,
      }),
      keyInsights: [
        {
          dimension: "Konfliktstil",
          title: "Direkte Konfliktbearbeitung",
          text: "Du sprichst Unterschiede schnell an und willst offene Punkte lieber früh als spät klären.",
          priority: 1,
        },
      ],
      conversationGuideQuestions: [
        "Woran soll dein Gegenüber merken, wann du eine Differenz sofort aufmachen willst?",
        "Wie verhindert ihr, dass frühe Direktheit als Druck gelesen wird?",
      ],
      valuesModulePreview:
        "Das Werte-Add-on ist hier als Zwischenstand angelegt, damit auch der Zustand ohne fertiges Werteprofil überprüft werden kann.",
      valuesModuleStatus: "in_progress",
      valuesAnsweredA: 7,
      valuesTotal: 12,
      valuesIdentityCategoryA: null,
      valuesPrimaryArchetypeIdA: null,
      valuesScoreA: null,
      requestedScope: "basis_plus_values",
      selfValuesProfile: null,
    }),
  },
  high_structure_high_commitment: {
    id: "high_structure_high_commitment",
    label: "high_structure_high_commitment",
    description:
      "Eng abgestimmtes, hoch fokussiertes Profil mit starker Verbindlichkeit im Alltag.",
    report: buildReport({
      id: "high_structure_high_commitment",
      participantAName: "Mara Keller",
      createdAt: "2026-04-01T10:00:00.000Z",
      scoresA: buildScores({
        Unternehmenslogik: 78,
        Entscheidungslogik: 42,
        Risikoorientierung: 38,
        "Arbeitsstruktur & Zusammenarbeit": 88,
        Commitment: 93,
        Konfliktstil: 58,
      }),
      keyInsights: [
        {
          dimension: "Commitment",
          title: "Hohe Alltagspriorisierung",
          text: "Das Startup ist für dich klarer Schwerpunkt, und du liest Zusammenarbeit stark über Verbindlichkeit, Präsenz und Fokus.",
          priority: 1,
        },
      ],
      conversationGuideQuestions: [
        "Wann ist enge Abstimmung wirklich nötig, und wann erzeugt sie nur zusätzliche Schleifen?",
        "Welches Einsatzniveau erwartest du konkret in intensiven Phasen?",
      ],
      valuesModulePreview:
        "Das Werteprofil ist abgeschlossen und ergänzt die hohe Verbindlichkeit um klare Motive rund um Verantwortung, Struktur und Belastbarkeit.",
      valuesModuleStatus: "completed",
      valuesAnsweredA: 12,
      valuesTotal: 12,
      valuesIdentityCategoryA: STRUCTURED_VALUES_PROFILE.primaryLabel,
      valuesPrimaryArchetypeIdA: STRUCTURED_VALUES_PROFILE.primaryArchetypeId,
      valuesScoreA: 81,
      requestedScope: "basis_plus_values",
      selfValuesProfile: STRUCTURED_VALUES_PROFILE,
    }),
  },
  low_commitment_boundary_focused: {
    id: "low_commitment_boundary_focused",
    label: "low_commitment_boundary_focused",
    description:
      "Profil mit klaren Grenzen bei Einsatz, eher autonomer Zusammenarbeit und vorsichtigerem Umgang mit Druck.",
    report: buildReport({
      id: "low_commitment_boundary_focused",
      participantAName: "Tina Berger",
      createdAt: "2026-04-01T10:15:00.000Z",
      scoresA: buildScores({
        Unternehmenslogik: 69,
        Entscheidungslogik: 33,
        Risikoorientierung: 27,
        "Arbeitsstruktur & Zusammenarbeit": 26,
        Commitment: 18,
        Konfliktstil: 37,
      }),
      keyInsights: [
        {
          dimension: "Commitment",
          title: "Klare Einsatzgrenzen",
          text: "Du willst Verfügbarkeit und Priorität realistisch zusagen und nicht still in einen höheren Fokus hineingezogen werden.",
          priority: 1,
        },
      ],
      conversationGuideQuestions: [
        "Welcher Platz soll das Startup im Alltag realistisch haben?",
        "An welchen Punkten reicht gezielte Abstimmung, ohne dass laufende Nähe erwartet wird?",
      ],
      valuesModulePreview: "",
      valuesModuleStatus: "not_started",
      valuesAnsweredA: 0,
      valuesTotal: 12,
      valuesIdentityCategoryA: null,
      valuesPrimaryArchetypeIdA: null,
      valuesScoreA: null,
      requestedScope: "basis",
      selfValuesProfile: null,
    }),
  },
  high_risk_high_speed: {
    id: "high_risk_high_speed",
    label: "high_risk_high_speed",
    description:
      "Schnelles, chancenorientiertes Profil mit viel Bewegung bei Risiko, Entscheidung und Marktlogik.",
    report: buildReport({
      id: "high_risk_high_speed",
      participantAName: "Jonas Arendt",
      createdAt: "2026-04-01T10:30:00.000Z",
      scoresA: buildScores({
        Unternehmenslogik: 22,
        Entscheidungslogik: 86,
        Risikoorientierung: 92,
        "Arbeitsstruktur & Zusammenarbeit": 41,
        Commitment: 88,
        Konfliktstil: 76,
      }),
      keyInsights: [
        {
          dimension: "Risikoorientierung",
          title: "Vorwärtsgang unter Unsicherheit",
          text: "Wenn du einen realen Hebel siehst, gehst du lieber in Bewegung als in längere Absicherung.",
          priority: 1,
        },
      ],
      conversationGuideQuestions: [
        "Bis wohin wollt ihr bei Geld, Tempo oder persönlicher Belastung wirklich gehen?",
        "Woran soll für andere sichtbar werden, wann für dich ein nächster Schritt schon klar genug ist?",
      ],
      valuesModulePreview:
        "Das Werteprofil zeigt hier ein klares Tempo- und Wirkungsprofil, das bewusst mit hoher Unsicherheit arbeiten kann.",
      valuesModuleStatus: "completed",
      valuesAnsweredA: 12,
      valuesTotal: 12,
      valuesIdentityCategoryA: RISK_SPEED_VALUES_PROFILE.primaryLabel,
      valuesPrimaryArchetypeIdA: RISK_SPEED_VALUES_PROFILE.primaryArchetypeId,
      valuesScoreA: 79,
      requestedScope: "basis_plus_values",
      selfValuesProfile: RISK_SPEED_VALUES_PROFILE,
    }),
  },
  cautious_reflective_founder: {
    id: "cautious_reflective_founder",
    label: "cautious_reflective_founder",
    description:
      "Vorsichtiges, reflektierendes Profil mit hoher Prüfungstiefe und eher spätem Öffnen von Differenzen.",
    report: buildReport({
      id: "cautious_reflective_founder",
      participantAName: "Clara Neumann",
      createdAt: "2026-04-01T10:45:00.000Z",
      scoresA: buildScores({
        Unternehmenslogik: 81,
        Entscheidungslogik: 14,
        Risikoorientierung: 19,
        "Arbeitsstruktur & Zusammenarbeit": 43,
        Commitment: 57,
        Konfliktstil: 16,
      }),
      keyInsights: [
        {
          dimension: "Entscheidungslogik",
          title: "Erst prüfen, dann festlegen",
          text: "Du willst offene Annahmen, Gegenargumente und Folgen eher sichtbar machen, bevor du in einen klaren Entscheid gehst.",
          priority: 1,
        },
      ],
      conversationGuideQuestions: [
        "Wie viel Grundlage brauchst du, bevor eine Entscheidung für dich tragfähig ist?",
        "Wann willst du einen Unterschied erst sortieren, bevor du ihn offen ansprichst?",
      ],
      valuesModulePreview:
        "Das abgeschlossene Werteprofil zeigt eine starke Orientierung an Verantwortung, Tragfähigkeit und nachvollziehbaren Entscheidungen.",
      valuesModuleStatus: "completed",
      valuesAnsweredA: 12,
      valuesTotal: 12,
      valuesIdentityCategoryA: CAUTIOUS_VALUES_PROFILE.primaryLabel,
      valuesPrimaryArchetypeIdA: CAUTIOUS_VALUES_PROFILE.primaryArchetypeId,
      valuesScoreA: 84,
      requestedScope: "basis_plus_values",
      selfValuesProfile: CAUTIOUS_VALUES_PROFILE,
    }),
  },
};

export function resolveDebugIndividualReportProfileId(
  value: string | null | undefined
): DebugIndividualReportProfileId {
  if (
    value &&
    DEBUG_INDIVIDUAL_REPORT_PROFILE_IDS.includes(
      value as DebugIndividualReportProfileId
    )
  ) {
    return value as DebugIndividualReportProfileId;
  }

  return "balanced_founder";
}

export function getDebugIndividualReportProfileOptions() {
  return DEBUG_INDIVIDUAL_REPORT_PROFILE_IDS.map((id) => ({
    id,
    label: DEBUG_INDIVIDUAL_REPORT_PROFILES[id].label,
  }));
}

export function getDebugIndividualReportProfile(
  id: DebugIndividualReportProfileId
): DebugIndividualReportProfile {
  return DEBUG_INDIVIDUAL_REPORT_PROFILES[id];
}
