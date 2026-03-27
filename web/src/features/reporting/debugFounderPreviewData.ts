import {
  buildFounderAlignmentReport,
  type FounderAlignmentReport,
} from "@/features/reporting/buildFounderAlignmentReport";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import {
  buildEmptyFounderAlignmentWorkbookPayload,
  deriveFounderAlignmentWorkbookHighlights,
  type FounderAlignmentWorkbookHighlights,
  type FounderAlignmentWorkbookPayload,
} from "@/features/reporting/founderAlignmentWorkbook";
import { type FounderAlignmentWorkbookViewerRole } from "@/features/reporting/founderAlignmentWorkbookData";
import { type FounderAlignmentWorkbookAdvisorInviteState } from "@/features/reporting/founderAlignmentWorkbookAdvisor";
import { generateCompareReport } from "@/features/reporting/generateCompareReport";
import { DIMENSION_DEFINITIONS_DE, VALUES_ARCHETYPES_DE } from "@/features/reporting/report_texts.de";
import {
  type CompareReportJson,
  type ProfileResult,
  type RadarSeries,
  type ReportDimension,
  type SelfValuesProfile,
  type SessionAlignmentReport,
  type ValuesArchetypeId,
  type ZoneBand,
} from "@/features/reporting/types";
import { scoreFounderAlignment, type Answer, type TeamScoringResult } from "@/features/scoring/founderScoring";
import { type FounderConversationChapter } from "@/features/reporting/founderConversationGuide";

export type FounderPreviewMode = "pre_founder" | "existing_team" | "advisor";

export type FounderPreviewScenarioMeta = {
  id: FounderPreviewMode;
  label: string;
  teamContext: TeamContext;
  teamContextLabel: string;
  description: string;
  advisorActive: boolean;
  advisorName: string | null;
  valuesCompleted: boolean;
  baseCompleted: boolean;
};

export type FounderPreviewViewerRole = "founderA" | "founderB" | "advisor";

type PreviewTeam = {
  founderAName: string;
  founderBName: string;
  teamContext: TeamContext;
};

export type WorkbookPreviewState = {
  founderAName: string;
  founderBName: string;
  teamContext: TeamContext;
  currentUserRole: FounderAlignmentWorkbookViewerRole;
  initialWorkbook: FounderAlignmentWorkbookPayload;
  highlights: FounderAlignmentWorkbookHighlights;
  advisorInvite: FounderAlignmentWorkbookAdvisorInviteState;
  reportHeadline: string;
  showValuesStep: boolean;
};

export type ConversationGuidePreviewState = {
  founderAName: string;
  founderBName: string;
  teamContext: TeamContext;
  highlights: FounderAlignmentWorkbookHighlights;
  reportHeadline: string;
  showValuesConversationBlock: boolean;
  introText: string;
  scenarioNote: string;
  chapterOverrides: Partial<Record<FounderConversationChapter["id"], { reflectionQuestions?: [string, string, string]; decisionQuestion?: string }>>;
};

export type MatchingReportPreviewState = {
  createdAt: string;
  modules: string[];
  report: SessionAlignmentReport;
  compareJson: CompareReportJson;
};

export type FounderAlignmentReportPreviewState = {
  founderAName: string;
  founderBName: string;
  teamContext: TeamContext;
  report: FounderAlignmentReport;
  scoringResult: TeamScoringResult;
};

const PREVIEW_VALUES_TOTAL = 12;

const PREVIEW_TEAMS: Record<FounderPreviewMode, PreviewTeam> = {
  pre_founder: {
    founderAName: "Mina Hartmann",
    founderBName: "Jonas Weber",
    teamContext: "pre_founder",
  },
  existing_team: {
    founderAName: "Maria Keller",
    founderBName: "Lukas Brandt",
    teamContext: "existing_team",
  },
  advisor: {
    founderAName: "Mina Hartmann",
    founderBName: "Jonas Weber",
    teamContext: "pre_founder",
  },
};

const PREVIEW_VALUES_PROFILES: Record<FounderPreviewMode, { a: SelfValuesProfile; b: SelfValuesProfile }> = {
  pre_founder: {
    a: buildValuesProfile("impact_idealist", "verantwortungs_stratege"),
    b: buildValuesProfile("verantwortungs_stratege", "impact_idealist"),
  },
  existing_team: {
    a: buildValuesProfile("business_pragmatiker", "verantwortungs_stratege"),
    b: buildValuesProfile("verantwortungs_stratege", "business_pragmatiker"),
  },
  advisor: {
    a: buildValuesProfile("impact_idealist", "business_pragmatiker"),
    b: buildValuesProfile("verantwortungs_stratege", "impact_idealist"),
  },
};

export function resolveFounderPreviewMode(
  rawMode: string | null | undefined,
  fallbackMode: FounderPreviewMode
) {
  if (rawMode === "pre_founder" || rawMode === "existing_team" || rawMode === "advisor") {
    return rawMode;
  }

  return fallbackMode;
}

export function getFounderPreviewModeOptions() {
  return [
    { id: "pre_founder" as const, label: "Pre-Founder Matching" },
    { id: "existing_team" as const, label: "Existing Founder Team" },
    { id: "advisor" as const, label: "Advisor Moderated Workbook" },
  ];
}

export function resolveFounderPreviewViewerRole(
  rawViewer: string | null | undefined,
  mode: FounderPreviewMode
): FounderPreviewViewerRole {
  if (rawViewer === "founderA" || rawViewer === "founderB") {
    return rawViewer;
  }

  if (rawViewer === "advisor" && mode === "advisor") {
    return rawViewer;
  }

  return "founderA";
}

export function getFounderPreviewViewerOptions(mode: FounderPreviewMode) {
  const baseOptions: Array<{ id: FounderPreviewViewerRole; label: string }> = [
    { id: "founderA", label: "Founder A" },
    { id: "founderB", label: "Founder B" },
  ];

  if (mode === "advisor") {
    baseOptions.push({ id: "advisor", label: "Advisor" });
  }

  return baseOptions;
}

export function getFounderPreviewScenarioMeta(mode: FounderPreviewMode): FounderPreviewScenarioMeta {
  if (mode === "existing_team") {
    return {
      id: mode,
      label: "Existing Founder Team",
      teamContext: "existing_team",
      teamContextLabel: "Bestehendes Founder-Team",
      description:
        "Dieses Szenario zeigt ein Team, das bereits operativ zusammenarbeitet, mit klaren Rollen, echten Spannungen und konkreten Entscheidungsregeln.",
      advisorActive: false,
      advisorName: null,
      valuesCompleted: true,
      baseCompleted: true,
    };
  }

  if (mode === "advisor") {
    return {
      id: mode,
      label: "Advisor Moderated Session",
      teamContext: "pre_founder",
      teamContextLabel: "Moderierte Pre-Founder-Session",
      description:
        "Dieses Szenario simuliert eine moderierte Alignment-Session mit aktivem Advisor, sichtbaren Kommentaren und einem gemeinsamen Arbeitsdokument ohne Live-Speicherung.",
      advisorActive: true,
      advisorName: "Theresa Vogt",
      valuesCompleted: true,
      baseCompleted: true,
    };
  }

  return {
    id: mode,
    label: "Pre-Founder Matching",
    teamContext: "pre_founder",
    teamContextLabel: "Moegliche Gruendungspartnerschaft",
    description:
      "Dieses Szenario zeigt zwei Founder in einer fruehen Matching-Phase. Sprache, Fragen und Vereinbarungen bleiben vorbereitend, tastend und noch nicht voll operativ.",
    advisorActive: false,
    advisorName: null,
    valuesCompleted: true,
    baseCompleted: true,
  };
}

export function getWorkbookPreviewState(
  mode: FounderPreviewMode,
  viewerRole: FounderPreviewViewerRole = "founderA"
): WorkbookPreviewState {
  const foundation = getFounderAlignmentPreviewFoundation(mode);
  const workbook = buildEmptyFounderAlignmentWorkbookPayload();
  const advisorInviteState: FounderAlignmentWorkbookAdvisorInviteState = {
    founderAApproved: mode === "advisor",
    founderBApproved: mode === "advisor",
    advisorLinked: mode === "advisor",
    advisorName: mode === "advisor" ? "Theresa Vogt" : null,
  };

  workbook.currentStepId =
    mode === "existing_team" ? "decision_rules" : mode === "advisor" ? "vision_direction" : "roles_responsibility";

  if (mode === "advisor") {
    workbook.advisorName = "Theresa Vogt";
    workbook.advisorId = "debug-advisor";
    workbook.steps.vision_direction = {
      founderA: "We want to prioritize product validation before aggressive fundraising.",
      founderB: "I agree with product validation first, but I believe we should still keep investor conversations open early.",
      agreement:
        "For the next six months we prioritize product-market fit. Investor conversations are exploratory only.",
      advisorNotes: "Clarify who decides when fundraising becomes active.",
    };
    workbook.steps.roles_responsibility = {
      founderA: "I want product and user discovery to stay clearly with me until we have a stable rhythm.",
      founderB: "I can own operations and early commercial structure, but I want visibility into major product bets.",
      agreement:
        "Product discovery stays with Founder A, operations and commercial setup with Founder B. Strategic role changes are discussed explicitly once per month.",
      advisorNotes: "Make the monthly role-check concrete and time-boxed.",
    };
    workbook.steps.values_guardrails = {
      founderA: "I do not want investor pressure to push us into promises we cannot deliver to early customers.",
      founderB: "I can handle exploratory investor conversations early, but I do not want growth pressure to reshape our product roadmap too soon.",
      agreement:
        "We keep investor outreach exploratory until product-market fit signals are stable. External pressure does not override customer trust or roadmap discipline.",
      advisorNotes: "Define the signal that turns exploratory fundraising into an active process.",
    };
  } else if (mode === "existing_team") {
    workbook.steps.decision_rules = {
      founderA: "I tend to make quick product decisions during development cycles.",
      founderB: "I prefer we validate with the team before final product decisions.",
      agreement:
        "Product direction decisions are discussed in the weekly founder meeting. Urgent tactical decisions can be made by the product lead.",
      advisorNotes: "",
    };
    workbook.steps.roles_responsibility = {
      founderA: "I already own product and engineering, but major roadmap shifts still create ambiguity.",
      founderB: "I lead sales and financing topics, but I need clearer visibility when product choices affect commitments to customers.",
      agreement:
        "Product and engineering stay with Founder A, sales and financing with Founder B. Decisions that affect delivery promises or revenue targets are synced before they go live.",
      advisorNotes: "",
    };
    workbook.steps.collaboration_conflict = {
      founderA: "In operational sprints I need less ad-hoc escalation and more structured check-ins.",
      founderB: "I need issues raised quickly because operational delays usually surface first in customer conversations.",
      agreement:
        "Operational tensions are raised in the daily founder sync. If something blocks customer commitments, it is escalated immediately with a proposed next step.",
      advisorNotes: "",
    };
  } else {
    workbook.steps.roles_responsibility = {
      founderA: "I would like us to keep product and customer discovery close to one person at the start.",
      founderB: "I want shared visibility on the big bets, even if execution ownership is distributed.",
      agreement:
        "Execution ownership can sit with one person, but strategic shifts are discussed together before commitments are made.",
      advisorNotes: "",
    };
    workbook.steps.decision_rules = {
      founderA: "I prefer fast tests and would rather correct quickly than wait for perfect certainty.",
      founderB: "I am comfortable moving fast if we define which decisions need a stronger data check first.",
      agreement:
        "Fast experiments are encouraged. Decisions with financial, hiring or brand impact require one extra checkpoint before they are finalized.",
      advisorNotes: "",
    };
  }

  return {
    founderAName: foundation.team.founderAName,
    founderBName: foundation.team.founderBName,
    teamContext: foundation.team.teamContext,
    currentUserRole: viewerRole,
    initialWorkbook: workbook,
    highlights: foundation.highlights,
    advisorInvite: advisorInviteState,
    reportHeadline: foundation.report.executiveSummary.headline,
    showValuesStep: true,
  };
}

export function getConversationGuidePreviewState(mode: FounderPreviewMode): ConversationGuidePreviewState {
  const foundation = getFounderAlignmentPreviewFoundation(mode);

  return {
    founderAName: foundation.team.founderAName,
    founderBName: foundation.team.founderBName,
    teamContext: foundation.team.teamContext,
    highlights: foundation.highlights,
    reportHeadline: foundation.report.executiveSummary.headline,
    showValuesConversationBlock: true,
    introText:
      mode === "existing_team"
        ? "Dieser Leitfaden ist fuer ein bestehendes Founder-Team gedacht. Der Fokus liegt auf echten Routinen, operativen Spannungen und belastbaren Arbeitsabsprachen."
        : mode === "advisor"
          ? "Dieser Leitfaden simuliert eine moderierte Session, in der eine dritte Person hilft, Unterschiede sichtbar zu machen und schwierige Entscheidungen sauber vorzubereiten."
          : "Dieser Leitfaden ist fuer zwei Founder gedacht, die eine moegliche Zusammenarbeit pruefen. Die Fragen bleiben bewusst vorbereitend und machen Unterschiede frueh sichtbar, bevor daraus operative Muster werden.",
    scenarioNote:
      mode === "existing_team"
        ? "Die Kapitel sind hier straffer auf operative Zusammenarbeit, Teamabstimmung und reale Entscheidungsroutinen ausgerichtet."
        : mode === "advisor"
          ? "Die Fragen bleiben gruendernah, aber in einer Form, die sich gut fuer Coachings, Accelerator-Sessions oder moderierte Alignment-Gespraeche eignet."
          : "Die Kapitel setzen frueh an: Sie helfen, Erwartungen, Motivation und Leitplanken zu klaeren, bevor ein gemeinsamer Alltag entstanden ist.",
    chapterOverrides: {
      personal_motivation:
        mode === "existing_team"
          ? {
              reflectionQuestions: [
                "Was traegt eure Zusammenarbeit heute noch wirklich, jenseits von Gewohnheit oder bestehender Rollenverteilung?",
                "Welche Erwartungen an Rolle, Einfluss und Verantwortung haben sich seit eurem Start veraendert?",
                "Woran wuerdet ihr merken, dass Motivation und Energie im Alltag gerade auseinanderlaufen?",
              ],
            }
          : undefined,
      daily_collaboration:
        mode === "existing_team"
          ? {
              reflectionQuestions: [
                "Welche Alltagsroutinen funktionieren bereits verlässlich und wo verliert ihr aktuell Zeit oder Klarheit?",
                "Wo braucht ihr mehr operative Eigenständigkeit und wo mehr gemeinsames Alignment?",
                "Welche Rollen- oder Abstimmungsfragen solltet ihr jetzt klären, bevor daraus Reibung im Team wird?",
              ],
            }
          : undefined,
      uncertainty: {
        reflectionQuestions: [
          "How should we handle situations where speed and values conflict?",
          "What kind of uncertainty can we absorb without falling into reactive decisions?",
          "Where do we want clear checkpoints before a fast decision becomes a larger company commitment?",
        ],
      },
      conflict_trust: {
        decisionQuestion:
          "What type of investor pressure would make one of you uncomfortable, and how should that be addressed before it turns into friction?",
      },
    },
  };
}

export function getMatchingReportPreviewState(mode: FounderPreviewMode): MatchingReportPreviewState {
  const compareProfiles = buildCompareProfiles(mode);
  const compareJson = generateCompareReport(compareProfiles.profileA, compareProfiles.profileB);
  const valuesProfiles = PREVIEW_VALUES_PROFILES[mode];
  const team = PREVIEW_TEAMS[mode];
  const report: SessionAlignmentReport = {
    sessionId: `debug-${mode}`,
    createdAt: "2026-03-16T10:30:00.000Z",
    personBInvitedAt: "2026-03-09T10:00:00.000Z",
    personACompletedAt: "2026-03-10T10:00:00.000Z",
    personBCompletedAt: "2026-03-11T10:00:00.000Z",
    participantAId: "debug-a",
    participantBId: "debug-b",
    participantAName: team.founderAName,
    participantBName: team.founderBName,
    personBStatus: "match_ready",
    personACompleted: true,
    personBCompleted: true,
    comparisonEnabled: true,
    scoresA: compareProfiles.profileA.dimensionScores,
    scoresB: compareProfiles.profileB.dimensionScores,
    keyInsights: compareJson.keyInsights.map((entry, index) => ({
      dimension: entry.dimension,
      title: entry.title,
      text: entry.text,
      priority: index + 1,
    })),
    commonTendencies: compareJson.executiveSummary.topMatches,
    frictionPoints: compareJson.executiveSummary.topTensions,
    conversationGuideQuestions: compareJson.conversationGuide,
    valuesModulePreview: compareJson.valuesModule.text,
    valuesModuleStatus: "completed",
    valuesAnsweredA: PREVIEW_VALUES_TOTAL,
    valuesAnsweredB: PREVIEW_VALUES_TOTAL,
    valuesTotal: PREVIEW_VALUES_TOTAL,
    basisAnsweredA: 48,
    basisAnsweredB: 48,
    basisTotal: 48,
    valuesAlignmentPercent: compareJson.valuesModule.alignmentPercent,
    valuesIdentityCategoryA: valuesProfiles.a.primaryLabel,
    valuesIdentityCategoryB: valuesProfiles.b.primaryLabel,
    valuesPrimaryArchetypeIdA: valuesProfiles.a.primaryArchetypeId,
    valuesPrimaryArchetypeIdB: valuesProfiles.b.primaryArchetypeId,
    valuesScoreA: compareProfiles.profileA.valuesScore,
    valuesScoreB: compareProfiles.profileB.valuesScore,
    requestedScope: "basis_plus_values",
    inviteConsentCaptured: true,
    debugA: {
      participantName: team.founderAName,
      dimensions: [],
    },
    debugB: {
      participantName: team.founderBName,
      dimensions: [],
    },
  };

  return {
    createdAt: "2026-03-16T10:30:00.000Z",
    modules: ["base", "values"],
    report,
    compareJson,
  };
}

export function getFounderAlignmentReportPreviewState(
  mode: FounderPreviewMode
): FounderAlignmentReportPreviewState {
  const foundation = getFounderAlignmentPreviewFoundation(mode);

  return {
    founderAName: foundation.team.founderAName,
    founderBName: foundation.team.founderBName,
    teamContext: foundation.team.teamContext,
    report: foundation.report,
    scoringResult: foundation.scoringResult,
  };
}

function getFounderAlignmentPreviewFoundation(mode: FounderPreviewMode): {
  team: PreviewTeam;
  scoringResult: TeamScoringResult;
  report: FounderAlignmentReport;
  highlights: FounderAlignmentWorkbookHighlights;
} {
  const team = PREVIEW_TEAMS[mode];
  const scoringResult = scoreFounderAlignment(buildFounderAlignmentAnswers(mode));
  const report = buildFounderAlignmentReport({
    scoringResult,
    teamContext: team.teamContext,
  });

  return {
    team,
    scoringResult,
    report,
    highlights: deriveFounderAlignmentWorkbookHighlights(report, scoringResult),
  };
}

function buildFounderAlignmentAnswers(mode: FounderPreviewMode) {
  if (mode === "existing_team") {
    return {
      personA: [
        answer("vision-a-1", "Unternehmenslogik", 50),
        answer("vision-a-2", "Unternehmenslogik", 75),
        answer("decision-a-1", "Entscheidungslogik", 100),
        answer("decision-a-2", "Entscheidungslogik", 75),
        answer("risk-a-1", "Risikoorientierung", 50),
        answer("risk-a-2", "Risikoorientierung", 75),
        answer("work-a-1", "Arbeitsstruktur & Zusammenarbeit", 50),
        answer("work-a-2", "Arbeitsstruktur & Zusammenarbeit", 75),
        answer("commitment-a-1", "Commitment", 75),
        answer("commitment-a-2", "Commitment", 75),
        answer("conflict-a-1", "Konfliktstil", 75),
        answer("conflict-a-2", "Konfliktstil", 50),
      ],
      personB: [
        answer("vision-b-1", "Unternehmenslogik", 50),
        answer("vision-b-2", "Unternehmenslogik", 75),
        answer("decision-b-1", "Entscheidungslogik", 25),
        answer("decision-b-2", "Entscheidungslogik", 50),
        answer("risk-b-1", "Risikoorientierung", 50),
        answer("risk-b-2", "Risikoorientierung", 50),
        answer("work-b-1", "Arbeitsstruktur & Zusammenarbeit", 25),
        answer("work-b-2", "Arbeitsstruktur & Zusammenarbeit", 50),
        answer("commitment-b-1", "Commitment", 75),
        answer("commitment-b-2", "Commitment", 50),
        answer("conflict-b-1", "Konfliktstil", 25),
        answer("conflict-b-2", "Konfliktstil", 50),
      ],
    };
  }

  if (mode === "advisor") {
    return {
      personA: [
        answer("vision-a-1", "Unternehmenslogik", 75),
        answer("vision-a-2", "Unternehmenslogik", 75),
        answer("decision-a-1", "Entscheidungslogik", 75),
        answer("decision-a-2", "Entscheidungslogik", 50),
        answer("risk-a-1", "Risikoorientierung", 50),
        answer("risk-a-2", "Risikoorientierung", 50),
        answer("work-a-1", "Arbeitsstruktur & Zusammenarbeit", 50),
        answer("work-a-2", "Arbeitsstruktur & Zusammenarbeit", 75),
        answer("commitment-a-1", "Commitment", 100),
        answer("commitment-a-2", "Commitment", 75),
        answer("conflict-a-1", "Konfliktstil", 50),
        answer("conflict-a-2", "Konfliktstil", 50),
      ],
      personB: [
        answer("vision-b-1", "Unternehmenslogik", 75),
        answer("vision-b-2", "Unternehmenslogik", 50),
        answer("decision-b-1", "Entscheidungslogik", 50),
        answer("decision-b-2", "Entscheidungslogik", 50),
        answer("risk-b-1", "Risikoorientierung", 25),
        answer("risk-b-2", "Risikoorientierung", 50),
        answer("work-b-1", "Arbeitsstruktur & Zusammenarbeit", 50),
        answer("work-b-2", "Arbeitsstruktur & Zusammenarbeit", 50),
        answer("commitment-b-1", "Commitment", 75),
        answer("commitment-b-2", "Commitment", 75),
        answer("conflict-b-1", "Konfliktstil", 75),
        answer("conflict-b-2", "Konfliktstil", 50),
      ],
    };
  }

  return {
    personA: [
      answer("vision-a-1", "Unternehmenslogik", 100),
      answer("vision-a-2", "Unternehmenslogik", 75),
      answer("decision-a-1", "Entscheidungslogik", 75),
      answer("decision-a-2", "Entscheidungslogik", 50),
      answer("risk-a-1", "Risikoorientierung", 100),
      answer("risk-a-2", "Risikoorientierung", 75),
      answer("work-a-1", "Arbeitsstruktur & Zusammenarbeit", 75),
      answer("work-a-2", "Arbeitsstruktur & Zusammenarbeit", 50),
      answer("commitment-a-1", "Commitment", 75),
      answer("commitment-a-2", "Commitment", 75),
      answer("conflict-a-1", "Konfliktstil", 50),
      answer("conflict-a-2", "Konfliktstil", 25),
    ],
    personB: [
      answer("vision-b-1", "Unternehmenslogik", 75),
      answer("vision-b-2", "Unternehmenslogik", 75),
      answer("decision-b-1", "Entscheidungslogik", 25),
      answer("decision-b-2", "Entscheidungslogik", 50),
      answer("risk-b-1", "Risikoorientierung", 25),
      answer("risk-b-2", "Risikoorientierung", 50),
      answer("work-b-1", "Arbeitsstruktur & Zusammenarbeit", 50),
      answer("work-b-2", "Arbeitsstruktur & Zusammenarbeit", 75),
      answer("commitment-b-1", "Commitment", 50),
      answer("commitment-b-2", "Commitment", 50),
      answer("conflict-b-1", "Konfliktstil", 100),
      answer("conflict-b-2", "Konfliktstil", 75),
    ],
  };
}

function buildCompareProfiles(mode: FounderPreviewMode) {
  if (mode === "existing_team") {
    return {
      profileA: buildCompareProfile({
        id: "existing-a",
        displayName: PREVIEW_TEAMS[mode].founderAName,
        valuesScore: 5.6,
        valuesArchetypeId: "business_pragmatiker",
        scores: {
          Vision: 4.7,
          Entscheidung: 5.1,
          Risiko: 4.2,
          Autonomie: 4.8,
          Verbindlichkeit: 5.3,
          Konflikt: 4.1,
        },
      }),
      profileB: buildCompareProfile({
        id: "existing-b",
        displayName: PREVIEW_TEAMS[mode].founderBName,
        valuesScore: 3.6,
        valuesArchetypeId: "verantwortungs_stratege",
        scores: {
          Vision: 4.2,
          Entscheidung: 2.7,
          Risiko: 3.8,
          Autonomie: 2.6,
          Verbindlichkeit: 4.8,
          Konflikt: 2.8,
        },
      }),
    };
  }

  if (mode === "advisor") {
    return {
      profileA: buildCompareProfile({
        id: "advisor-a",
        displayName: PREVIEW_TEAMS[mode].founderAName,
        valuesScore: 2.2,
        valuesArchetypeId: "impact_idealist",
        scores: {
          Vision: 4.4,
          Entscheidung: 4.6,
          Risiko: 3.9,
          Autonomie: 3.6,
          Verbindlichkeit: 5.1,
          Konflikt: 3.2,
        },
      }),
      profileB: buildCompareProfile({
        id: "advisor-b",
        displayName: PREVIEW_TEAMS[mode].founderBName,
        valuesScore: 4.1,
        valuesArchetypeId: "verantwortungs_stratege",
        scores: {
          Vision: 4.1,
          Entscheidung: 3.5,
          Risiko: 2.8,
          Autonomie: 3.1,
          Verbindlichkeit: 4.7,
          Konflikt: 4.2,
        },
      }),
    };
  }

  return {
    profileA: buildCompareProfile({
      id: "pre-a",
      displayName: PREVIEW_TEAMS[mode].founderAName,
      valuesScore: 2.6,
      valuesArchetypeId: "impact_idealist",
      scores: {
        Vision: 5,
        Entscheidung: 4.4,
        Risiko: 5.1,
        Autonomie: 4.6,
        Verbindlichkeit: 4.5,
        Konflikt: 3.4,
      },
    }),
    profileB: buildCompareProfile({
      id: "pre-b",
      displayName: PREVIEW_TEAMS[mode].founderBName,
      valuesScore: 4.9,
      valuesArchetypeId: "business_pragmatiker",
      scores: {
        Vision: 3.7,
        Entscheidung: 2.8,
        Risiko: 2.9,
        Autonomie: 3.2,
        Verbindlichkeit: 3.8,
        Konflikt: 4.8,
      },
    }),
  };
}

function buildCompareProfile({
  id,
  displayName,
  scores,
  valuesScore,
  valuesArchetypeId,
}: {
  id: string;
  displayName: string;
  scores: RadarSeries;
  valuesScore: number;
  valuesArchetypeId: ValuesArchetypeId;
}): ProfileResult {
  return {
    profileId: id,
    displayName,
    dimensionScores: scores,
    dimensionZones: Object.fromEntries(
      Object.entries(scores).map(([dimension, score]) => [dimension, resolveZone(score)])
    ) as Record<ReportDimension, ZoneBand>,
    archetypeIdPerDimension: Object.fromEntries(
      Object.entries(scores).map(([dimension, score]) => {
        const zone = resolveZone(score);
        const definition = DIMENSION_DEFINITIONS_DE[dimension as ReportDimension];
        return [dimension, definition.archetypesByZone[zone].id];
      })
    ) as Record<ReportDimension, string>,
    valuesScore,
    valuesArchetypeId,
  };
}

function resolveZone(score: number | null): ZoneBand {
  if (score == null) return "mid";
  if (score <= 2.5) return "low";
  if (score >= 4.5) return "high";
  return "mid";
}

function answer(questionId: string, dimension: string, value: number): Answer {
  return {
    question_id: questionId,
    dimension,
    value,
  };
}

function buildValuesProfile(
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null
): SelfValuesProfile {
  const primary = VALUES_ARCHETYPES_DE[primaryArchetypeId];
  const secondary = secondaryArchetypeId ? VALUES_ARCHETYPES_DE[secondaryArchetypeId] : null;

  return {
    primaryArchetypeId,
    secondaryArchetypeId,
    primaryLabel: primary?.name ?? primaryArchetypeId,
    secondaryLabel: secondary?.name ?? null,
    summary:
      primaryArchetypeId === "impact_idealist"
        ? "Dieses Werteprofil betont Wirkung, Integritaet und die Frage, wie Entscheidungen nach innen und aussen stimmig bleiben."
        : primaryArchetypeId === "verantwortungs_stratege"
          ? "Dieses Werteprofil verbindet wirtschaftliche Realitaet mit Verantwortung gegenueber Team, Kund:innen und langfristiger Tragfaehigkeit."
          : "Dieses Werteprofil legt den Schwerpunkt auf Ergebnisorientierung, wirtschaftliche Klarheit und konsequente Priorisierung im Alltag.",
    insights: [
      "Unter Druck hilft dir ein klarer innerer Kompass, Prioritaeten schneller zu setzen.",
      "Dein Werteprofil beeinflusst, welche Entscheidungen sich fuer dich langfristig tragfaehig anfuehlen.",
    ],
    watchouts: [
      "Gerade in angespannten Phasen lohnt es sich, implizite Werteannahmen im Team frueh sichtbar zu machen.",
      "Wenn wirtschaftlicher Druck steigt, koennen unausgesprochene rote Linien schnell zu Spannungen fuehren.",
    ],
    answered: PREVIEW_VALUES_TOTAL,
    total: PREVIEW_VALUES_TOTAL,
    clusterScores: {
      impact_idealist: primaryArchetypeId === "impact_idealist" ? 84 : secondaryArchetypeId === "impact_idealist" ? 68 : 46,
      verantwortungs_stratege:
        primaryArchetypeId === "verantwortungs_stratege"
          ? 82
          : secondaryArchetypeId === "verantwortungs_stratege"
            ? 69
            : 52,
      business_pragmatiker:
        primaryArchetypeId === "business_pragmatiker"
          ? 83
          : secondaryArchetypeId === "business_pragmatiker"
            ? 67
            : 48,
    },
  };
}
