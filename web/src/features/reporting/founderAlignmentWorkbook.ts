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
    title: "Unternehmenslogik",
    subtitle: "Wie entscheidet ihr im Alltag, was Umsatz, Fokus und Aufbau wirklich Vorrang bekommt - und was bewusst liegen bleibt?",
    prompts: [
      "Nach welcher Regel priorisiert ihr, wenn Umsatzchance, Produktqualitaet und strategischer Aufbau gleichzeitig ziehen?",
      "Welche Chancen verfolgt ihr bewusst nicht, obwohl sie kurzfristig Geld oder Sichtbarkeit bringen koennten?",
      "Ab wann kippt ein Thema von sinnvoller Chance zu Ablenkung oder Sonderlogik, die euch operativ aus dem Tritt bringt?",
      "Welche Kennzahlen, Signale oder Rueckmeldungen muessen vorliegen, bevor ihr eine groessere Prioritaetsverschiebung wirklich freigebt?",
      "Wer stoppt ein Thema, wenn es laut wirkt, aber nicht mehr zu eurem eigentlichen Fokus passt?",
    ],
    reportDimensions: ["Unternehmenslogik"],
  },
  {
    id: "roles_responsibility",
    title: "Rollen & Verantwortung",
    subtitle: "Wie legt ihr Ownership so fest, dass Arbeit nicht doppelt laeuft, nichts liegen bleibt und Verantwortung sichtbar ist?",
    prompts: [
      "Welche Bereiche haben klare Federfuehrung und wer ist dort im Alltag erste Ansprechperson?",
      "Welche Entscheidungen oder Themen brauchen trotzdem gemeinsame Freigabe, obwohl ein Bereich klar zugeordnet ist?",
      "Woran erkennt ihr frueh, dass Verantwortung unklar wird, doppelt laeuft oder zwischen euch liegen bleibt?",
      "Welche Informationen, Zahlen oder Risiken muss die verantwortliche Person von sich aus sichtbar machen und wann?",
      "Wann holt die verantwortliche Person Rueckkopplung ein, ohne die Verantwortung wieder abzugeben?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Commitment"],
  },
  {
    id: "decision_rules",
    title: "Entscheidungsregeln",
    subtitle: "Wie sorgt ihr dafuer, dass Entscheidungen auch bei Zeitdruck, Unsicherheit und Pattsituationen klar fallen?",
    prompts: [
      "Wer entscheidet final, wenn ihr euch nach einer kurzen Diskussion nicht einig seid?",
      "Bei welchen Entscheidungen ist gemeinsame Freigabe zwingend?",
      "Welche Entscheidungen darf eine Person allein treffen, ohne vorher Rueckversicherung zu holen?",
      "Welche Default-Regel gilt unter Zeitdruck konkret: Bis zu welcher Frist entscheidet eine Person direkt, wann testet ihr erst im kleinen Rahmen und wann ist bewusstes Vertagen Pflicht?",
      "Ab welchem beobachtbaren Punkt endet normale Diskussion und ihr eskaliert bewusst - zum Beispiel nach zwei Schleifen ohne Ergebnis, bei blockierter Umsetzung oder wenn Termin- oder Budgetrisiko entsteht?",
    ],
    reportDimensions: ["Entscheidungslogik"],
  },
  {
    id: "commitment_load",
    title: "Commitment & Belastung",
    subtitle: "Wie klaert ihr Verfuegbarkeit, Einsatzniveau und Ausnahmephasen so, dass keine stillen Erwartungen entstehen?",
    prompts: [
      "Welches Mindestmass an Verfuegbarkeit, Reaktionszeit und Fokus erwartet ihr im normalen Arbeitsmodus voneinander?",
      "Welche Phasen rechtfertigen voruebergehend deutlich mehr Einsatz und woran ist klar, wie lange das gelten soll?",
      "Ab wann ist reduzierte Verfuegbarkeit keine Ausnahme mehr, sondern muss aktiv neu abgestimmt werden?",
      "Welche Aufgaben, Zusagen oder Deadlines duerfen bei hoher Belastung nicht still wegrutschen?",
      "Wann wird Entlastung, Priorisierung oder ein klares Nein aktiv ausgesprochen statt still gehofft?",
    ],
    reportDimensions: ["Commitment"],
  },
  {
    id: "collaboration_conflict",
    title: "Zusammenarbeit & Konflikt",
    subtitle: "Wie regelt ihr Abstimmung, Feedback und Konfliktklaerung so, dass Reibung arbeitsfaehig bleibt?",
    prompts: [
      "Welche Irritationen sprecht ihr sofort an und was darf bis zum naechsten festen Klaerungspunkt warten?",
      "In welcher Form gebt ihr kritisches Feedback, damit es klar ist, ohne als Vorwurf oder Eingriff zu landen?",
      "Woran merkt ihr, dass ein sachlicher Konflikt kippt und jetzt bewusste Klaerung statt weiterer Detaildiskussion noetig ist?",
      "Wer initiiert die Klaerung, wenn Spannung liegen bleibt oder die Zusammenarbeit dadurch langsamer wird?",
      "Welche feste Nachregel gilt nach einer Klaerung, damit dieselbe Spannung nicht in der naechsten Woche wieder offen auflaeuft?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"],
  },
  {
    id: "ownership_risk",
    title: "Ownership & Risiko",
    subtitle: "Wie regelt ihr, wer welches Risiko fuehrt, wann Risiken sichtbar werden und ab welchem Punkt bewusst eingegriffen wird?",
    prompts: [
      "Welche Risikotypen fuehrt jeweils eine Person direkt - zum Beispiel Runway, Hiring, Technik, Kundenzusagen oder persoenliche Belastung?",
      "Welche Risiken muessen sofort sichtbar gemacht werden, auch wenn noch keine Loesung bereitsteht?",
      "Ab welcher Schwelle wird ein Risiko nicht mehr nur beobachtet, sondern aktiv neu entschieden oder gestoppt?",
      "Welche Risiken duerfen bewusst eingegangen werden und bei welchen gilt vorab eine feste Grenze?",
      "Wer zieht die Eskalation, wenn ein Risiko laenger offen bleibt oder zwischen euch unterschiedlich bewertet wird?",
    ],
    reportDimensions: ["Risikoorientierung", "Unternehmenslogik"],
  },
  {
    id: "values_guardrails",
    title: "Werte & unternehmerische Leitplanken",
    subtitle:
      "Welche Leitplanken gelten unter Druck wirklich, wie entscheidet ihr Grauzonen und wann bekommt Ergebnis klar Vorrang oder eben nicht?",
    prompts: [
      "Bei welchen Dilemmata gilt fuer euch nicht nur legal oder machbar, sondern eine bewusst engere unternehmerische Grenze?",
      "Welche Grauzonen duerfen geprueft werden und wer entscheidet, ob ein Schritt noch vertretbar ist oder schon ausserhalb eurer Linie liegt?",
      "Wann bekommt wirtschaftlicher Druck ausnahmsweise Vorrang und wann gerade nicht?",
      "Welche Partner-, Hiring- oder Vertriebsentscheidungen prueft ihr immer an denselben Leitplanken, auch wenn die Chance gross ist?",
      "Woran merkt ihr frueh, dass ihr eine Grenze gerade verschiebt, statt nur situativ sauber abzuwiegen?",
    ],
    reportDimensions: ["Unternehmenslogik", "Risikoorientierung", "Commitment"],
  },
  {
    id: "alignment_90_days",
    title: "90-Tage Alignment",
    subtitle: "Wie uebersetzt ihr eure Vereinbarungen in die naechsten 90 Tage, sodass Fortschritt sichtbar und Abweichungen frueh korrigiert werden?",
    prompts: [
      "Welche drei Themen haben in den naechsten 90 Tagen klar Vorrang und was bleibt dafuer bewusst nachrangig?",
      "Wer fuehrt jedes dieser Themen konkret und woran ist sichtbar, dass es wirklich bewegt wird?",
      "Welche naechsten Schritte muessen in den ersten zwei Wochen passiert sein, damit ihr nicht nur Absichten festhaltet?",
      "Wann schaut ihr gemeinsam auf Fortschritt, Blockaden und Abweichungen statt erst nach drei Monaten zu merken, dass etwas laeuft oder haengt?",
      "Was ist eure Stop- oder Anpassungsregel, wenn eine Vereinbarung nicht greift, ein Thema liegen bleibt oder sich Prioritaeten verschieben?",
    ],
    reportDimensions: [
      "Unternehmenslogik",
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
