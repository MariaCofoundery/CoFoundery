import { normalizeDimensionName, type TeamScoringResult } from "@/features/scoring/founderScoring";
import {
  type FounderAlignmentReport,
} from "@/features/reporting/buildFounderAlignmentReport";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

export const WORKBOOK_STEP_IDS = [
  "vision_direction",
  "roles_responsibility",
  "decision_rules",
  "commitment_load",
  "collaboration_conflict",
  "ownership_risk",
  "values_guardrails",
  "alignment_90_days",
  "advisor_closing",
] as const;

export type FounderAlignmentWorkbookStepId = (typeof WORKBOOK_STEP_IDS)[number];

export type FounderAlignmentWorkbookEntry = {
  founderA: string;
  founderB: string;
  agreement: string;
  advisorNotes: string;
};

export type FounderAlignmentWorkbookAdvisorClosing = {
  observations: string;
  questions: string;
  nextSteps: string;
};

export type FounderAlignmentWorkbookFounderReactionStatus =
  | "understood"
  | "open"
  | "in_clarification"
  | null;

export type FounderAlignmentWorkbookFounderReaction = {
  status: FounderAlignmentWorkbookFounderReactionStatus;
  comment: string;
};

export type FounderAlignmentWorkbookAdvisorFollowUp =
  | "none"
  | "four_weeks"
  | "three_months";

export type FounderAlignmentWorkbookPayload = {
  currentStepId: FounderAlignmentWorkbookStepId;
  advisorId: string | null;
  advisorName: string | null;
  advisorClosing: FounderAlignmentWorkbookAdvisorClosing;
  advisorFollowUp: FounderAlignmentWorkbookAdvisorFollowUp;
  founderReaction: FounderAlignmentWorkbookFounderReaction;
  steps: Record<FounderAlignmentWorkbookStepId, FounderAlignmentWorkbookEntry>;
};

export type FounderAlignmentWorkbookStepDefinition = {
  id: FounderAlignmentWorkbookStepId;
  title: string;
  subtitle: string;
  prompts: string[];
  reportDimensions: string[];
};

export type FounderAlignmentWorkbookHighlights = {
  topStrength: string | null;
  topComplementaryDynamic: string | null;
  topTension: string | null;
  prioritizedStepIds: FounderAlignmentWorkbookStepId[];
};

export const FOUNDER_ALIGNMENT_WORKBOOK_STEPS: FounderAlignmentWorkbookStepDefinition[] = [
  {
    id: "vision_direction",
    title: "Vision & Richtung",
    subtitle: "Wohin soll sich das Unternehmen entwickeln und welche Richtung traegt euch wirklich?",
    prompts: [
      "Welche Rolle soll das Unternehmen in den naechsten drei bis fuenf Jahren in eurem Leben spielen?",
      "Wo seid ihr euch bei Wachstum, Exit-Perspektive und langfristigem Aufbau einig und wo nicht?",
      "Welche strategischen Prioritaeten sollen in Zweifelsfaellen Vorrang haben?",
    ],
    reportDimensions: ["Vision & Unternehmenshorizont"],
  },
  {
    id: "roles_responsibility",
    title: "Rollen & Verantwortung",
    subtitle: "Wer verantwortet was und wo braucht ihr Einblick, Mitsprache oder klare Ownership?",
    prompts: [
      "Welche Bereiche sollen klar in einer Hand liegen und wo braucht ihr gemeinsame Mitsprache?",
      "Wie soll Verantwortung mit Equity, Sichtbarkeit und Erwartung an Ownership zusammenpassen?",
      "Woran merkt ihr frueh, dass Rollen zu unscharf oder zu eng zugeschnitten sind?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Commitment"],
  },
  {
    id: "decision_rules",
    title: "Entscheidungsregeln",
    subtitle: "Wie trefft ihr Entscheidungen unter Zeitdruck, Unsicherheit und mit unterschiedlichen Perspektiven?",
    prompts: [
      "Welche Entscheidungen muessen gemeinsam getroffen werden und wo braucht es klare Entscheidungsrechte?",
      "Wie viel Daten, Rueckversicherung oder Intuition soll eine gute Entscheidung bei euch enthalten?",
      "Was ist eure Regel, wenn ihr bei einer wichtigen Entscheidung nicht schnell zu einer Linie findet?",
    ],
    reportDimensions: ["Entscheidungslogik"],
  },
  {
    id: "commitment_load",
    title: "Commitment & Belastung",
    subtitle: "Wie viel Fokus, Verfuegbarkeit und Belastung ist realistisch und was erwartet ihr voneinander?",
    prompts: [
      "Welchen Stellenwert soll das Startup aktuell im Alltag gegenueber anderen Verpflichtungen haben?",
      "Wie sprecht ihr darueber, wenn Verfuegbarkeit, Energie oder Belastung nicht mehr gleich verteilt sind?",
      "Welche Erwartungen an Einsatz, Tempo und Verbindlichkeit sollen explizit vereinbart werden?",
    ],
    reportDimensions: ["Commitment"],
  },
  {
    id: "collaboration_conflict",
    title: "Zusammenarbeit & Konflikt",
    subtitle: "Wie bleibt Zusammenarbeit klar, auch wenn Feedback, Reibung und unterschiedliche Stile zusammenkommen?",
    prompts: [
      "Wie eng wollt ihr euch im Alltag abstimmen, ohne euch gegenseitig auszubremsen?",
      "Wie schnell sollen Irritationen angesprochen werden und was ist fuer euch hilfreiches Feedback?",
      "Welche Spielregeln helfen euch, Meinungsverschiedenheiten produktiv zu klaeren?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"],
  },
  {
    id: "ownership_risk",
    title: "Ownership & Risiko",
    subtitle: "Wie geht ihr mit Wagnis, Finanzierung, Gehalt, Equity und unternehmerischer Verantwortung um?",
    prompts: [
      "Welche Risiken rund um Finanzierung, Gehalt, Runway oder persoenliche Sicherheit seid ihr bereit zu tragen?",
      "Wie soll Equity mit Verantwortung, Commitment und unternehmerischem Risiko zusammengedacht werden?",
      "Welche Grenzen gelten fuer Finanzierung, Verwasserung, Exit-Optionen oder persoenliche Garantien?",
    ],
    reportDimensions: ["Risikoorientierung", "Vision & Unternehmenshorizont"],
  },
  {
    id: "values_guardrails",
    title: "Werte & unternehmerische Leitplanken",
    subtitle:
      "Welche inneren Prioritaeten sollen euch unter Druck leiten und welche Grenzen sollen fuer euer Unternehmen bewusst gelten?",
    prompts: [
      "Was soll fuer euch auch unter wirtschaftlichem Druck noch klar spuerbar bleiben, wenn ihr schwierige Entscheidungen trefft?",
      "Welche Kompromisse waeren fuer euch noch tragbar und ab welchem Punkt wuerde sich etwas nicht mehr richtig anfuehlen?",
      "Welche roten Linien sollen bei Hiring, Investor:innen oder Partnerschaften fuer euch gelten?",
    ],
    reportDimensions: ["Vision & Unternehmenshorizont", "Risikoorientierung", "Commitment"],
  },
  {
    id: "alignment_90_days",
    title: "90-Tage Alignment",
    subtitle: "Welche Vereinbarungen sollen in den naechsten 90 Tagen konkret wirksam werden?",
    prompts: [
      "Welche drei Vereinbarungen muessen in den naechsten 90 Tagen im Alltag sichtbar werden?",
      "Welche Routinen, Entscheidungsformate oder Check-ins stabilisieren eure Zusammenarbeit am meisten?",
      "Woran erkennt ihr in 90 Tagen, dass eure Abstimmung tragfaehiger geworden ist?",
    ],
    reportDimensions: [
      "Vision & Unternehmenshorizont",
      "Entscheidungslogik",
      "Risikoorientierung",
      "Arbeitsstruktur & Zusammenarbeit",
      "Commitment",
      "Konfliktstil",
    ],
  },
  {
    id: "advisor_closing",
    title: "Abschlussimpulse des Advisors",
    subtitle:
      "Welche Beobachtungen, offenen Rueckfragen und naechsten Schritte sollte eine neutrale dritte Perspektive am Ende eurer Session noch sichtbar machen?",
    prompts: [
      "Welche zwei oder drei Beobachtungen sind aus Advisor-Sicht im Gesamtbild dieses Founder-Teams besonders wichtig?",
      "Welche offenen Rueckfragen sollten die Founder nach der Session noch bewusst weiterklaeren?",
      "Welche naechsten Schritte oder To-dos empfiehlt der Advisor fuer die kommenden Wochen?",
    ],
    reportDimensions: [],
  },
];

export function resolveFounderAlignmentWorkbookSteps(
  includeValuesStep: boolean,
  includeAdvisorStep = false
) {
  return FOUNDER_ALIGNMENT_WORKBOOK_STEPS.filter((step) => {
    if (!includeValuesStep && step.id === "values_guardrails") {
      return false;
    }

    if (!includeAdvisorStep && step.id === "advisor_closing") {
      return false;
    }

    return true;
  });
}

export function buildEmptyFounderAlignmentWorkbookPayload(): FounderAlignmentWorkbookPayload {
  return {
    currentStepId: FOUNDER_ALIGNMENT_WORKBOOK_STEPS[0].id,
    advisorId: null,
    advisorName: null,
    advisorClosing: {
      observations: "",
      questions: "",
      nextSteps: "",
    },
    advisorFollowUp: "none",
    founderReaction: {
      status: null,
      comment: "",
    },
    steps: Object.fromEntries(
      FOUNDER_ALIGNMENT_WORKBOOK_STEPS.map((step) => [
        step.id,
        { founderA: "", founderB: "", agreement: "", advisorNotes: "" },
      ])
    ) as Record<FounderAlignmentWorkbookStepId, FounderAlignmentWorkbookEntry>,
  };
}

export function sanitizeFounderAlignmentWorkbookPayload(
  input: unknown
): FounderAlignmentWorkbookPayload {
  const emptyPayload = buildEmptyFounderAlignmentWorkbookPayload();
  if (!input || typeof input !== "object") {
    return emptyPayload;
  }

  const raw = input as {
    currentStepId?: unknown;
    advisorId?: unknown;
    advisorName?: unknown;
    advisorClosing?: {
      observations?: unknown;
      questions?: unknown;
      nextSteps?: unknown;
    };
    advisorFollowUp?: unknown;
    founderReaction?: {
      status?: unknown;
      comment?: unknown;
    };
    steps?: Record<
      string,
      { founderA?: unknown; founderB?: unknown; agreement?: unknown; advisorNotes?: unknown }
    >;
  };

  const currentStepId =
    typeof raw.currentStepId === "string" &&
    WORKBOOK_STEP_IDS.includes(raw.currentStepId as FounderAlignmentWorkbookStepId)
      ? (raw.currentStepId as FounderAlignmentWorkbookStepId)
      : emptyPayload.currentStepId;

  const steps = { ...emptyPayload.steps };
  for (const step of FOUNDER_ALIGNMENT_WORKBOOK_STEPS) {
    const source = raw.steps?.[step.id];
    steps[step.id] = {
      founderA: typeof source?.founderA === "string" ? source.founderA : "",
      founderB: typeof source?.founderB === "string" ? source.founderB : "",
      agreement: typeof source?.agreement === "string" ? source.agreement : "",
      advisorNotes: typeof source?.advisorNotes === "string" ? source.advisorNotes : "",
    };
  }

  return {
    currentStepId,
    advisorId: typeof raw.advisorId === "string" ? raw.advisorId : null,
    advisorName: typeof raw.advisorName === "string" ? raw.advisorName : null,
    advisorClosing: {
      observations:
        typeof raw.advisorClosing?.observations === "string"
          ? raw.advisorClosing.observations
          : "",
      questions:
        typeof raw.advisorClosing?.questions === "string" ? raw.advisorClosing.questions : "",
      nextSteps:
        typeof raw.advisorClosing?.nextSteps === "string" ? raw.advisorClosing.nextSteps : "",
    },
    advisorFollowUp:
      raw.advisorFollowUp === "four_weeks" ||
      raw.advisorFollowUp === "three_months" ||
      raw.advisorFollowUp === "none"
        ? raw.advisorFollowUp
        : "none",
    founderReaction: {
      status:
        raw.founderReaction?.status === "understood" ||
        raw.founderReaction?.status === "open" ||
        raw.founderReaction?.status === "in_clarification"
          ? raw.founderReaction.status
          : null,
      comment: typeof raw.founderReaction?.comment === "string" ? raw.founderReaction.comment : "",
    },
    steps,
  };
}

function collectPriorityDimensions(scoringResult: TeamScoringResult) {
  return [
    scoringResult.executiveInsights.topStrength?.dimension ?? null,
    scoringResult.executiveInsights.topComplementaryDynamic?.dimension ?? null,
    scoringResult.executiveInsights.topTension?.dimension ?? null,
  ]
    .filter((dimension): dimension is string => Boolean(dimension))
    .map((dimension) => normalizeDimensionName(dimension));
}

export function deriveFounderAlignmentWorkbookHighlights(
  report: FounderAlignmentReport,
  scoringResult: TeamScoringResult
): FounderAlignmentWorkbookHighlights {
  const priorityDimensions = collectPriorityDimensions(scoringResult);

  const prioritizedStepIds = FOUNDER_ALIGNMENT_WORKBOOK_STEPS.filter((step) =>
    step.reportDimensions.some((dimension) =>
      priorityDimensions.includes(normalizeDimensionName(dimension))
    )
  ).map((step) => step.id);

  return {
    topStrength: report.executiveSummary.topMessages.strength,
    topComplementaryDynamic: report.executiveSummary.topMessages.complementaryDynamic,
    topTension: report.executiveSummary.topMessages.tension,
    prioritizedStepIds,
  };
}

export function workbookStepIndex(
  stepId: FounderAlignmentWorkbookStepId,
  steps: FounderAlignmentWorkbookStepDefinition[] = FOUNDER_ALIGNMENT_WORKBOOK_STEPS
) {
  return steps.findIndex((step) => step.id === stepId);
}

export function workbookNextStepId(
  stepId: FounderAlignmentWorkbookStepId,
  steps: FounderAlignmentWorkbookStepDefinition[] = FOUNDER_ALIGNMENT_WORKBOOK_STEPS
) {
  const currentIndex = workbookStepIndex(stepId, steps);
  return steps[Math.min(currentIndex + 1, steps.length - 1)].id;
}

export function workbookPreviousStepId(
  stepId: FounderAlignmentWorkbookStepId,
  steps: FounderAlignmentWorkbookStepDefinition[] = FOUNDER_ALIGNMENT_WORKBOOK_STEPS
) {
  const currentIndex = workbookStepIndex(stepId, steps);
  return steps[Math.max(currentIndex - 1, 0)].id;
}

export function founderAlignmentSummaryEntries(
  payload: FounderAlignmentWorkbookPayload,
  steps: FounderAlignmentWorkbookStepDefinition[] = FOUNDER_ALIGNMENT_WORKBOOK_STEPS
) {
  return steps.flatMap((step) => {
    const agreement = payload.steps[step.id]?.agreement.trim() ?? "";
    if (!agreement) return [];

    return [{ stepId: step.id, title: step.title, agreement }];
  });
}

export function workbookContextIntro(teamContext: TeamContext) {
  return teamContext === "existing_team"
    ? "Gemeinsame Session fuer ein bestehendes Gruenderteam, um Vereinbarungen aus dem Report in konkrete Zusammenarbeit zu uebersetzen."
    : "Gemeinsame Session fuer zwei Founder, die zentrale Erwartungen, Unterschiede und Vereinbarungen vor einer engeren Zusammenarbeit konkret machen wollen.";
}
