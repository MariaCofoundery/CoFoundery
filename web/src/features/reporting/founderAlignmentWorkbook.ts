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
  "alignment_open_points",
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
  | "reflectionNote"
  | "deepDiveArea"
  | "deepDiveFocus"
  | "structuredOutputs"
  | "founderAApproved"
  | "founderBApproved"
  | "advisorNotes"
  | "advisorReplies";

export const WORKBOOK_STRUCTURED_STEP_IDS = WORKBOOK_STEP_IDS.filter(
  (stepId) => stepId !== "advisor_closing" && stepId !== "alignment_open_points"
) as readonly Exclude<
  FounderAlignmentWorkbookStepId,
  "advisor_closing" | "alignment_open_points"
>[];

export const ALIGNMENT_OPEN_POINT_AREA_VALUES = [
  "company_logic",
  "decision_logic",
  "work_structure",
  "commitment",
  "risk_orientation",
  "conflict_style",
  "values",
  "other",
] as const;
export type AlignmentOpenPointArea = (typeof ALIGNMENT_OPEN_POINT_AREA_VALUES)[number];

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

const LEGACY_WORKBOOK_REPLY_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export const WORKBOOK_DISCUSSION_SIGNAL_VALUES = ["important", "agree", "critical"] as const;
export const CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION = 2 as const;

export type FounderAlignmentWorkbookDiscussionAuthor = "founderA" | "founderB";
export type FounderAlignmentWorkbookDiscussionSignal =
  (typeof WORKBOOK_DISCUSSION_SIGNAL_VALUES)[number];
export type WorkbookReactionSemanticsVersion =
  typeof CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION;

export type FounderAlignmentWorkbookDiscussionEntry = {
  id: string;
  content: string;
  createdBy: FounderAlignmentWorkbookDiscussionAuthor;
  createdAt: string;
  sourceEntryId: string | null;
  updatedAt: string | null;
  updatedBy: FounderAlignmentWorkbookDiscussionAuthor | null;
};

export type FounderAlignmentWorkbookDiscussionReaction = {
  entryId: string;
  userId: FounderAlignmentWorkbookDiscussionAuthor;
  signal: FounderAlignmentWorkbookDiscussionSignal;
  updatedAt: string | null;
  semanticsVersion?: WorkbookReactionSemanticsVersion;
};

export type FounderAlignmentWorkbookStepWorkspaceV2 = {
  entries: FounderAlignmentWorkbookDiscussionEntry[];
  reactions: FounderAlignmentWorkbookDiscussionReaction[];
};

export type FounderAlignmentWorkbookOpenPoint = {
  id: string;
  area: AlignmentOpenPointArea;
  focus: string;
  founderA: string;
  founderB: string;
  reflectionNote: string;
  workspaceV2?: FounderAlignmentWorkbookStepWorkspaceV2;
  advisorReplies: FounderAlignmentWorkbookAdvisorReply[];
  createdAt: string;
  updatedAt: string | null;
};

export function upsertCurrentWorkbookDiscussionReaction(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  reaction: FounderAlignmentWorkbookDiscussionReaction
): FounderAlignmentWorkbookStepWorkspaceV2 {
  return {
    ...workspace,
    reactions: [
      ...workspace.reactions.filter(
        (candidate) =>
          !(candidate.entryId === reaction.entryId && candidate.userId === reaction.userId)
      ),
      {
        ...reaction,
        semanticsVersion: CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION,
      },
    ],
  };
}

export type FounderAlignmentWorkbookAdvisorReply = {
  id: string;
  sourceEntryId: string;
  content: string;
  advisorUserId: string | null;
  advisorName: string | null;
  createdAt: string;
  updatedAt: string | null;
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
      openPointId?: string;
      field: FounderAlignmentWorkbookStepField;
      value:
        | string
        | boolean
        | FounderAlignmentWorkbookAdvisorReply[]
        | WorkbookStructuredOutputsByStep
        | null;
    }
  | {
      scope: "step";
      stepId: FounderAlignmentWorkbookStepId;
      openPointId?: string;
      field: "workspaceEntryCreate";
      value: FounderAlignmentWorkbookDiscussionEntry;
    }
  | {
      scope: "step";
      stepId: FounderAlignmentWorkbookStepId;
      openPointId?: string;
      field: "workspaceEntryUpdate";
      value: {
        id: string;
        content: string;
        expectedUpdatedAt: string | null;
        updatedAt: string | null;
        updatedBy: FounderAlignmentWorkbookDiscussionAuthor | null;
      };
    }
  | {
      scope: "step";
      stepId: FounderAlignmentWorkbookStepId;
      openPointId?: string;
      field: "workspaceEntryDelete";
      value: {
        id: string;
        expectedUpdatedAt: string | null;
      };
    }
  | {
      scope: "step";
      stepId: FounderAlignmentWorkbookStepId;
      openPointId?: string;
      field: "workspaceReactionUpsert";
      value: FounderAlignmentWorkbookDiscussionReaction;
    }
  | {
      scope: "step";
      stepId: FounderAlignmentWorkbookStepId;
      openPointId?: string;
      field: "workspaceReactionDelete";
      value: {
        entryId: string;
        userId: FounderAlignmentWorkbookDiscussionAuthor;
      };
    }
  | {
      scope: "step";
      stepId: "alignment_open_points";
      field: "openPointCreate";
      value: FounderAlignmentWorkbookOpenPoint;
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
  reflectionNote?: string;
  deepDiveArea?: AlignmentOpenPointArea | null;
  deepDiveFocus?: string;
  openPoints?: FounderAlignmentWorkbookOpenPoint[];
  structuredOutputs?: WorkbookStructuredOutputsByStep;
  workspaceV2?: FounderAlignmentWorkbookStepWorkspaceV2;
  founderAApproved: boolean;
  founderBApproved: boolean;
  advisorNotes: string;
  advisorReplies?: FounderAlignmentWorkbookAdvisorReply[];
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
    subtitle: "Wie legt ihr fest, wer fuehrt, was sichtbar bleibt und ab wann die andere Person mit rein muss?",
    prompts: [
      "Welche Themen fuehrt eine Person klar eigenstaendig?",
      "Wo braucht die andere Person frueh Mitsicht?",
      "Ab wann wird aus Eigenverantwortung ein gemeinsames Thema?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Commitment"],
  },
  {
    id: "decision_rules",
    title: "Entscheidungen & Entscheidungshoheit",
    subtitle: "Was braucht jede Person, um wichtige Entscheidungen auch bei unterschiedlichen Sichtweisen mitzutragen?",
    prompts: [
      "Bei welchen Entscheidungen ist dir eigene Entscheidungshoheit besonders wichtig - und warum?",
      "Wann ist fachliche Zustaendigkeit fuer dich wichtiger als gemeinsames Entscheiden?",
      "Was wuerde sich fuer dich bei Entscheidungen unfair, uebergangen oder machtlos anfuehlen?",
      "Woran wuerdet ihr frueh merken, dass eure bisherige Entscheidungsregel nicht mehr gut funktioniert?",
    ],
    reportDimensions: ["Entscheidungslogik"],
  },
  {
    id: "commitment_load",
    title: "Commitment & Belastung",
    subtitle: "Wie macht ihr Einsatz, Verfuegbarkeit und Belastung frueh sichtbar, bevor stiller Druck entsteht?",
    prompts: [
      "Was ist im Normalmodus realistisch leistbar?",
      "Was muss frueh sichtbar werden, wenn Kapazitaet kippt?",
      "Was sortiert ihr zuerst neu, wenn Zusagen nicht mehr tragbar sind?",
    ],
    reportDimensions: ["Commitment"],
  },
  {
    id: "collaboration_conflict",
    title: "Konflikt & Zusammenarbeit",
    subtitle: "Was braucht jede Person, damit schwierige Konflikte angesprochen, verstanden und wieder bearbeitet werden koennen?",
    prompts: [
      "Woran koennte dein Co-Founder merken, dass dich etwas beschaeftigt, bevor du es ausdruecklich ansprichst?",
      "Was macht Feedback fuer dich leichter annehmbar - und was fuehrt eher dazu, dass du dich zurueckziehst oder verteidigst?",
      "Was brauchst du nach einem heftigen oder verletzenden Konflikt, damit Vertrauen und Zusammenarbeit wieder entstehen koennen?",
      "Was sollte passieren, wenn eine Person etwas sofort klaeren moechte und die andere zunaechst Abstand braucht?",
    ],
    reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"],
  },
  {
    id: "ownership_risk",
    title: "Ownership & Risiko",
    subtitle:
      "Wie legt ihr fest, wer Risiken fuehrt, wann sie sichtbar werden und ab welcher Schwelle gemeinsam entschieden wird?",
    prompts: [
      "Welche Risiken fuehrt eine Person selbst, und wo braucht es frueh Sichtbarkeit?",
      "Welche Schwelle beendet stille Beobachtung?",
      "Wann hat Absicherung Vorrang vor Tempo?",
    ],
    reportDimensions: ["Risikoorientierung", "Unternehmenslogik"],
  },
  {
    id: "values_guardrails",
    title: "Werte & unternehmerische Leitplanken",
    subtitle:
      "Wie legt ihr fest, was tragbar ist, was ein Grenzfall bleibt und was nicht euer Weg ist?",
    prompts: [
      "Welche Kompromisse sind fuer euch noch tragbar?",
      "Welche Faelle brauchen immer eine bewusste gemeinsame Freigabe?",
      "Was macht ihr nicht, auch wenn es wirtschaftlich attraktiv wirkt?",
    ],
    reportDimensions: ["Unternehmenslogik", "Risikoorientierung", "Commitment"],
  },
  {
    id: "alignment_90_days",
    title: "90-Tage-Fokus",
    subtitle:
      "Wie legt ihr fuer die naechsten 90 Tage klar fest, was Vorrang hat, was liegen bleibt und woran ihr Fortschritt messt?",
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
    id: "alignment_open_points",
    title: "Offene Punkte aus eurem Alignment",
    subtitle: "Vertieft einen Bereich oder einen selbst beschriebenen Punkt, der euch im Alignment aufgefallen ist.",
    prompts: [
      "Wo versteht oder bewertet ihr diesen Punkt möglicherweise unterschiedlich?",
      "Welche konkrete Erwartung, Erfahrung oder Situation steckt für euch dahinter?",
      "Was möchtest du von deinem Co-Founder dazu besser verstehen?",
    ],
    reportDimensions: [],
  },
  {
    id: "advisor_closing",
    title: "Advisor-Abschluss",
    subtitle:
      "Welche Beobachtungen, offenen Rueckfragen und naechsten Schritte sollte der Advisor am Ende sichtbar machen?",
    prompts: [
      "Was sollte dieses Team nach der Session nicht uebersehen?",
      "Welche Rueckfragen bleiben fachlich wichtig?",
      "Was ist der sinnvollste naechste Schritt?",
    ],
    reportDimensions: [],
  },
];

export function resolveFounderAlignmentWorkbookSteps(
  includeValuesStep: boolean,
  includeAdvisorStep = false,
  includeOpenPointDeepDive = false
) {
  return FOUNDER_ALIGNMENT_WORKBOOK_STEPS.filter((step) => {
    if (!includeValuesStep && step.id === "values_guardrails") {
      return false;
    }

    if (!includeAdvisorStep && step.id === "advisor_closing") {
      return false;
    }

    if (!includeOpenPointDeepDive && step.id === "alignment_open_points") {
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
          reflectionNote: "",
          deepDiveArea: null,
          deepDiveFocus: "",
          openPoints: [],
          structuredOutputs: undefined,
          workspaceV2: undefined,
          founderAApproved: false,
          founderBApproved: false,
          advisorNotes: "",
          advisorReplies: [],
        },
      ])
    ) as unknown as Record<FounderAlignmentWorkbookStepId, FounderAlignmentWorkbookEntry>,
  };
}

export function isWorkbookStructuredStepId(
  stepId: FounderAlignmentWorkbookStepId
): stepId is Exclude<
  FounderAlignmentWorkbookStepId,
  "advisor_closing" | "alignment_open_points"
> {
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

function sanitizeWorkbookAdvisorReplies(
  input: unknown,
  workspace: FounderAlignmentWorkbookStepWorkspaceV2 | undefined
): FounderAlignmentWorkbookAdvisorReply[] {
  const sourceEntryIds = new Set((workspace?.entries ?? []).map((entry) => entry.id));
  if (!Array.isArray(input) || sourceEntryIds.size === 0) {
    return [];
  }

  return input
    .map((reply) => {
      if (!reply || typeof reply !== "object") {
        return null;
      }

      const candidate = reply as {
        id?: unknown;
        sourceEntryId?: unknown;
        content?: unknown;
        advisorUserId?: unknown;
        advisorName?: unknown;
        createdAt?: unknown;
        updatedAt?: unknown;
      };

      if (
        typeof candidate.id !== "string" ||
        typeof candidate.sourceEntryId !== "string" ||
        !sourceEntryIds.has(candidate.sourceEntryId) ||
        typeof candidate.content !== "string" ||
        typeof candidate.createdAt !== "string"
      ) {
        return null;
      }

      const content = candidate.content.trim();
      if (!content) {
        return null;
      }

      return {
        id: candidate.id,
        sourceEntryId: candidate.sourceEntryId,
        content,
        advisorUserId:
          typeof candidate.advisorUserId === "string" ? candidate.advisorUserId : null,
        advisorName: typeof candidate.advisorName === "string" ? candidate.advisorName : null,
        createdAt: candidate.createdAt,
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : null,
      } satisfies FounderAlignmentWorkbookAdvisorReply;
    })
    .filter((reply): reply is FounderAlignmentWorkbookAdvisorReply => Boolean(reply));
}

function buildLegacyWorkspaceForAdvisorReplies(params: {
  founderA: string | undefined;
  founderB: string | undefined;
}): FounderAlignmentWorkbookStepWorkspaceV2 | undefined {
  const entries: FounderAlignmentWorkbookDiscussionEntry[] = [];

  if (typeof params.founderA === "string" && params.founderA.trim()) {
    entries.push({
      id: "legacy-founderA",
      content: params.founderA.trim(),
      createdBy: "founderA",
      createdAt: LEGACY_WORKBOOK_REPLY_TIMESTAMP,
      sourceEntryId: null,
      updatedAt: null,
      updatedBy: null,
    });
  }

  if (typeof params.founderB === "string" && params.founderB.trim()) {
    entries.push({
      id: "legacy-founderB",
      content: params.founderB.trim(),
      createdBy: "founderB",
      createdAt: LEGACY_WORKBOOK_REPLY_TIMESTAMP,
      sourceEntryId: null,
      updatedAt: null,
      updatedBy: null,
    });
  }

  if (entries.length === 0) {
    return undefined;
  }

  return {
    entries,
    reactions: [],
  };
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
      sourceEntryId?: unknown;
      updatedAt?: unknown;
      updatedBy?: unknown;
    }>;
    reactions?: Array<{
      entryId?: unknown;
      userId?: unknown;
      signal?: unknown;
      updatedAt?: unknown;
      semanticsVersion?: unknown;
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
            sourceEntryId: typeof entry.sourceEntryId === "string" ? entry.sourceEntryId : null,
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
            ...(reaction.semanticsVersion === CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION
              ? { semanticsVersion: CURRENT_WORKBOOK_REACTION_SEMANTICS_VERSION }
              : {}),
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

const OPEN_POINT_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export function sanitizeFounderAlignmentWorkbookOpenPoints(
  input: unknown
): FounderAlignmentWorkbookOpenPoint[] {
  if (!Array.isArray(input)) return [];

  const seenIds = new Set<string>();
  return input
    .slice(0, 24)
    .map<FounderAlignmentWorkbookOpenPoint | null>((value) => {
      if (!value || typeof value !== "object") return null;
      const raw = value as Record<string, unknown>;
      if (
        typeof raw.id !== "string" ||
        !OPEN_POINT_ID_PATTERN.test(raw.id) ||
        seenIds.has(raw.id) ||
        typeof raw.area !== "string" ||
        !ALIGNMENT_OPEN_POINT_AREA_VALUES.includes(raw.area as AlignmentOpenPointArea) ||
        typeof raw.focus !== "string"
      ) {
        return null;
      }

      seenIds.add(raw.id);
      const workspaceV2 = sanitizeWorkbookStepWorkspaceV2(raw.workspaceV2);
      return {
        id: raw.id,
        area: raw.area as AlignmentOpenPointArea,
        focus: raw.focus,
        founderA: typeof raw.founderA === "string" ? raw.founderA : "",
        founderB: typeof raw.founderB === "string" ? raw.founderB : "",
        reflectionNote: typeof raw.reflectionNote === "string" ? raw.reflectionNote : "",
        workspaceV2,
        advisorReplies: sanitizeWorkbookAdvisorReplies(raw.advisorReplies, workspaceV2),
        createdAt:
          typeof raw.createdAt === "string" ? raw.createdAt : LEGACY_WORKBOOK_REPLY_TIMESTAMP,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
      } satisfies FounderAlignmentWorkbookOpenPoint;
    })
    .filter((point): point is FounderAlignmentWorkbookOpenPoint => point != null);
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
  if (
    stepId === "vision_direction" ||
    stepId === "roles_responsibility" ||
    stepId === "decision_rules" ||
    stepId === "commitment_load" ||
    stepId === "collaboration_conflict" ||
    stepId === "ownership_risk" ||
    stepId === "values_guardrails"
  ) {
    return ["operatingRule", "escalationRule"] as WorkbookStructuredOutputType[];
  }

  if (stepId === "alignment_90_days") {
    return ["operatingRule", "escalationRule", "reviewTrigger"] as WorkbookStructuredOutputType[];
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
    FOUNDER_ALIGNMENT_WORKBOOK_STEPS.filter(
      (step) => step.id !== "advisor_closing" && step.id !== "alignment_open_points"
    ).map((step) => [
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
        reflectionNote?: unknown;
        deepDiveArea?: unknown;
        deepDiveFocus?: unknown;
        openPoints?: unknown;
        structuredOutputs?: unknown;
        workspaceV2?: unknown;
        founderAApproved?: unknown;
        founderBApproved?: unknown;
        advisorNotes?: unknown;
        advisorReplies?: unknown;
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
    const workspaceV2 = sanitizeWorkbookStepWorkspaceV2(source?.workspaceV2);
    const advisorReplyWorkspace =
      workspaceV2 ??
      buildLegacyWorkspaceForAdvisorReplies({
        founderA: typeof source?.founderA === "string" ? source.founderA : undefined,
        founderB: typeof source?.founderB === "string" ? source.founderB : undefined,
      });
    const sanitizedOpenPoints = sanitizeFounderAlignmentWorkbookOpenPoints(source?.openPoints);
    const legacyOpenPointWorkspace = workspaceV2 ?? advisorReplyWorkspace;
    const hasLegacyOpenPoint =
      step.id === "alignment_open_points" &&
      sanitizedOpenPoints.length === 0 &&
      (Boolean(typeof source?.deepDiveFocus === "string" && source.deepDiveFocus.trim()) ||
        Boolean(typeof source?.reflectionNote === "string" && source.reflectionNote.trim()) ||
        Boolean(source?.deepDiveArea) ||
        Boolean(legacyOpenPointWorkspace));
    steps[step.id] = {
      mode: source?.mode === "collaborative" ? "collaborative" : "solo",
      founderA: typeof source?.founderA === "string" ? source.founderA : "",
      founderB: typeof source?.founderB === "string" ? source.founderB : "",
      agreement: typeof source?.agreement === "string" ? source.agreement : "",
      reflectionNote: typeof source?.reflectionNote === "string" ? source.reflectionNote : "",
      deepDiveArea:
        typeof source?.deepDiveArea === "string" &&
        ALIGNMENT_OPEN_POINT_AREA_VALUES.includes(source.deepDiveArea as AlignmentOpenPointArea)
          ? (source.deepDiveArea as AlignmentOpenPointArea)
          : null,
      deepDiveFocus: typeof source?.deepDiveFocus === "string" ? source.deepDiveFocus : "",
      openPoints:
        step.id === "alignment_open_points"
          ? hasLegacyOpenPoint
            ? [
                {
                  id: "legacy-open-point",
                  area:
                    typeof source?.deepDiveArea === "string" &&
                    ALIGNMENT_OPEN_POINT_AREA_VALUES.includes(
                      source.deepDiveArea as AlignmentOpenPointArea
                    )
                      ? (source.deepDiveArea as AlignmentOpenPointArea)
                      : "other",
                  focus: typeof source?.deepDiveFocus === "string" ? source.deepDiveFocus : "",
                  founderA: typeof source?.founderA === "string" ? source.founderA : "",
                  founderB: typeof source?.founderB === "string" ? source.founderB : "",
                  reflectionNote:
                    typeof source?.reflectionNote === "string" ? source.reflectionNote : "",
                  workspaceV2: legacyOpenPointWorkspace,
                  advisorReplies: sanitizeWorkbookAdvisorReplies(
                    source?.advisorReplies,
                    legacyOpenPointWorkspace
                  ),
                  createdAt: LEGACY_WORKBOOK_REPLY_TIMESTAMP,
                  updatedAt: null,
                },
              ]
            : sanitizedOpenPoints
          : [],
      structuredOutputs: sanitizeWorkbookStructuredOutputsByStep(step.id, source?.structuredOutputs),
      workspaceV2,
      founderAApproved: source?.founderAApproved === true,
      founderBApproved: source?.founderBApproved === true,
      advisorNotes: typeof source?.advisorNotes === "string" ? source.advisorNotes : "",
      advisorReplies: sanitizeWorkbookAdvisorReplies(source?.advisorReplies, advisorReplyWorkspace),
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

/**
 * Keeps the historically shared workbook contract while removing the newer
 * founder-only Alignment Deep Dive payload. This projection must be applied
 * before an advisor workbook is returned to a client.
 *
 * decision_rules and collaboration_conflict existed in the legacy workbook,
 * so their agreement/approval/structured-output fields remain available. The
 * additive reflection/workspace fields are the new Deep Dive surface and are
 * deliberately removed. alignment_open_points is entirely founder-only.
 */
export function projectFounderAlignmentWorkbookForLegacyAdvisor(
  input: unknown
): FounderAlignmentWorkbookPayload {
  const payload = sanitizeFounderAlignmentWorkbookPayload(input);
  const projectedSteps = Object.fromEntries(
    WORKBOOK_STEP_IDS.map((stepId) => {
      const entry = payload.steps[stepId];

      if (stepId === "alignment_open_points") {
        return [stepId, buildEmptyFounderAlignmentWorkbookPayload().steps[stepId]];
      }

      if (stepId === "decision_rules" || stepId === "collaboration_conflict") {
        return [
          stepId,
          {
            ...entry,
            reflectionNote: "",
            deepDiveArea: null,
            deepDiveFocus: "",
            openPoints: [],
            workspaceV2: undefined,
          },
        ];
      }

      return [stepId, entry];
    })
  ) as Record<FounderAlignmentWorkbookStepId, FounderAlignmentWorkbookEntry>;

  return sanitizeFounderAlignmentWorkbookPayload({
    ...payload,
    currentStepId:
      payload.currentStepId === "alignment_open_points"
        ? "vision_direction"
        : payload.currentStepId,
    steps: projectedSteps,
  });
}

export function hasLegacyFounderAlignmentWorkbookContent(input: unknown): boolean {
  const payload = projectFounderAlignmentWorkbookForLegacyAdvisor(input);
  const hasStepContent = WORKBOOK_STEP_IDS.some((stepId) => {
    if (stepId === "alignment_open_points" || stepId === "advisor_closing") return false;
    const entry = payload.steps[stepId];
    return Boolean(
      entry.founderA.trim() ||
        entry.founderB.trim() ||
        entry.agreement.trim() ||
        entry.advisorNotes.trim() ||
        entry.founderAApproved ||
        entry.founderBApproved ||
        (entry.workspaceV2?.entries.length ?? 0) > 0 ||
        (entry.advisorReplies?.length ?? 0) > 0 ||
        Object.values(entry.structuredOutputs ?? {}).some((outputs) =>
          Object.values(outputs ?? {}).some(
            (value) => typeof value === "string" && value.trim().length > 0
          )
        )
    );
  });

  return Boolean(
    hasStepContent ||
      payload.advisorClosing.observations.trim() ||
      payload.advisorClosing.questions.trim() ||
      payload.advisorClosing.nextSteps.trim() ||
      payload.founderReaction.status ||
      payload.founderReaction.comment.trim()
  );
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

  const prioritizedStepIds = FOUNDER_ALIGNMENT_WORKBOOK_STEPS.filter(
    (step) =>
      step.id !== "advisor_closing" &&
      step.id !== "alignment_open_points" &&
      step.id !== "alignment_90_days" &&
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
