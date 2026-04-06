import { normalizeDimensionName, type TeamScoringResult } from "@/features/scoring/founderScoring";
import {
  type FounderAlignmentReport,
} from "@/features/reporting/buildFounderAlignmentReport";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { compareFounders, type FounderScores } from "@/features/reporting/founderMatchingEngine";
import type { FounderMatchingMarkerClass } from "@/features/reporting/founderMatchingMarkers";
import { buildFounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";

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

export type FounderAlignmentWorkbookStepMode = "solo" | "collaborative";
export type FounderAlignmentWorkbookStepStatus =
  | "collecting_inputs"
  | "draft_ready"
  | "awaiting_approval"
  | "finalized";

export type FounderAlignmentWorkbookStepField =
  | "mode"
  | "founderA"
  | "founderB"
  | "agreement"
  | "structuredOutputs"
  | "workspaceV2"
  | "founderAApproved"
  | "founderBApproved"
  | "advisorNotes";

export const WORKBOOK_STRUCTURED_STEP_IDS = WORKBOOK_STEP_IDS.filter(
  (stepId) => stepId !== "advisor_closing"
) as readonly Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">[];

export type WorkbookPilotFieldBlock = "core_rule" | "escalation_rule" | "trigger";
export type WorkbookStructuredOutputType =
  | "principle"
  | "operatingRule"
  | "escalationRule"
  | "boundaryRule"
  | "reviewTrigger";

export type WorkbookStructuredStepOutputs = {
  principle?: string;
  operatingRule?: string;
  escalationRule?: string;
  boundaryRule?: string;
  reviewTrigger?: string;
};

export type WorkbookStructuredOutputsByStep = Partial<
  Record<FounderAlignmentWorkbookStepId, WorkbookStructuredStepOutputs>
>;

export const WORKBOOK_DISCUSSION_SIGNAL_VALUES = ["important", "agree", "critical"] as const;

export type FounderAlignmentWorkbookDiscussionAuthor = "founderA" | "founderB";
export type FounderAlignmentWorkbookDiscussionSignal =
  (typeof WORKBOOK_DISCUSSION_SIGNAL_VALUES)[number];

export type FounderAlignmentWorkbookDiscussionEntry = {
  id: string;
  content: string;
  createdBy: FounderAlignmentWorkbookDiscussionAuthor;
  createdAt: string;
  updatedAt: string | null;
  updatedBy: FounderAlignmentWorkbookDiscussionAuthor | null;
};

export type FounderAlignmentWorkbookDiscussionReaction = {
  entryId: string;
  userId: FounderAlignmentWorkbookDiscussionAuthor;
  signal: FounderAlignmentWorkbookDiscussionSignal;
  updatedAt: string | null;
};

export type FounderAlignmentWorkbookStepWorkspaceV2 = {
  entries: FounderAlignmentWorkbookDiscussionEntry[];
  reactions: FounderAlignmentWorkbookDiscussionReaction[];
};

export type WorkbookStepMarker = {
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">;
  dimension: string;
  markerClass: FounderMatchingMarkerClass;
};

export type WorkbookStepMarkersByStep = Partial<
  Record<FounderAlignmentWorkbookStepId, WorkbookStepMarker>
>;

export type FounderAlignmentWorkbookRootField = "currentStepId" | "advisorFollowUp";

export type FounderAlignmentWorkbookPatch =
  | {
      scope: "step";
      stepId: FounderAlignmentWorkbookStepId;
      field: FounderAlignmentWorkbookStepField;
      value:
        | string
        | boolean
        | WorkbookStructuredOutputsByStep
        | FounderAlignmentWorkbookStepWorkspaceV2
        | null;
    }
  | {
      scope: "root";
      field: FounderAlignmentWorkbookRootField;
      value: string;
    }
  | {
      scope: "advisorClosing";
      field: keyof FounderAlignmentWorkbookAdvisorClosing;
      value: string;
    }
  | {
      scope: "founderReaction";
      field: "status" | "comment";
      value: FounderAlignmentWorkbookFounderReactionStatus | string;
    };

export type FounderAlignmentWorkbookEntry = {
  mode: FounderAlignmentWorkbookStepMode;
  founderA: string;
  founderB: string;
  agreement: string;
  structuredOutputs?: WorkbookStructuredOutputsByStep;
  workspaceV2?: FounderAlignmentWorkbookStepWorkspaceV2;
  founderAApproved: boolean;
  founderBApproved: boolean;
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
  stepMarkersByStep: WorkbookStepMarkersByStep;
};

export const FOUNDER_ALIGNMENT_WORKBOOK_STEPS: FounderAlignmentWorkbookStepDefinition[] = [
  {
    id: "vision_direction",
    title: "Unternehmenslogik",
    subtitle: "Wie entscheidet ihr im Alltag, was Vorrang bekommt, was liegen bleibt und was euch vom Kernfokus wegzieht?",
    prompts: [
      "Was bekommt Vorrang, wenn Umsatzchance, Produktfokus und Aufbau gleichzeitig ziehen?",
      "Welche Chancen oder Anfragen verfolgt ihr bewusst nicht, auch wenn sie kurzfristig Geld oder Sichtbarkeit bringen?",
      "Was gilt, wenn ein Thema Umsatz bringt, euch aber vom Kernfokus wegzieht?",
    ],
    reportDimensions: ["Unternehmenslogik"],
  },
  {
    id: "roles_responsibility",
    title: "Rollen & Verantwortung",
    subtitle: "Wie legt ihr fest, wer fuehrt, wer mitentscheidet und was sichtbar bleiben muss?",
    prompts: [
      "Wer fuehrt welchen Bereich verbindlich?",
      "Was darf diese Person allein entscheiden, ohne vorher zu fragen?",
      "Was muss sie aktiv teilen, damit nichts liegen bleibt?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Commitment"],
  },
  {
    id: "decision_rules",
    title: "Entscheidungsregeln",
    subtitle: "Wie sorgt ihr dafuer, dass Entscheidungen auch unter Druck klar fallen?",
    prompts: [
      "Was darf eine Person allein entscheiden, ohne vorher zu fragen?",
      "Wann muessen beide zustimmen?",
      "Was gilt, wenn ihr euch nicht einig seid und schnell entscheiden muesst?",
    ],
    reportDimensions: ["Entscheidungslogik"],
  },
  {
    id: "commitment_load",
    title: "Commitment & Belastung",
    subtitle: "Wie klaert ihr Einsatz, Verfuegbarkeit und Ueberlastung, bevor stiller Druck entsteht?",
    prompts: [
      "Was ist im Normalmodus bei Verfuegbarkeit und Reaktionszeit realistisch?",
      "Woran merkt ihr frueh, dass eine Person an ihre Grenze kommt?",
      "Was wird dann als Erstes neu priorisiert?",
    ],
    reportDimensions: ["Commitment"],
  },
  {
    id: "collaboration_conflict",
    title: "Zusammenarbeit & Konflikt",
    subtitle: "Wie regelt ihr Feedback, Klaerung und Konflikte so, dass sie nicht liegen bleiben oder den Alltag blockieren?",
    prompts: [
      "Was sprecht ihr sofort an und was wartet bis zu einem festen Klaerungspunkt?",
      "Wie gebt ihr kritisches Feedback, damit es klar bleibt und nicht als Angriff landet?",
      "Was passiert, wenn ein Thema im Gespraech nicht geloest wird?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"],
  },
  {
    id: "ownership_risk",
    title: "Ownership & Risiko",
    subtitle: "Wie regelt ihr, wer welches Risiko fuehrt, wann es sichtbar wird und ab welcher Schwelle ihr eingreift?",
    prompts: [
      "Wer fuehrt welchen Risikotyp verbindlich?",
      "Ab welchem Signal wird ein Risiko sofort sichtbar gemacht?",
      "Was passiert, wenn ein Risiko eine feste Schwelle erreicht?",
    ],
    reportDimensions: ["Risikoorientierung", "Unternehmenslogik"],
  },
  {
    id: "values_guardrails",
    title: "Werte & unternehmerische Leitplanken",
    subtitle:
      "Wie entscheidet ihr, wenn Geld, Wachstum oder Druck gegen eure Prinzipien laufen?",
    prompts: [
      "Wann sagt ihr bewusst nein, obwohl Geld, Wachstum oder Reichweite drin waeren?",
      "Welche Grenze ueberschreitet ihr nicht, auch wenn sie euch kurzfristig helfen wuerde?",
      "Was gilt, wenn ein Angebot euren Prinzipien widerspricht, aber operativ attraktiv ist?",
    ],
    reportDimensions: ["Unternehmenslogik", "Risikoorientierung", "Commitment"],
  },
  {
    id: "alignment_90_days",
    title: "90-Tage Alignment",
    subtitle: "Wie legt ihr fuer die naechsten 90 Tage klar fest, was Vorrang hat, was liegen bleibt und woran ihr Fortschritt messt?",
    prompts: [
      "Was hat in den naechsten 90 Tagen absolute Prioritaet?",
      "Was macht ihr bewusst nicht, auch wenn es sinnvoll wirken koennte?",
      "Woran erkennt ihr frueh, dass ihr mit euren Prioritaeten wirklich vorankommt?",
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
        {
          mode: "solo",
          founderA: "",
          founderB: "",
          agreement: "",
          structuredOutputs: undefined,
          workspaceV2: undefined,
          founderAApproved: false,
          founderBApproved: false,
          advisorNotes: "",
        },
      ])
    ) as Record<FounderAlignmentWorkbookStepId, FounderAlignmentWorkbookEntry>,
  };
}

export function isWorkbookStructuredStepId(
  stepId: FounderAlignmentWorkbookStepId
): stepId is Exclude<FounderAlignmentWorkbookStepId, "advisor_closing"> {
  return (WORKBOOK_STRUCTURED_STEP_IDS as readonly string[]).includes(stepId);
}

function readStructuredOutputString(
  raw: Record<string, unknown>,
  directKey: WorkbookStructuredOutputType,
  legacyKey?: string
) {
  if (typeof raw[directKey] === "string") {
    return raw[directKey];
  }

  if (legacyKey && typeof raw[legacyKey] === "string") {
    return raw[legacyKey];
  }

  return "";
}

function legacyStructuredOutputKeyMap(
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">
) {
  switch (stepId) {
    case "vision_direction":
      return {
        principle: "principle",
        operatingRule: "priorityRule",
        escalationRule: "escalationPath",
        boundaryRule: "nonFocusRule",
        reviewTrigger: "reviewTrigger",
      } satisfies Record<WorkbookStructuredOutputType, string>;
    case "commitment_load":
      return {
        principle: "commitmentNorm",
        operatingRule: "availabilityRule",
        escalationRule: "reprioritizationRule",
        boundaryRule: "reviewCadence",
        reviewTrigger: "overloadTrigger",
      } satisfies Record<WorkbookStructuredOutputType, string>;
    case "decision_rules":
      return {
        principle: "timePressureFallback",
        operatingRule: "decisionScopeRule",
        escalationRule: "deadlockRule",
        boundaryRule: "jointDecisionThreshold",
        reviewTrigger: "reviewTrigger",
      } satisfies Record<WorkbookStructuredOutputType, string>;
    default:
      return {
        principle: "principle",
        operatingRule: "operatingRule",
        escalationRule: "escalationRule",
        boundaryRule: "boundaryRule",
        reviewTrigger: "reviewTrigger",
      } satisfies Record<WorkbookStructuredOutputType, string>;
  }
}

function sanitizeStructuredStepOutputs(
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">,
  input: unknown
): WorkbookStructuredStepOutputs | undefined {
  if (!input || typeof input !== "object") return undefined;

  const root = input as Record<string, unknown>;
  const nested =
    root[stepId] && typeof root[stepId] === "object"
      ? (root[stepId] as Record<string, unknown>)
      : root;
  const legacyMap = legacyStructuredOutputKeyMap(stepId);

  return {
    principle: readStructuredOutputString(nested, "principle", legacyMap.principle),
    operatingRule: readStructuredOutputString(nested, "operatingRule", legacyMap.operatingRule),
    escalationRule: readStructuredOutputString(nested, "escalationRule", legacyMap.escalationRule),
    boundaryRule: readStructuredOutputString(nested, "boundaryRule", legacyMap.boundaryRule),
    reviewTrigger: readStructuredOutputString(nested, "reviewTrigger", legacyMap.reviewTrigger),
  };
}

export function sanitizeWorkbookStructuredOutputsByStep(
  stepId: FounderAlignmentWorkbookStepId,
  input: unknown
): WorkbookStructuredOutputsByStep | undefined {
  if (!isWorkbookStructuredStepId(stepId) || !input || typeof input !== "object") {
    return undefined;
  }

  return {
    [stepId]: sanitizeStructuredStepOutputs(stepId, input),
  };
}

function isDiscussionAuthor(value: unknown): value is FounderAlignmentWorkbookDiscussionAuthor {
  return value === "founderA" || value === "founderB";
}

function isDiscussionSignal(value: unknown): value is FounderAlignmentWorkbookDiscussionSignal {
  return WORKBOOK_DISCUSSION_SIGNAL_VALUES.includes(value as FounderAlignmentWorkbookDiscussionSignal);
}

export function sanitizeWorkbookStepWorkspaceV2(
  input: unknown
): FounderAlignmentWorkbookStepWorkspaceV2 | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const raw = input as {
    entries?: Array<{
      id?: unknown;
      content?: unknown;
      createdBy?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
      updatedBy?: unknown;
    }>;
    reactions?: Array<{
      entryId?: unknown;
      userId?: unknown;
      signal?: unknown;
      updatedAt?: unknown;
    }>;
  };

  const entries = Array.isArray(raw.entries)
    ? raw.entries
        .map((entry) => {
          if (
            typeof entry?.id !== "string" ||
            typeof entry?.content !== "string" ||
            !isDiscussionAuthor(entry?.createdBy) ||
            typeof entry?.createdAt !== "string"
          ) {
            return null;
          }

          const content = entry.content.trim();
          if (!content) {
            return null;
          }

          return {
            id: entry.id,
            content,
            createdBy: entry.createdBy,
            createdAt: entry.createdAt,
            updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null,
            updatedBy: isDiscussionAuthor(entry.updatedBy) ? entry.updatedBy : null,
          } satisfies FounderAlignmentWorkbookDiscussionEntry;
        })
        .filter((entry): entry is FounderAlignmentWorkbookDiscussionEntry => Boolean(entry))
    : [];

  const entryIds = new Set(entries.map((entry) => entry.id));

  const reactions = Array.isArray(raw.reactions)
    ? raw.reactions
        .map((reaction) => {
          if (
            typeof reaction?.entryId !== "string" ||
            !entryIds.has(reaction.entryId) ||
            !isDiscussionAuthor(reaction?.userId) ||
            !isDiscussionSignal(reaction?.signal)
          ) {
            return null;
          }

          return {
            entryId: reaction.entryId,
            userId: reaction.userId,
            signal: reaction.signal,
            updatedAt: typeof reaction.updatedAt === "string" ? reaction.updatedAt : null,
          } satisfies FounderAlignmentWorkbookDiscussionReaction;
        })
        .filter(
          (reaction): reaction is FounderAlignmentWorkbookDiscussionReaction => Boolean(reaction)
        )
    : [];

  if (entries.length === 0 && reactions.length === 0) {
    return undefined;
  }

  return {
    entries,
    reactions,
  };
}

export function getWorkbookStepStructuredOutputs(
  entry: FounderAlignmentWorkbookEntry,
  stepId: FounderAlignmentWorkbookStepId
) {
  if (!entry.structuredOutputs || !isWorkbookStructuredStepId(stepId)) {
    return null;
  }

  return entry.structuredOutputs[stepId] ?? null;
}

export function getWorkbookRequiredStructuredOutputKeys(
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">,
  markerClass: FounderMatchingMarkerClass
) {
  if (stepId === "decision_rules") {
    return ["operatingRule", "escalationRule"] as WorkbookStructuredOutputType[];
  }

  switch (markerClass) {
    case "stable_base":
      return ["principle", "reviewTrigger"] as WorkbookStructuredOutputType[];
    case "conditional_complement":
      return ["principle", "escalationRule"] as WorkbookStructuredOutputType[];
    case "high_rule_need":
      return ["operatingRule", "escalationRule", "reviewTrigger"] as WorkbookStructuredOutputType[];
    case "critical_clarification_point":
      return ["escalationRule", "boundaryRule"] as WorkbookStructuredOutputType[];
    default:
      return ["principle", "operatingRule"] as WorkbookStructuredOutputType[];
  }
}

export function getMissingWorkbookStructuredOutputKeys(
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">,
  outputs: ReturnType<typeof getWorkbookStepStructuredOutputs>,
  markerClass: FounderMatchingMarkerClass
) {
  const requiredKeys = getWorkbookRequiredStructuredOutputKeys(stepId, markerClass);
  return requiredKeys.filter((key) => {
    const value = outputs && key in outputs ? outputs[key as keyof typeof outputs] : "";
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function emptyFounderScores(): FounderScores {
  return {
    Unternehmenslogik: null,
    Entscheidungslogik: null,
    Risikoorientierung: null,
    "Arbeitsstruktur & Zusammenarbeit": null,
    Commitment: null,
    Konfliktstil: null,
  };
}

function scoringResultToFounderScores(scoringResult: TeamScoringResult, person: "A" | "B"): FounderScores {
  const founderScores = emptyFounderScores();

  for (const dimension of scoringResult.dimensions) {
    const normalizedDimension = normalizeDimensionName(dimension.dimension);
    if (!(normalizedDimension in founderScores)) {
      continue;
    }

    founderScores[normalizedDimension as keyof FounderScores] =
      person === "A" ? dimension.scoreA : dimension.scoreB;
  }

  return founderScores;
}

function markerSeverity(status: string | undefined) {
  switch (status) {
    case "kritisch":
      return 3;
    case "abstimmung_nötig":
      return 2;
    case "ergänzend":
      return 1;
    case "nah":
      return 0;
    default:
      return -1;
  }
}

function deriveMarkerClassForStep(
  step: FounderAlignmentWorkbookStepDefinition,
  statusMap: Map<string, string>,
  highSimilarityBlindSpotRisk: boolean
) {
  const relevantStatuses = step.reportDimensions
    .map((dimension) => statusMap.get(normalizeDimensionName(dimension)))
    .filter((status): status is string => Boolean(status));

  if (relevantStatuses.includes("kritisch")) {
    return "critical_clarification_point" as const;
  }

  if (relevantStatuses.includes("abstimmung_nötig")) {
    return "high_rule_need" as const;
  }

  if (highSimilarityBlindSpotRisk && relevantStatuses.includes("nah")) {
    return "high_rule_need" as const;
  }

  if (relevantStatuses.includes("ergänzend")) {
    return "conditional_complement" as const;
  }

  return "stable_base" as const;
}

function selectPrimaryDimensionForStep(
  step: FounderAlignmentWorkbookStepDefinition,
  statusMap: Map<string, string>
) {
  const rankedDimensions = step.reportDimensions
    .map((dimension) => ({
      dimension,
      normalized: normalizeDimensionName(dimension),
      status: statusMap.get(normalizeDimensionName(dimension)),
    }))
    .sort((a, b) => markerSeverity(b.status) - markerSeverity(a.status));

  return rankedDimensions[0]?.dimension ?? step.reportDimensions[0] ?? step.title;
}

export function deriveWorkbookStepMarkers(
  scoringResult: TeamScoringResult
): WorkbookStepMarkersByStep {
  const compareResult = compareFounders(
    scoringResultToFounderScores(scoringResult, "A"),
    scoringResultToFounderScores(scoringResult, "B")
  );
  const selection = buildFounderMatchingSelection(compareResult);
  const statusMap = new Map(
    selection.dimensionStatuses.map((entry) => [entry.dimension, entry.status] as const)
  );

  const markers = Object.fromEntries(
    FOUNDER_ALIGNMENT_WORKBOOK_STEPS.filter((step) => step.id !== "advisor_closing").map((step) => [
      step.id,
      {
        stepId: step.id,
        dimension: selectPrimaryDimensionForStep(step, statusMap),
        markerClass: deriveMarkerClassForStep(
          step,
          statusMap,
          selection.meta.highSimilarityBlindSpotRisk
        ),
      },
    ])
  ) as WorkbookStepMarkersByStep;

  return markers;
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
      {
        mode?: unknown;
        founderA?: unknown;
        founderB?: unknown;
        agreement?: unknown;
        structuredOutputs?: unknown;
        workspaceV2?: unknown;
        founderAApproved?: unknown;
        founderBApproved?: unknown;
        advisorNotes?: unknown;
      }
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
      mode: source?.mode === "collaborative" ? "collaborative" : "solo",
      founderA: typeof source?.founderA === "string" ? source.founderA : "",
      founderB: typeof source?.founderB === "string" ? source.founderB : "",
      agreement: typeof source?.agreement === "string" ? source.agreement : "",
      structuredOutputs: sanitizeWorkbookStructuredOutputsByStep(step.id, source?.structuredOutputs),
      workspaceV2: sanitizeWorkbookStepWorkspaceV2(source?.workspaceV2),
      founderAApproved: source?.founderAApproved === true,
      founderBApproved: source?.founderBApproved === true,
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
    stepMarkersByStep: deriveWorkbookStepMarkers(scoringResult),
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
