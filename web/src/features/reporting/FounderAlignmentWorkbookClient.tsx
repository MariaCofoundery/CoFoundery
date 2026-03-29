"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  prepareFounderAlignmentAdvisorInvite,
  saveFounderAlignmentWorkbook,
} from "@/features/reporting/founderAlignmentWorkbookActions";
import { type FounderAlignmentWorkbookViewerRole } from "@/features/reporting/founderAlignmentWorkbookData";
import {
  WORKBOOK_STEP_CONTENT,
  type WorkbookStructuredOutputField,
} from "@/features/reporting/founderAlignmentWorkbookStepContent";
import {
  FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  resolveFounderAlignmentWorkbookSteps,
  sanitizeFounderAlignmentWorkbookPayload,
  workbookContextIntro,
  workbookNextStepId,
  workbookPreviousStepId,
  workbookStepIndex,
  type FounderAlignmentWorkbookHighlights,
  type FounderAlignmentWorkbookAdvisorClosing,
  type FounderAlignmentWorkbookAdvisorFollowUp,
  type FounderAlignmentWorkbookFounderReactionStatus,
  type FounderAlignmentWorkbookPayload,
  type FounderAlignmentWorkbookStepId,
} from "@/features/reporting/founderAlignmentWorkbook";
import { type FounderAlignmentWorkbookAdvisorInviteState } from "@/features/reporting/founderAlignmentWorkbookAdvisor";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { trackResearchEvent } from "@/features/research/client";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type FounderAlignmentWorkbookClientProps = {
  invitationId: string | null;
  teamContext: TeamContext;
  founderAName: string | null;
  founderBName: string | null;
  currentUserRole: FounderAlignmentWorkbookViewerRole;
  initialWorkbook: FounderAlignmentWorkbookPayload;
  highlights: FounderAlignmentWorkbookHighlights;
  advisorInvite: FounderAlignmentWorkbookAdvisorInviteState;
  showValuesStep: boolean;
  canSave: boolean;
  persisted: boolean;
  updatedAt: string | null;
  source: "live" | "mock";
  storedTeamContext: TeamContext | null;
  hasTeamContextMismatch: boolean;
  reportHeadline: string;
};

type WorkbookEditableField = "founderA" | "founderB" | "agreement" | "advisorNotes";
type AdvisorClosingField = keyof FounderAlignmentWorkbookAdvisorClosing;
type FounderReactionField = "status" | "comment";
type AdvisorFollowUpOption = FounderAlignmentWorkbookAdvisorFollowUp;
type WorkbookEditingMode = "personal" | "joint";
type StructuredAgreementValues = Record<string, string>;

const AGREEMENT_DRAFT_META: Record<
  FounderAlignmentWorkbookStepId,
  {
    fallbackSharedThemes: string[];
    differenceFocus: string;
    ruleFocus: string;
    themeSignals: Array<{ label: string; keywords: string[] }>;
  }
> = {
  vision_direction: {
    fallbackSharedThemes: ["eine tragfaehige Richtung", "klare Prioritaeten"],
    differenceFocus: "Wachstum, strategische Prioritaeten und langfristige Zielbilder",
    ruleFocus:
      "Strategische Chancen, Wachstumsschritte und Richtungsentscheidungen spiegeln wir kuenftig an dieser gemeinsamen Linie.",
    themeSignals: [
      { label: "Wachstum", keywords: ["wachstum", "skal", "expand", "tempo"] },
      { label: "Exit-Perspektive", keywords: ["exit", "verkauf", "verkaufen"] },
      { label: "langfristiger Aufbau", keywords: ["langfrist", "aufbau", "nachhalt", "dauerhaft"] },
      { label: "strategische Prioritaeten", keywords: ["priorit", "fokus", "richtung", "strategie"] },
    ],
  },
  roles_responsibility: {
    fallbackSharedThemes: ["klare Zuständigkeiten", "ein passender Arbeitsrhythmus"],
    differenceFocus: "Abstimmungsnähe, Sichtbarkeit und Zuständigkeiten im Alltag",
    ruleFocus:
      "Abstimmung, Sichtbarkeit und Zuständigkeiten ordnen wir entlang dieser Vereinbarung und klären Abweichungen früh.",
    themeSignals: [
      { label: "klare Rollen", keywords: ["rolle", "rollen", "zustaendig", "verantwort"] },
      { label: "Eigenraum", keywords: ["ownership", "own", "autonom", "eigenstaendig", "federfuehr"] },
      { label: "Sichtbarkeit", keywords: ["mitsprache", "einblick", "abstimmung", "informiert", "sichtbar"] },
      { label: "Equity und Verantwortung", keywords: ["equity", "anteil", "anteile", "beteilig"] },
    ],
  },
  decision_rules: {
    fallbackSharedThemes: ["klare Entscheidungsregeln", "eine tragfaehige Entscheidungsbasis"],
    differenceFocus: "Tempo, Absicherung und Entscheidungsverantwortung",
    ruleFocus:
      "Wichtige Entscheidungen treffen wir kuenftig entlang dieser gemeinsamen Arbeitsgrundlage und benennen frueh, wann mehr Abstimmung noetig ist.",
    themeSignals: [
      { label: "Entscheidungstempo", keywords: ["schnell", "tempo", "zeitnah", "sofort"] },
      { label: "Absicherung", keywords: ["absicher", "pruef", "sorgfalt", "rueckversicherung"] },
      { label: "Datenbasis", keywords: ["daten", "analyse", "zahlen", "fakten"] },
      { label: "Intuition und Erfahrung", keywords: ["intuition", "bauch", "erfahrung", "marktgefuehl"] },
      { label: "klare Entscheidungsrechte", keywords: ["entscheidungsrecht", "verantwort", "konsens", "gemeinsam"] },
    ],
  },
  commitment_load: {
    fallbackSharedThemes: ["realistische Verbindlichkeit", "klar abgestimmte Verfuegbarkeit"],
    differenceFocus: "Verfuegbarkeit, Belastung und Prioritaeten im Alltag",
    ruleFocus:
      "Erwartungen an Fokus, Verfuegbarkeit und Belastung sprechen wir daran kuenftig explizit ab und passen sie bei Veraenderungen frueh an.",
    themeSignals: [
      { label: "Verfuegbarkeit", keywords: ["verfueg", "zeit", "praesenz", "erreichbar"] },
      { label: "Fokus auf das Startup", keywords: ["fokus", "prioritaet", "startup", "hauptthema"] },
      { label: "Belastung", keywords: ["belast", "energie", "kapazit", "erschoepf"] },
      { label: "Verbindlichkeit", keywords: ["verbind", "commit", "einsatz", "zuverlaess"] },
    ],
  },
  collaboration_conflict: {
    fallbackSharedThemes: ["eine verlaessliche Zusammenarbeit", "klare Spielregeln fuer Abstimmung"],
    differenceFocus: "Abstimmung, Feedback und der Umgang mit Irritationen",
    ruleFocus:
      "Abstimmung, Feedback und Irritationen besprechen wir so, dass beide Perspektiven darin Platz haben und Reibung frueh bearbeitet wird.",
    themeSignals: [
      { label: "enge Abstimmung", keywords: ["abstimmung", "eng", "austausch", "einbindung"] },
      { label: "Eigenstaendigkeit", keywords: ["autonom", "eigenstaendig", "freiheit", "selbststaendig"] },
      { label: "fruehes Feedback", keywords: ["feedback", "frueh", "direkt", "ansprechen"] },
      { label: "ruhige Klaerung", keywords: ["ruhe", "abstand", "reflekt", "spaeter"] },
      { label: "klare Spielregeln", keywords: ["spielregel", "konflikt", "reibu", "meinungsverschieden"] },
    ],
  },
  ownership_risk: {
    fallbackSharedThemes: ["bewusstes Risikomanagement", "klare Verantwortung fuer kritische Entscheidungen"],
    differenceFocus: "Risiko, Finanzierung, Equity und persoenliche Absicherung",
    ruleFocus:
      "Fragen zu Risiko, Finanzierung und Verantwortung gleichen wir kuenftig an dieser Vereinbarung ab und entscheiden daran entlang, was fuer beide tragbar ist.",
    themeSignals: [
      { label: "Finanzierung", keywords: ["finanz", "fundraising", "invest", "runway"] },
      { label: "Gehalt und Sicherheit", keywords: ["gehalt", "sicherheit", "einkommen", "privat"] },
      { label: "Equity", keywords: ["equity", "anteil", "verwasser", "beteilig"] },
      { label: "Risikobereitschaft", keywords: ["risiko", "wagnis", "mut", "unsicherheit"] },
      { label: "persoenliche Grenzen", keywords: ["grenze", "garantie", "haft", "tragbar"] },
    ],
  },
  values_guardrails: {
    fallbackSharedThemes: ["klare Leitplanken", "bewusste Wertentscheidungen"],
    differenceFocus: "tragbare Kompromisse, rote Linien und Entscheidungen unter wirtschaftlichem Druck",
    ruleFocus:
      "Wenn kritische Entscheidungen anstehen, gleichen wir sie bewusst an diesen Leitplanken ab und benennen frueh, was fuer uns nicht verhandelbar ist.",
    themeSignals: [
      { label: "klare rote Linien", keywords: ["rote linie", "grenze", "nicht verhandelbar", "tabu"] },
      { label: "Werte unter Druck", keywords: ["druck", "krise", "unter druck", "wirtschaftlich"] },
      { label: "tragbare Kompromisse", keywords: ["kompromiss", "tragbar", "vertretbar", "zumutbar"] },
      { label: "Hiring und Teamkultur", keywords: ["hiring", "einstellung", "teamkultur", "kultur"] },
      { label: "Investoren und Partnerschaften", keywords: ["investor", "partner", "partnerschaft", "beteilig"] },
    ],
  },
  alignment_90_days: {
    fallbackSharedThemes: ["konkrete naechste Schritte", "sichtbare Vereinbarungen fuer den Alltag"],
    differenceFocus: "Prioritaeten, Routinen und konkrete Umsetzungsschritte",
    ruleFocus:
      "Daran richten wir unsere naechsten Schritte, Routinen und Entscheidungen in den kommenden 90 Tagen konkret aus.",
    themeSignals: [
      { label: "klare Prioritaeten", keywords: ["prioritaet", "fokus", "zuerst", "wichtig"] },
      { label: "Routinen", keywords: ["routine", "check-in", "weekly", "regelmaess"] },
      { label: "konkrete Verantwortung", keywords: ["verantwort", "owner", "zustaendig", "zuordnen"] },
      { label: "messbare Umsetzung", keywords: ["sichtbar", "messbar", "umsetzung", "ergebnis"] },
    ],
  },
  advisor_closing: {
    fallbackSharedThemes: ["eine klare Aussenperspektive", "konkrete Abschlussimpulse"],
    differenceFocus: "Beobachtungen, offene Rueckfragen und empfohlene naechste Schritte",
    ruleFocus:
      "Diese Beobachtungen und Empfehlungen dienen als getrennte Aussenperspektive und sollen Founder-Vereinbarungen nicht ersetzen.",
    themeSignals: [
      { label: "Muster und Beobachtungen", keywords: ["beobacht", "muster", "dynamik", "signal"] },
      { label: "offene Rueckfragen", keywords: ["rueckfrage", "offen", "klaeren", "unklar"] },
      { label: "naechste Schritte", keywords: ["naechste schritte", "todo", "follow-up", "empfehl"] },
    ],
  },
};

type StepClarity = "open" | "partial" | "clear";

type AgreementDraftResult = {
  draft: string;
  sourceMode: "solo" | "joint";
  state: "aligned" | "different" | "unclear" | "solo";
  comparisonLabel: string | null;
  comparisonHint: string | null;
  suggestionTitle: string;
  suggestionIntro: string;
};

type SpeechSupportState = "unknown" | "supported" | "unsupported";
type DictationStatus = "idle" | "listening" | "paused" | "ended" | "error";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const STEP_CLARITY_OPTIONS: Array<{ value: StepClarity; label: string }> = [
  { value: "open", label: "Offen" },
  { value: "partial", label: t("In Arbeit") },
  { value: "clear", label: "Regel steht" },
];

function getStructuredPerspectivePrompt(stepId: FounderAlignmentWorkbookStepId) {
  switch (stepId) {
    case "vision_direction":
      return "Wie wuerdest du hier konkret priorisieren?";
    case "decision_rules":
      return "Was wuerdest du hier als klare Regel festlegen?";
    case "commitment_load":
      return "Was wuerdest du hier realistisch zusagen?";
    case "collaboration_conflict":
      return "Wie wuerdest du das hier konkret ansprechen und klaeren?";
    case "ownership_risk":
      return "Wie wuerdest du dieses Risiko fuehren und ab wann eingreifen?";
    case "values_guardrails":
      return "Wie wuerdest du hier konkret entscheiden?";
    case "alignment_90_days":
      return "Was wuerdest du in den naechsten 90 Tagen klar priorisieren?";
    case "roles_responsibility":
      return "Wie wuerdest du hier Verantwortung und Freigabe regeln?";
    default:
      return "Was wuerdest du konkret tun?";
  }
}

const FOUNDER_REACTION_OPTIONS: Array<{
  value: Exclude<FounderAlignmentWorkbookFounderReactionStatus, null>;
  label: string;
}> = [
  { value: "understood", label: t("verstanden") },
  { value: "open", label: "offen" },
  { value: "in_clarification", label: t("wird geklaert") },
];

const ADVISOR_FOLLOW_UP_OPTIONS: Array<{
  value: AdvisorFollowUpOption;
  label: string;
}> = [
  { value: "none", label: t("Kein Check-in gesetzt") },
  { value: "four_weeks", label: t("Check-in in 4 Wochen") },
  { value: "three_months", label: t("Check-in in 3 Monaten") },
];

const AVAILABLE_SPEECH_LANGUAGES = ["de-DE", "en-US"] as const;
const DEFAULT_SPEECH_LANGUAGE = AVAILABLE_SPEECH_LANGUAGES[0];
const DICTATION_INACTIVITY_MS = 9000;
const DICTATION_RESTART_MS = 250;
const WORKBOOK_AUTOSAVE_DELAY_MS = 1800;

export function FounderAlignmentWorkbookClient({
  invitationId,
  teamContext,
  founderAName,
  founderBName,
  currentUserRole,
  initialWorkbook,
  highlights,
  advisorInvite,
  showValuesStep,
  canSave,
  persisted,
  updatedAt,
  source,
  storedTeamContext,
  hasTeamContextMismatch,
  reportHeadline,
}: FounderAlignmentWorkbookClientProps) {
  const [workbook, setWorkbook] = useState(initialWorkbook);
  const [saveState, setSaveState] = useState<{
    kind: "idle" | "dirty" | "saving" | "saved" | "autosaved" | "error";
    message: string | null;
    updatedAt: string | null;
  }>({
    kind: "idle",
    message: null,
    updatedAt,
  });
  const [, startTransition] = useTransition();
  const [editingMode, setEditingMode] = useState<WorkbookEditingMode>(
    currentUserRole === "founderA" || currentUserRole === "founderB" ? "personal" : "joint"
  );
  const [stepClarity, setStepClarity] = useState<
    Record<FounderAlignmentWorkbookStepId, StepClarity | null>
  >(() =>
    Object.fromEntries(
      FOUNDER_ALIGNMENT_WORKBOOK_STEPS.map((step) => [step.id, null])
    ) as Record<FounderAlignmentWorkbookStepId, StepClarity | null>
  );
  const [revealedStatusSteps, setRevealedStatusSteps] = useState<
    Record<FounderAlignmentWorkbookStepId, boolean>
  >(() =>
    Object.fromEntries(
      FOUNDER_ALIGNMENT_WORKBOOK_STEPS.map((step) => [step.id, false])
    ) as Record<FounderAlignmentWorkbookStepId, boolean>
  );
  const [showSummaryView, setShowSummaryView] = useState(false);
  const [showFullExportView, setShowFullExportView] = useState(false);
  const [agreementFieldFocusSignal, setAgreementFieldFocusSignal] = useState(0);
  const [advisorInviteState, setAdvisorInviteState] =
    useState<FounderAlignmentWorkbookAdvisorInviteState>(advisorInvite);
  const [advisorInviteMessage, setAdvisorInviteMessage] = useState<string | null>(null);
  const [advisorInviteLink, setAdvisorInviteLink] = useState<string | null>(null);
  const currentStepRef = useRef<HTMLElement | null>(null);
  const shouldScrollToStepRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedSnapshotRef = useRef(serializeWorkbookPayload(initialWorkbook));
  const saveSequenceRef = useRef(0);
  const hasActiveAdvisor = Boolean(
    workbook.advisorId || advisorInviteState.advisorLinked || currentUserRole === "advisor"
  );
  const visibleSteps = useMemo(
    () => resolveFounderAlignmentWorkbookSteps(showValuesStep, hasActiveAdvisor),
    [hasActiveAdvisor, showValuesStep]
  );
  const activeStepId = visibleSteps.some((step) => step.id === workbook.currentStepId)
    ? workbook.currentStepId
    : (visibleSteps[0]?.id ?? workbook.currentStepId);
  const currentIndex = workbookStepIndex(activeStepId, visibleSteps);
  const currentStep = visibleSteps[Math.max(currentIndex, 0)];
  const founderALabel = founderAName?.trim() || "Founder A";
  const founderBLabel = founderBName?.trim() || "Founder B";
  const advisorLabel = workbook.advisorName?.trim() || advisorInviteState.advisorName?.trim() || "Moderation";
  const otherFounderLabel = currentUserRole === "founderA" ? founderBLabel : founderALabel;
  const showAdvisorInviteCard =
    currentUserRole === "founderA" ||
    currentUserRole === "founderB" ||
    advisorInviteState.founderAApproved ||
    advisorInviteState.founderBApproved ||
    advisorInviteState.advisorLinked;
  const printWorksheetHref = invitationId
    ? `/founder-alignment/workbook/print?invitationId=${invitationId}&teamContext=${teamContext}`
    : `/founder-alignment/workbook/print?teamContext=${teamContext}`;
  const progress = ((Math.max(currentIndex, 0) + 1) / visibleSteps.length) * 100;
  const currentStepContent = WORKBOOK_STEP_CONTENT[currentStep.id];
  const currentStructuredOutputFields = currentStepContent.outputFields ?? null;
  const currentStepUsesStructuredOutput = Boolean(
    currentStructuredOutputFields && currentStructuredOutputFields.length > 0
  );
  const currentStepHasSingleStructuredOutput =
    Boolean(currentStructuredOutputFields) && currentStructuredOutputFields?.length === 1;
  const currentStepIsAdvisorClosing = currentStep.id === "advisor_closing";
  const isFocusedStep = highlights.prioritizedStepIds.includes(currentStep.id);
  const hasBothPerspectives =
    workbook.steps[currentStep.id].founderA.trim().length > 0 &&
    workbook.steps[currentStep.id].founderB.trim().length > 0;
  const personalDraftSource =
    currentUserRole === "founderB"
      ? workbook.steps[currentStep.id].founderB
      : workbook.steps[currentStep.id].founderA;
  const currentAgreementDraft = useMemo(() => {
    if (currentStepUsesStructuredOutput || currentStepIsAdvisorClosing) {
      return null;
    }

    if (editingMode === "joint") {
      if (!hasBothPerspectives) return null;
      return buildAgreementDraft({
        stepId: currentStep.id,
        founderAResponse: workbook.steps[currentStep.id].founderA,
        founderBResponse: workbook.steps[currentStep.id].founderB,
        sourceMode: "joint",
      });
    }

    if (!personalDraftSource.trim()) {
      return null;
    }

    return buildAgreementDraft({
      stepId: currentStep.id,
      founderAResponse: personalDraftSource,
      founderBResponse: "",
      sourceMode: "solo",
    });
  }, [
    currentStep.id,
    currentStepIsAdvisorClosing,
    currentStepUsesStructuredOutput,
    editingMode,
    hasBothPerspectives,
    personalDraftSource,
    workbook.steps,
  ]);
  const orderedPerspectiveFields = useMemo<["founderA" | "founderB", "founderA" | "founderB"]>(
    () =>
      editingMode === "joint"
        ? ["founderA", "founderB"]
        : currentUserRole === "founderB"
          ? ["founderB", "founderA"]
          : ["founderA", "founderB"],
    [currentUserRole, editingMode]
  );
  const [primaryPerspectiveField, secondaryPerspectiveField] = orderedPerspectiveFields;
  const primaryPerspectiveHasValue =
    workbook.steps[currentStep.id][primaryPerspectiveField].trim().length > 0;
  const currentAgreementValue = workbook.steps[currentStep.id].agreement.trim();
  const currentStepHasAgreement = currentAgreementValue.length > 0;
  const stepProgressMeta = useMemo(
    () =>
      Object.fromEntries(
        visibleSteps.map((step) => {
          const stepEntry = workbook.steps[step.id];
          const hasPerspectiveInput =
            stepEntry.founderA.trim().length > 0 || stepEntry.founderB.trim().length > 0;
          const hasAgreement = stepEntry.agreement.trim().length > 0;
          const hasAdvisorNotes = stepEntry.advisorNotes.trim().length > 0;
          const hasAdvisorClosingContent =
            step.id === "advisor_closing"
              ? [
                  workbook.advisorClosing.observations,
                  workbook.advisorClosing.questions,
                  workbook.advisorClosing.nextSteps,
                  workbook.founderReaction.comment,
                ].some((value) => value.trim().length > 0) ||
                workbook.founderReaction.status !== null
              : false;
          const clarityState = stepClarity[step.id];
          const completed =
            clarityState === "clear" ||
            (step.id === "advisor_closing" ? hasAdvisorClosingContent : hasAgreement);
          const started =
            completed ||
            clarityState === "partial" ||
            clarityState === "open" ||
            hasPerspectiveInput ||
            hasAdvisorNotes ||
            hasAdvisorClosingContent;

          return [
            step.id,
            {
              completed,
              started,
            },
          ];
        })
      ) as Record<FounderAlignmentWorkbookStepId, { completed: boolean; started: boolean }>,
    [
      stepClarity,
      visibleSteps,
      workbook.advisorClosing.nextSteps,
      workbook.advisorClosing.observations,
      workbook.advisorClosing.questions,
      workbook.founderReaction.comment,
      workbook.founderReaction.status,
      workbook.steps,
    ]
  );
  const completedStepsCount = visibleSteps.filter(
    (step) => stepProgressMeta[step.id]?.completed
  ).length;
  const comparisonSectionVisible = !currentStepUsesStructuredOutput;
  const outputSectionNumber = comparisonSectionVisible ? 5 : 4;
  const structuredAgreement = currentStepUsesStructuredOutput && currentStructuredOutputFields
    ? parseStructuredAgreement(
        workbook.steps[currentStep.id].agreement,
        currentStructuredOutputFields
      )
    : null;
  const showStatusSection =
    !currentStepIsAdvisorClosing &&
    (revealedStatusSteps[currentStep.id] || stepClarity[currentStep.id] !== null);
  const showAdvisorNotesSection =
    advisorInviteState.founderAApproved ||
    advisorInviteState.founderBApproved ||
    advisorInviteState.advisorLinked ||
    currentUserRole === "advisor";
  const workbookSummaryItems = useMemo(
    () =>
      visibleSteps.map((step) => {
        return {
          id: step.id,
          title: step.title,
          agreement: workbook.steps[step.id].agreement.trim(),
          advisorNotes: workbook.steps[step.id].advisorNotes.trim(),
          advisorClosing:
            step.id === "advisor_closing"
              ? {
                  observations: workbook.advisorClosing.observations.trim(),
                  questions: workbook.advisorClosing.questions.trim(),
                  nextSteps: workbook.advisorClosing.nextSteps.trim(),
                }
              : null,
          advisorFollowUp: step.id === "advisor_closing" ? workbook.advisorFollowUp : null,
          founderReaction:
            step.id === "advisor_closing"
              ? {
                  status: workbook.founderReaction.status,
                  comment: workbook.founderReaction.comment.trim(),
                }
              : null,
          status: stepClarity[step.id],
        };
      }),
    [
      stepClarity,
      visibleSteps,
      workbook.advisorClosing,
      workbook.advisorFollowUp,
      workbook.founderReaction,
      workbook.steps,
    ]
  );
  const unresolvedSummaryItems = workbookSummaryItems.filter(
    (item) => item.status === "open" || item.status === "partial"
  );
  const workbookExportItems = useMemo(
    () =>
      visibleSteps.map((step) => {
        const content = WORKBOOK_STEP_CONTENT[step.id];

        return {
          id: step.id,
          title: step.title,
          subtitle: step.subtitle,
          context: content.context,
          everyday: content.everyday,
          prompts: step.prompts,
          founderAResponse: workbook.steps[step.id].founderA.trim(),
          founderBResponse: workbook.steps[step.id].founderB.trim(),
          agreement: workbook.steps[step.id].agreement.trim(),
          advisorNotes: workbook.steps[step.id].advisorNotes.trim(),
          advisorClosing:
            step.id === "advisor_closing"
              ? {
                  observations: workbook.advisorClosing.observations.trim(),
                  questions: workbook.advisorClosing.questions.trim(),
                  nextSteps: workbook.advisorClosing.nextSteps.trim(),
                }
              : null,
          advisorFollowUp: step.id === "advisor_closing" ? workbook.advisorFollowUp : null,
          founderReaction:
            step.id === "advisor_closing"
              ? {
                  status: workbook.founderReaction.status,
                  comment: workbook.founderReaction.comment.trim(),
                }
              : null,
          status: stepClarity[step.id],
        };
      }),
    [
      stepClarity,
      visibleSteps,
      workbook.advisorClosing,
      workbook.advisorFollowUp,
      workbook.founderReaction,
      workbook.steps,
    ]
  );

  const formattedUpdatedAt = useMemo(() => {
    if (!saveState.updatedAt) return null;
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(saveState.updatedAt));
  }, [saveState.updatedAt]);

  const saveStatusMeta = useMemo(() => {
    if (!canSave || source === "mock") {
      return {
        label: t("Vorschau ohne Speichern"),
        tone: "neutral" as const,
      };
    }

    switch (saveState.kind) {
      case "dirty":
        return { label: t("Wird gleich gesichert"), tone: "warning" as const };
      case "saving":
        return { label: t("Speichert"), tone: "info" as const };
      case "autosaved":
      case "saved":
        return { label: t("Alles gesichert"), tone: "success" as const };
      case "error":
        return { label: t("Speichern klappt gerade nicht"), tone: "error" as const };
      default:
        return {
          label: persisted ? t("Bereit") : t("Startklar"),
          tone: "neutral" as const,
        };
    }
  }, [canSave, persisted, saveState.kind, source]);
  const saveStatusDetail = useMemo(() => {
    if (!canSave || source === "mock") {
      return t("Diese Vorschau speichert keine Eingaben.");
    }

    switch (saveState.kind) {
      case "dirty":
        return t("Aenderungen werden automatisch gesichert.");
      case "saving":
        return t("Euer aktueller Stand wird gerade gesichert.");
      case "autosaved":
      case "saved":
        return formattedUpdatedAt
          ? `${t("Alles gesichert")} · ${formattedUpdatedAt}`
          : t("Alles gesichert.");
      case "error":
        return t("Bitte kurz warten. Euer letzter gesicherter Stand bleibt erhalten.");
      default:
        return persisted
          ? t("Euer Stand ist geladen und bleibt automatisch gesichert.")
          : t("Sobald ihr losschreibt, wird euer Stand automatisch gesichert.");
    }
  }, [canSave, formattedUpdatedAt, persisted, saveState.kind, source]);

  useEffect(() => {
    if (!shouldScrollToStepRef.current) return;

    shouldScrollToStepRef.current = false;
    currentStepRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeStepId, showSummaryView, showFullExportView]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  function canEditField(field: WorkbookEditableField) {
    if (currentUserRole === "advisor") {
      return field === "advisorNotes";
    }

    if (currentUserRole !== "founderA" && currentUserRole !== "founderB") {
      return false;
    }

    if (field === "agreement") {
      return true;
    }

    if (field === "advisorNotes") {
      return false;
    }

    if (editingMode === "joint") {
      return true;
    }

    return currentUserRole === "founderA" ? field === "founderA" : field === "founderB";
  }

  function canEditAdvisorClosing() {
    return currentUserRole === "advisor";
  }

  function canEditFounderReaction() {
    return currentUserRole === "founderA" || currentUserRole === "founderB";
  }

  function updateAdvisorFollowUp(value: AdvisorFollowUpOption) {
    if (!canEditAdvisorClosing()) {
      return;
    }

    setSaveState((current) => ({
      ...current,
      kind: canSave ? "dirty" : current.kind,
      message: canSave ? t("Aenderungen werden gleich gesichert") : current.message,
    }));
    setWorkbook((current) => ({
      ...current,
      advisorFollowUp: value,
    }));
  }

  function getFieldReadOnlyHint(field: WorkbookEditableField) {
    if (canEditField(field)) {
      return null;
    }

    if (field === "founderA") {
      return t(`Dieses Feld wird von ${founderALabel} ausgefuellt.`);
    }

    if (field === "founderB") {
      return t(`Dieses Feld wird von ${founderBLabel} ausgefuellt.`);
    }

    if (field === "advisorNotes") {
      return t(`Dieses Feld wird von ${advisorLabel} ausgefuellt.`);
    }

    return null;
  }

  function updateEntry(field: WorkbookEditableField, value: string) {
    if (!canEditField(field)) {
      return;
    }

    setSaveState((current) => ({
      ...current,
      kind: canSave ? "dirty" : current.kind,
      message: canSave ? t("Aenderungen werden gleich gesichert") : current.message,
    }));
    setWorkbook((current) => ({
      ...current,
      steps: {
        ...current.steps,
        [activeStepId]: {
          ...current.steps[activeStepId],
          [field]: value,
        },
      },
    }));
  }

  function updateStructuredAgreementField(
    field: string,
    value: string
  ) {
    if (!currentStepUsesStructuredOutput || !currentStructuredOutputFields) {
      return;
    }

    const currentAgreement = parseStructuredAgreement(
      workbook.steps[currentStep.id].agreement,
      currentStructuredOutputFields
    );
    updateEntry(
      "agreement",
      serializeStructuredAgreement(currentStructuredOutputFields, {
        ...currentAgreement,
        [field]: value,
      })
    );
  }

  function updateAdvisorClosing(field: AdvisorClosingField, value: string) {
    if (!canEditAdvisorClosing()) {
      return;
    }

    setSaveState((current) => ({
      ...current,
      kind: canSave ? "dirty" : current.kind,
      message: canSave ? t("Aenderungen werden gleich gesichert") : current.message,
    }));
    setWorkbook((current) => ({
      ...current,
      advisorClosing: {
        ...current.advisorClosing,
        [field]: value,
      },
    }));
  }

  function updateFounderReaction(
    field: FounderReactionField,
    value: FounderAlignmentWorkbookFounderReactionStatus | string
  ) {
    if (!canEditFounderReaction()) {
      return;
    }

    setSaveState((current) => ({
      ...current,
      kind: canSave ? "dirty" : current.kind,
      message: canSave ? t("Aenderungen werden gleich gesichert") : current.message,
    }));
    setWorkbook((current) => ({
      ...current,
      founderReaction: {
        ...current.founderReaction,
        [field]: value,
      },
    }));
  }

  const performSave = useCallback(async (
    nextWorkbook: FounderAlignmentWorkbookPayload,
    mode: "manual" | "autosave"
  ) => {
    if (!canSave || !invitationId) {
      return false;
    }

    const previousSnapshot = lastPersistedSnapshotRef.current;
    const nextSnapshot = serializeWorkbookPayload(nextWorkbook);
    const requestId = saveSequenceRef.current + 1;
    saveSequenceRef.current = requestId;
    lastPersistedSnapshotRef.current = nextSnapshot;

    setSaveState((current) => ({
      ...current,
      kind: "saving",
      message: mode === "autosave" ? t("Sichert automatisch...") : "Sichert...",
    }));

    const result = await saveFounderAlignmentWorkbook({
      invitationId,
      teamContext,
      payload: nextWorkbook,
      editingMode,
    });

    if (requestId !== saveSequenceRef.current) {
      return result.ok;
    }

    if (!result.ok) {
      lastPersistedSnapshotRef.current = previousSnapshot;
      setSaveState((current) => ({
        ...current,
        kind: "error",
        message: t("Die Session konnte gerade nicht gespeichert werden."),
      }));
      return false;
    }

    setSaveState({
      kind: mode === "autosave" ? "autosaved" : "saved",
      message:
        mode === "autosave"
          ? t("Automatisch gesichert")
          : t("Alles gesichert"),
      updatedAt: result.updatedAt,
    });
    return true;
  }, [canSave, editingMode, invitationId, teamContext]);

  function persist(nextStepId?: FounderAlignmentWorkbookStepId) {
    shouldScrollToStepRef.current = Boolean(
      nextStepId && nextStepId !== activeStepId
    );

    const nextWorkbook = {
      ...workbook,
      currentStepId: nextStepId ?? activeStepId,
    };

    setWorkbook(nextWorkbook);

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    if (!canSave || !invitationId) {
      return;
    }

    startTransition(async () => {
      await performSave(nextWorkbook, "manual");
    });
  }

  useEffect(() => {
    if (!canSave || !invitationId) {
      return;
    }

    const autosaveWorkbook =
      workbook.currentStepId === activeStepId
        ? workbook
        : { ...workbook, currentStepId: activeStepId };
    const currentSnapshot = serializeWorkbookPayload(autosaveWorkbook);
    if (currentSnapshot === lastPersistedSnapshotRef.current) {
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      autosaveTimeoutRef.current = null;
      startTransition(async () => {
        await performSave(autosaveWorkbook, "autosave");
      });
    }, WORKBOOK_AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [activeStepId, canSave, invitationId, workbook, startTransition, performSave]);

  const nextStepId = workbookNextStepId(activeStepId, visibleSteps);
  const previousStepId = workbookPreviousStepId(activeStepId, visibleSteps);
  function fieldHeading(field: WorkbookEditableField) {
    if (field === "advisorNotes") {
      return t("Hinweis aus der Moderation");
    }
    if (field === "agreement") {
      return editingMode === "joint"
        ? "Gemeinsame Regel"
        : "Gemeinsame Regel";
    }

    if (editingMode === "joint") {
      return field === "founderA" ? founderALabel : founderBLabel;
    }

    if (
      (field === "founderA" && currentUserRole === "founderA") ||
      (field === "founderB" && currentUserRole === "founderB")
    ) {
      return t("Deine Perspektive");
    }

    return t(`Perspektive von ${otherFounderLabel}`);
  }

  function perspectiveDisplayName(field: "founderA" | "founderB") {
    return field === "founderA" ? founderALabel : founderBLabel;
  }

  function perspectiveSectionTitle(field: "founderA" | "founderB", order: 2 | 3) {
    if (editingMode === "joint") {
      return `${order}. Perspektive ${perspectiveDisplayName(field)}`;
    }

    if (
      (field === "founderA" && currentUserRole === "founderA") ||
      (field === "founderB" && currentUserRole === "founderB")
    ) {
      return `${order}. Deine Sicht`;
    }

    return `${order}. Sicht von ${perspectiveDisplayName(field)}`;
  }

  function perspectiveSectionHint(field: "founderA" | "founderB", isPrimary: boolean) {
    if (editingMode === "joint") {
      return isPrimary
        ? t("Startet mit einer ersten klaren Antwort auf das Szenario.")
        : t("Legt dann die zweite Sicht daneben. So wird der Unterschied oder die Einigkeit schnell sichtbar.");
    }

    if (
      (field === "founderA" && currentUserRole === "founderA") ||
      (field === "founderB" && currentUserRole === "founderB")
    ) {
      return t("Halte hier zuerst deine eigene Sicht fest.");
    }

    return t("Die andere Perspektive bleibt sichtbar, damit die Regel nicht im luftleeren Raum entsteht.");
  }

  function applyAgreementDraft() {
    if (!currentAgreementDraft) return;
    updateEntry("agreement", currentAgreementDraft.draft);
  }

  function focusAgreementField() {
    setAgreementFieldFocusSignal((current) => current + 1);
  }

  function openSummaryView() {
    persist();
    shouldScrollToStepRef.current = true;
    setShowFullExportView(false);
    setShowSummaryView(true);
  }

  function returnToWorkbook() {
    shouldScrollToStepRef.current = true;
    setShowFullExportView(false);
    setShowSummaryView(false);
  }

  function openFullExportView() {
    persist();
    shouldScrollToStepRef.current = true;
    setShowSummaryView(false);
    setShowFullExportView(true);
  }

  function returnToSummaryView() {
    shouldScrollToStepRef.current = true;
    setShowFullExportView(false);
    setShowSummaryView(true);
  }

  function exportSummaryOnly() {
    if (typeof window === "undefined") return;
    trackResearchEvent({
      eventName: "workbook_summary_print_clicked",
      invitationId,
      teamContext,
      properties: { role: currentUserRole },
    });
    window.print();
  }

  async function handleAdvisorInvite() {
    if (!invitationId || currentUserRole === "advisor" || currentUserRole === "unknown") {
      return;
    }

    const result = await prepareFounderAlignmentAdvisorInvite({
      invitationId,
      teamContext,
    });

    if (!result.ok) {
      setAdvisorInviteMessage(
        result.reason === "forbidden"
          ? t("Die Einladung zur Moderation ist fuer diese Person nicht verfuegbar.")
          : t("Die Einladung zur Moderation konnte gerade nicht vorbereitet werden.")
      );
      setAdvisorInviteLink(null);
      return;
    }

    setAdvisorInviteState({
      founderAApproved: result.founderAApproved,
      founderBApproved: result.founderBApproved,
      advisorLinked: result.advisorLinked,
      advisorName: result.advisorName,
    });

    if (result.status === "awaiting_other_founder") {
      setAdvisorInviteLink(null);
      setAdvisorInviteMessage(
        currentUserRole === "founderA"
          ? t("Deine Zustimmung ist erfasst. Sobald Founder B ebenfalls zustimmt, kann der Einladungslink erzeugt werden.")
          : t("Deine Zustimmung ist erfasst. Sobald Founder A ebenfalls zustimmt, kann der Einladungslink erzeugt werden.")
      );
      return;
    }

    if (result.status === "advisor_linked") {
      setAdvisorInviteLink(null);
      setAdvisorInviteMessage(
        t(`Moderation verbunden: ${result.advisorName ?? "Moderation"}. Hinweise koennen jetzt direkt im Workbook hinterlegt werden.`)
      );
      return;
    }

    if (typeof window !== "undefined") {
      const absoluteInviteUrl = result.inviteUrl.startsWith("/")
        ? `${window.location.origin}${result.inviteUrl}`
        : result.inviteUrl;
      setAdvisorInviteLink(absoluteInviteUrl);
      try {
        await navigator.clipboard.writeText(absoluteInviteUrl);
        setAdvisorInviteMessage(
          t("Der Einladungslink wurde erstellt und direkt in die Zwischenablage kopiert.")
        );
      } catch {
        setAdvisorInviteMessage(
          t("Der Einladungslink wurde erstellt. Du kannst ihn jetzt kopieren und weitergeben.")
        );
      }
      return;
    }

    setAdvisorInviteLink(result.inviteUrl);
  }

  function exportFullSession() {
    if (typeof window === "undefined") return;
    trackResearchEvent({
      eventName: "workbook_full_export_print_clicked",
      invitationId,
      teamContext,
      properties: { role: currentUserRole },
    });
    window.print();
  }

  return (
    <div className="print-document-root min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_26%,#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8 print:min-h-0 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-7xl print:max-w-none">
        {showSummaryView || showFullExportView ? (
          <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none">
            <div className="flex flex-col gap-5 border-b border-slate-200 pb-8 print:pb-6">
              <object
                type="image/svg+xml"
                data="/cofoundery-align-logo.svg"
                className="h-8 w-auto print:h-7"
                aria-label="CoFoundery Align Logo"
              />
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {showFullExportView
                    ? "Workbook"
                    : "Zusammenfassung"}
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-950">
                  {showFullExportView
                    ? "Workbook"
                    : "Zusammenfassung"}
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  {founderALabel} x {founderBLabel}
                </p>
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-700">
                  {showFullExportView
                    ? t("Dieses Dokument enthaelt die vollstaendigen Antworten und Vereinbarungen aus eurem Workbook.")
                    : t("Zusammenfassung eurer wichtigsten Vereinbarungen aus dem Workbook.")}
                </p>
                {formattedUpdatedAt ? (
                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    Sessionstand: {formattedUpdatedAt}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[32px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Workbook
              </p>
              <div className="mt-4 inline-flex rounded-full border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                {teamContextLabel(teamContext)}
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">
                {t("Workbook fuer euer Gespraech")}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-700">
                {founderALabel} x {founderBLabel}
              </p>
              <p className="mt-4 text-[15px] leading-8 text-slate-700">
                {t(workbookContextIntro(teamContext))}
              </p>
            </div>

            <div className="flex min-w-[260px] flex-col items-start gap-3 rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-5 lg:items-end">
              <div className="text-sm text-slate-600">Dauer: 60-90 Minuten</div>
              <div className="w-full rounded-2xl border border-slate-200/70 bg-white/92 px-4 py-4 lg:max-w-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      saveStatusMeta.tone === "success"
                        ? "bg-emerald-500"
                        : saveStatusMeta.tone === "warning"
                          ? "bg-amber-500"
                          : saveStatusMeta.tone === "error"
                            ? "bg-rose-500"
                            : saveStatusMeta.tone === "info"
                              ? "bg-sky-500"
                              : "bg-slate-400"
                    }`}
                  />
                  <p
                    className={`text-xs font-medium uppercase tracking-[0.16em] ${
                      saveStatusMeta.tone === "success"
                        ? "text-emerald-700"
                        : saveStatusMeta.tone === "warning"
                          ? "text-amber-700"
                          : saveStatusMeta.tone === "error"
                            ? "text-rose-700"
                            : saveStatusMeta.tone === "info"
                              ? "text-sky-700"
                              : "text-slate-500"
                    }`}
                  >
                    {saveStatusMeta.label}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{saveStatusDetail}</p>
              </div>
              <div className="w-full rounded-2xl border border-slate-200/70 bg-white/92 px-4 py-4 lg:max-w-xs">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  {t("Fortschritt")}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {t(`Schritt ${currentIndex + 1} von ${visibleSteps.length}`)}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-primary),var(--brand-accent))]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {completedStepsCount > 0
                    ? t(`${completedStepsCount} Schritte sind schon festgehalten.`)
                    : editingMode === "joint"
                      ? t("Die erste klare Regel entsteht gleich im Workbook.")
                      : t("Deine erste klare Regel entsteht gleich im Workbook.")}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)]">
            <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("Arbeitsdokument")}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t(
                  "Ihr geht Schritt fuer Schritt durch eure wichtigsten Themen und haltet klare Regeln fest."
                )}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t(
                  "Jeder Schritt fuehrt zu einer konkreten Vereinbarung."
                )}
              </p>
              <div className="mt-5">
                <ReportActionButton
                  href={printWorksheetHref}
                  className="w-full sm:w-auto"
                >
                  {t("Workbook als PDF")}
                </ReportActionButton>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white/92 p-6">
              {currentUserRole === "advisor" ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    {t("Moderationsmodus")}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {t(
                      "Du siehst alle Perspektiven und Vereinbarungen, kommentierst aber nur im eigenen Hinweisfeld. Das Arbeitsdokument bleibt bewusst in der Hand der Founder."
                    )}
                  </p>
                  <div className="mt-5 rounded-2xl border border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/6 p-4">
                    <p className="text-sm font-semibold text-slate-900">{advisorLabel}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {t(
                        "Nutze deine Kommentare, um Fragen zu stellen, Spannungen sichtbar zu machen oder bei schwierigen Entscheidungen eine neutrale Perspektive zu geben."
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("Wie ihr gerade arbeitet")}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {t(
                      "Ihr koennt erst einzeln antworten oder den Schritt direkt gemeinsam ausfuellen."
                    )}
                  </p>
                  <div className="mt-5 grid gap-3">
                    <ModeCard
                      title={t("Eigene Sicht zuerst")}
                      text={t("Jede Person schreibt zuerst die eigene Antwort. Die andere Sicht bleibt dabei sichtbar.")}
                      active={editingMode === "personal"}
                      onClick={() => setEditingMode("personal")}
                      disabled={currentUserRole === "unknown"}
                    />
                    <ModeCard
                      title={t("Gemeinsam bearbeiten")}
                      text={t("Beide Perspektiven und die gemeinsame Regel sind direkt offen.")}
                      active={editingMode === "joint"}
                      onClick={() => setEditingMode("joint")}
                    />
                  </div>
                  <div
                    className={`mt-4 rounded-2xl border px-4 py-3 transition-all duration-300 ${
                      editingMode === "joint"
                        ? "border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/7"
                        : "border-[color:var(--brand-primary)]/22 bg-[color:var(--brand-primary)]/8"
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {t("Gerade aktiv")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {editingMode === "joint"
                        ? t("Ihr arbeitet gerade gemeinsam.")
                        : t("Ihr startet gerade mit den einzelnen Antworten.")}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {editingMode === "joint"
                        ? t("Beide Antworten und die gemeinsame Regel bleiben direkt im Blick.")
                        : t("Zuerst steht deine eigene Antwort im Fokus. Danach wird die zweite Sicht leichter vergleichbar.")}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {showAdvisorInviteCard ? (
            <div className="mt-6 rounded-3xl border border-[color:var(--brand-accent)]/16 bg-[linear-gradient(135deg,rgba(124,58,237,0.06),rgba(255,255,255,0.96))] p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    {t("Moderatorin oder Moderator")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    {advisorInviteState.advisorLinked
                      ? t("Moderation ist aktiv")
                      : t("Optional eine dritte Perspektive einbinden")}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {advisorInviteState.advisorLinked
                      ? t(
                          "Die Moderation sieht alle Inhalte im Workbook und kann pro Schritt Hinweise oder Fragen hinterlassen. Founder-Perspektiven und Vereinbarungen bleiben dabei unveraendert in eurer Verantwortung."
                        )
                      : t(
                          "Wenn ihr euch bei schwierigen Punkten eine neutrale Begleitung wuenscht, koennt ihr eine dritte Person zur Moderation einladen. Der Zugang wird erst aktiv, wenn beide Founder zustimmen."
                        )}
                  </p>
                </div>

                <div className="min-w-[260px] rounded-2xl border border-white/70 bg-white/88 p-4">
                  <div className="grid gap-2 text-sm text-slate-700">
                    <AdvisorApprovalRow
                      label={founderALabel}
                      approved={advisorInviteState.founderAApproved}
                    />
                    <AdvisorApprovalRow
                      label={founderBLabel}
                      approved={advisorInviteState.founderBApproved}
                    />
                    {advisorInviteState.advisorLinked ? (
                      <AdvisorApprovalRow
                        label={advisorInviteState.advisorName ?? advisorLabel}
                        approved
                        tone="linked"
                      />
                    ) : null}
                  </div>

                  {currentUserRole === "founderA" || currentUserRole === "founderB" ? (
                    <div className="mt-4 flex flex-col gap-3">
                      <ReportActionButton
                        type="button"
                        onClick={handleAdvisorInvite}
                        className="w-full"
                      >
                        {advisorInviteState.advisorLinked
                          ? t("Moderation erneut einladen")
                          : t("Moderation einladen")}
                      </ReportActionButton>
                      {advisorInviteMessage ? (
                        <p className="text-xs leading-6 text-slate-600">{advisorInviteMessage}</p>
                      ) : null}
                      {advisorInviteLink ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {t("Einladungslink")}
                          </p>
                          <p className="mt-2 break-all text-xs leading-6 text-slate-700">
                            {advisorInviteLink}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : currentUserRole === "advisor" ? (
                    <p className="mt-4 text-xs leading-6 text-slate-600">
                      {t(
                        "Du bist in diesem Workbook fuer die Moderation verknuepft und kannst unter jedem Schritt eigene Hinweise hinterlegen."
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("Fokus-Themen aus eurem Matching-Report")}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{t(reportHeadline)}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {t(
                    "Diese Themen verdienen in eurem Arbeitsdokument besondere Aufmerksamkeit, weil sie im Matching-Report als tragende Grundlage, ergaenzende Dynamik oder als wichtiges Klaerungsthema sichtbar wurden."
                  )}
                </p>
              </div>
              <div className="text-sm leading-6 text-slate-600">
                {highlights.prioritizedStepIds.length > 0
                  ? t("Einzelne Schritte sind aus dem Matching-Report besonders wichtig.")
                  : t("Geht die Schritte in Ruhe nacheinander durch.")}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <HighlightCard
                title={t("Staerkste gemeinsame Grundlage")}
                text={highlights.topStrength}
              />
              <HighlightCard
                title={t("Wichtigste ergaenzende Dynamik")}
                text={
                  highlights.topComplementaryDynamic ??
                  t("Aktuell wird keine einzelne ergaenzende Dynamik besonders hervorgehoben.")
                }
              />
              <HighlightCard
                title={t("Wichtigstes Abstimmungsthema")}
                text={highlights.topTension}
              />
            </div>
          </div>

          {hasTeamContextMismatch ? (
            <div className="mt-6 rounded-3xl border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/6 p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--brand-accent)]">
                Bereits vorhandenes Workbook
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t("Zu dieser Einladung existiert bereits ein Workbook im Kontext")}{" "}
                <strong>{teamContextLabel(storedTeamContext)}</strong>
                {t(
                  ". Die vorhandenen Inhalte wurden geladen, damit nichts verloren wirkt. Beim naechsten Speichern wird das Workbook im aktuell geoeffneten Kontext weitergefuehrt."
                )}
              </p>
            </div>
          ) : null}
        </section>
        )}

        {showSummaryView ? (
          <div className="mt-8 print:mt-0">
            <section
              ref={currentStepRef}
              className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none"
            >
              <WorkbookSummaryView
                items={workbookSummaryItems}
                unresolvedItems={unresolvedSummaryItems}
                onBack={returnToWorkbook}
                onExportSummary={exportSummaryOnly}
                onShowFullExport={openFullExportView}
              />
            </section>
          </div>
        ) : showFullExportView ? (
          <div className="mt-8 print:mt-0">
            <section
              ref={currentStepRef}
              className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none"
            >
              <WorkbookFullExportView
                items={workbookExportItems}
                founderALabel={founderALabel}
                founderBLabel={founderBLabel}
                onBack={returnToSummaryView}
                onExport={exportFullSession}
              />
            </section>
          </div>
        ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            id="sessionverlauf"
            className="order-2 self-start rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] xl:order-1 xl:sticky xl:top-24"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Schritte</p>
              <span className="text-sm text-slate-600">
                {completedStepsCount}/{visibleSteps.length}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t(`Schritt ${currentIndex + 1} von ${visibleSteps.length}`)}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-primary),var(--brand-accent))]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <ol className="mt-6 space-y-3">
              {visibleSteps.map((step, index) => {
                const isActive = step.id === workbook.currentStepId;
                const isPrioritized = highlights.prioritizedStepIds.includes(step.id);
                const progressMeta = stepProgressMeta[step.id];
                return (
                  <li
                    key={step.id}
                    className="list-none"
                  >
                    <button
                      type="button"
                      onClick={() => persist(step.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/14 text-slate-900 shadow-[0_12px_24px_rgba(103,232,249,0.12)]"
                          : progressMeta?.completed
                              ? "border-emerald-200/70 bg-emerald-50/25 text-slate-800 hover:border-emerald-300"
                            : progressMeta?.started
                              ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                              : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                            Schritt {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-medium">{step.title}</p>
                          <p className="mt-2 text-xs leading-5 opacity-75">
                            {progressMeta?.completed
                              ? t("Regel steht")
                              : progressMeta?.started
                                ? t("In Arbeit")
                                : t("Noch offen")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isPrioritized ? (
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                isActive
                                  ? "bg-white/70 text-slate-900"
                                  : "bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]"
                              }`}
                            >
                              Fokus
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              progressMeta?.completed
                              ? "bg-emerald-600 text-white"
                              : progressMeta?.started
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {progressMeta?.completed ? "✓" : index + 1}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section
            ref={currentStepRef}
            className="order-1 rounded-[32px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-8 xl:order-2"
          >
            <div className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Schritt {currentIndex + 1} von {visibleSteps.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {t("Geht diesen Schritt in Ruhe durch und haltet am Ende eine klare Regel fest.")}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    stepProgressMeta[currentStep.id]?.completed
                      ? "bg-emerald-100 text-emerald-700"
                      : stepProgressMeta[currentStep.id]?.started
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                    {stepProgressMeta[currentStep.id]?.completed
                    ? t("Regel festgehalten")
                    : stepProgressMeta[currentStep.id]?.started
                      ? t("In Arbeit")
                      : t("Startklar")}
                </span>
              </div>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">{currentStep.title}</h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-700">
              {currentStep.subtitle}
            </p>
            {isFocusedStep ? (
              <div className="mt-6 rounded-2xl border border-[color:var(--brand-accent)]/14 bg-[color:var(--brand-accent)]/5 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-accent)]">
                  Fokus aus eurem Matching-Report
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {t("Dieser Bereich wurde im Matching-Report als besonders relevant fuer eure Zusammenarbeit identifiziert.")}
                </p>
              </div>
            ) : null}

            <StepSection
              title={currentStepUsesStructuredOutput ? "1. Intro und Szenario" : "1. Einstieg"}
              className="mt-8 border-slate-200 bg-slate-50/80"
            >
              <p className="text-sm leading-7 text-slate-700">
                {t(
                  currentStepUsesStructuredOutput
                    ? "Klaert hier die Regel, die im Alltag wirklich gelten soll."
                    : "Warum dieses Thema fuer Gruenderteams wichtig ist."
                )}
              </p>
              <div className="mt-4 space-y-3">
                {currentStepContent.context.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700">
                    {t(paragraph)}
                  </p>
                ))}
                {currentStepUsesStructuredOutput ? (
                  <>
                    <p className="text-sm leading-7 text-slate-700">{t(currentStepContent.everyday)}</p>
                    {currentStepContent.scenario ? (
                      <div className="mt-5 rounded-3xl border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/6 p-6">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                          Realitaetsszenario
                        </p>
                        <p className="mt-3 text-sm leading-7 text-slate-700">
                          {t(currentStepContent.scenario)}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white/92 p-6">
                      <p className="text-sm font-semibold text-slate-900">
                        {t("Klare Leitfragen")}
                      </p>
                      <ul className="mt-4 grid gap-3">
                        {currentStep.prompts.map((prompt) => (
                          <li
                            key={prompt}
                            className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700"
                          >
                            {t(prompt)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-5 rounded-2xl border border-[color:var(--brand-accent)]/12 bg-[color:var(--brand-accent)]/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                        So zeigt sich das im Alltag
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{t(currentStepContent.everyday)}</p>
                    </div>
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white/92 p-6">
                      <p className="text-sm font-semibold text-slate-900">
                        {t("Worueber ihr hier sprecht")}
                      </p>
                      <ul className="mt-4 grid gap-3">
                        {currentStep.prompts.map((prompt) => (
                          <li
                            key={prompt}
                            className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700"
                          >
                            {t(prompt)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </StepSection>

            {currentStepIsAdvisorClosing ? (
              <StepSection
                title="Abschlussimpulse der Moderation"
                className="mt-8 border-[color:var(--brand-accent)]/16 bg-[linear-gradient(135deg,rgba(124,58,237,0.06),rgba(255,255,255,0.96))]"
              >
                <p className="text-sm leading-7 text-slate-700">
                  {t(
                    "Dieser Abschlussblock gibt einer neutralen dritten Perspektive bewusst Raum. Er buendelt Beobachtungen, offene Rueckfragen und konkrete Empfehlungen, ohne eure Founder-Vereinbarungen zu ersetzen."
                  )}
                </p>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6">
                  <p className="text-sm font-semibold text-slate-900">{t("Orientierung fuer den Abschluss")}</p>
                  <ul className="mt-4 grid gap-3">
                    {currentStep.prompts.map((prompt) => (
                      <li
                        key={prompt}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700"
                      >
                        {t(prompt)}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 grid gap-6">
                  <WorkbookField
                    title={t("Wichtigste Beobachtungen")}
                    value={workbook.advisorClosing.observations}
                    onChange={(value) => updateAdvisorClosing("observations", value)}
                    placeholder={t("Welche Muster, Spannungen oder positiven Signale sollten aus Advisor-Sicht besonders sichtbar bleiben?")}
                    readOnly={!canEditAdvisorClosing()}
                    helperText={
                      canEditAdvisorClosing()
                        ? null
                        : t(`Dieses Feld wird von ${advisorLabel} ausgefuellt.`)
                    }
                  />
                  <WorkbookField
                    title={t("Offene Rueckfragen an die Founder")}
                    value={workbook.advisorClosing.questions}
                    onChange={(value) => updateAdvisorClosing("questions", value)}
                    placeholder={t("Welche Fragen sollten die Founder nach dieser Session noch gezielt weiterklaeren?")}
                    readOnly={!canEditAdvisorClosing()}
                    helperText={
                      canEditAdvisorClosing()
                        ? null
                        : t(`Dieses Feld wird von ${advisorLabel} ausgefuellt.`)
                    }
                  />
                  <WorkbookField
                    title={t("Empfohlene naechste Schritte / To-dos")}
                    value={workbook.advisorClosing.nextSteps}
                    onChange={(value) => updateAdvisorClosing("nextSteps", value)}
                    placeholder={t("Welche konkreten naechsten Schritte oder To-dos empfiehlt der Advisor fuer die kommenden Wochen?")}
                    readOnly={!canEditAdvisorClosing()}
                    helperText={
                      canEditAdvisorClosing()
                        ? null
                        : t(`Dieses Feld wird von ${advisorLabel} ausgefuellt.`)
                    }
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white/88 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {t("Naechster Check-in")}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {t(
                      "Markiere hier, ob fuer dieses Team ein Check-in in 4 Wochen, in 3 Monaten oder aktuell gar nicht sinnvoll ist."
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {ADVISOR_FOLLOW_UP_OPTIONS.map((option) => {
                      const isActive = workbook.advisorFollowUp === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateAdvisorFollowUp(option.value)}
                          disabled={!canEditAdvisorClosing()}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            isActive
                              ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-white"
                              : canEditAdvisorClosing()
                                ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {t("Reaktion des Teams")}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {t(
                      "Hier koennt ihr knapp markieren, ob die Hinweise aus der Moderation bereits aufgenommen sind, noch offen bleiben oder weiter geklaert werden."
                    )}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {FOUNDER_REACTION_OPTIONS.map((option) => {
                      const isActive = workbook.founderReaction.status === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateFounderReaction(
                              "status",
                              workbook.founderReaction.status === option.value ? null : option.value
                            )
                          }
                          disabled={!canEditFounderReaction()}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            isActive
                              ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-slate-900"
                              : canEditFounderReaction()
                                ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {!canEditFounderReaction() ? (
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      {t("Dieser Bereich wird von den Foundern gemeinsam gepflegt.")}
                    </p>
                  ) : null}

                  <div className="mt-5">
                    <WorkbookField
                      title={t("Kurzer gemeinsamer Kommentar")}
                      value={workbook.founderReaction.comment}
                      onChange={(value) => updateFounderReaction("comment", value)}
                      placeholder={t("Was habt ihr aus den Hinweisen der Moderation bereits aufgenommen oder was wollt ihr noch klaeren?")}
                      readOnly={!canEditFounderReaction()}
                      helperText={
                        canEditFounderReaction()
                          ? null
                          : t("Dieses Feld wird von den Foundern gemeinsam ausgefuellt.")
                      }
                    />
                  </div>
                </div>
              </StepSection>
            ) : (
              <>
                <StepSection
                  title={perspectiveSectionTitle(primaryPerspectiveField, 2)}
                  className="mt-8 border-slate-200/70 bg-white"
                >
                  <p className="text-sm leading-7 text-slate-700">
                    {perspectiveSectionHint(primaryPerspectiveField, true)}
                  </p>
                  <div className="mt-5">
                    <WorkbookField
                      title={fieldHeading(primaryPerspectiveField)}
                      value={workbook.steps[currentStep.id][primaryPerspectiveField]}
                      onChange={(value) => updateEntry(primaryPerspectiveField, value)}
                      placeholder={t(
                        currentStepUsesStructuredOutput
                          ? getStructuredPerspectivePrompt(currentStep.id)
                          : "Welche Sicht, Sorge oder Prioritaet bringst du in diesen Schritt ein?"
                      )}
                      readOnly={!canEditField(primaryPerspectiveField)}
                      helperText={getFieldReadOnlyHint(primaryPerspectiveField)}
                    />
                  </div>
                </StepSection>

                <StepSection
                  title={perspectiveSectionTitle(secondaryPerspectiveField, 3)}
                  className={`mt-8 border-slate-200/70 ${
                    primaryPerspectiveHasValue ? "bg-white" : "bg-slate-50/60"
                  }`}
                >
                  <p className="text-sm leading-7 text-slate-700">
                    {perspectiveSectionHint(secondaryPerspectiveField, false)}
                  </p>
                  {!primaryPerspectiveHasValue ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-xs leading-6 text-slate-500">
                      {t("Die erste Antwort darf ruhig zuerst stehen. Danach wird die zweite Sicht leichter vergleichbar.")}
                    </div>
                  ) : null}
                  <div className="mt-5">
                    <WorkbookField
                      title={fieldHeading(secondaryPerspectiveField)}
                      value={workbook.steps[currentStep.id][secondaryPerspectiveField]}
                      onChange={(value) => updateEntry(secondaryPerspectiveField, value)}
                      placeholder={t(
                        currentStepUsesStructuredOutput
                          ? getStructuredPerspectivePrompt(currentStep.id)
                          : "Welche Sicht, Sorge oder Prioritaet bringst du in diesen Schritt ein?"
                      )}
                      readOnly={!canEditField(secondaryPerspectiveField)}
                      helperText={getFieldReadOnlyHint(secondaryPerspectiveField)}
                    />
                  </div>
                </StepSection>

                {!currentStepUsesStructuredOutput ? (
                  <StepSection
                    title="4. Vergleich und Regelvorschlag"
                    className="mt-8 border-[color:var(--brand-accent)]/18 bg-[linear-gradient(135deg,rgba(124,58,237,0.06),rgba(255,255,255,0.98))]"
                  >
                    <p className="text-sm leading-7 text-slate-700">
                      {t(
                        editingMode === "joint"
                          ? "Aus euren Antworten entsteht hier ein erster Regelvorschlag. Ihr koennt ihn direkt uebernehmen oder im Feld weiter schaerfen."
                          : "Aus deiner Antwort entsteht hier ein erster Regelvorschlag. Du kannst ihn direkt uebernehmen oder im Feld weiter schaerfen."
                      )}
                    </p>

                    <div className="mt-5 flex flex-col gap-3">
                      {editingMode === "joint" && !currentAgreementDraft ? (
                        <div className="rounded-2xl border border-dashed border-slate-300/90 bg-white/85 px-4 py-4 text-sm leading-7 text-slate-600">
                          {t("Sobald beide Antworten da sind, seht ihr hier erst den Vergleich und dann euren Regelvorschlag.")}
                        </div>
                      ) : null}

                      {editingMode === "personal" && !currentAgreementDraft ? (
                        <div className="rounded-2xl border border-dashed border-slate-300/90 bg-white/85 px-4 py-4 text-sm leading-7 text-slate-600">
                          {t("Sobald deine Antwort steht, siehst du hier einen ersten Regelvorschlag.")}
                        </div>
                      ) : null}

                      {currentAgreementDraft ? (
                        <div
                          className={`rounded-3xl border p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ${
                            currentAgreementDraft.sourceMode === "joint"
                              ? "border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.04),rgba(255,255,255,0.98))]"
                              : "border-slate-200/70 bg-slate-50/80"
                          }`}
                        >
                          {currentAgreementDraft.sourceMode === "joint" &&
                          currentAgreementDraft.comparisonLabel ? (
                            <div className="rounded-2xl border border-[color:var(--brand-accent)]/14 bg-white/80 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                                {t(currentAgreementDraft.comparisonLabel)}
                              </p>
                              {currentAgreementDraft.comparisonHint ? (
                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                  {t(currentAgreementDraft.comparisonHint)}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                {t(currentAgreementDraft.suggestionTitle)}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {t(currentAgreementDraft.suggestionIntro)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3 sm:justify-end">
                              <ReportActionButton type="button" onClick={applyAgreementDraft}>
                                {t("Regel uebernehmen")}
                              </ReportActionButton>
                              <ReportActionButton type="button" variant="utility" onClick={focusAgreementField}>
                                {t("Direkt anpassen")}
                              </ReportActionButton>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-5">
                            <p className="text-sm leading-7 text-slate-700">
                              {t(currentAgreementDraft.draft)}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </StepSection>
                ) : null}

                <StepSection
                  title={
                    currentStepUsesStructuredOutput
                      ? `${outputSectionNumber}. Regel festhalten`
                      : editingMode === "joint"
                        ? `${outputSectionNumber}. Eure Regel fuer diesen Schritt`
                        : `${outputSectionNumber}. Deine Regel fuer diesen Schritt`
                  }
                  className="mt-8 border-[color:var(--brand-primary)]/16 bg-[linear-gradient(180deg,rgba(103,232,249,0.06),rgba(255,255,255,0.99))]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t("Ziel dieses Schritts")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {t(
                          currentStepUsesStructuredOutput
                            ? currentStepHasSingleStructuredOutput
                              ? editingMode === "joint"
                                ? "Am Ende steht hier eine Regel, die ihr im Alltag direkt nutzen koennt."
                                : "Am Ende steht hier eine Regel, die du im Alltag direkt nutzen kannst."
                              : editingMode === "joint"
                                ? "Am Ende stehen hier Regeln, die euch im Alltag direkt leiten."
                                : "Am Ende stehen hier Regeln, die dich im Alltag direkt leiten."
                            : editingMode === "joint"
                              ? "Hier steht am Ende eure gemeinsame Regel fuer diesen Schritt."
                              : "Hier steht am Ende deine Regel fuer diesen Schritt."
                        )}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        currentStepHasAgreement
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {currentStepHasAgreement ? t("Regel steht") : t("Offen")}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-slate-700">
                    {t(
                      currentStepUsesStructuredOutput
                        ? currentStepHasSingleStructuredOutput
                          ? editingMode === "joint"
                            ? "Formuliert die Regel so klar, dass ihr danach ohne weitere Rueckfrage handeln koennt."
                            : "Formuliere die Regel so klar, dass du danach ohne weitere Rueckfrage handeln kannst."
                          : editingMode === "joint"
                            ? "Formuliert jede Regel so klar, dass sofort sichtbar ist, wann sie gilt und wer entscheidet."
                            : "Formuliere jede Regel so klar, dass sofort sichtbar ist, wann sie gilt und wer entscheidet."
                        : editingMode === "joint"
                          ? "Formuliert die Regel so klar, dass ihr spaeter nicht noch einmal neu darueber sprechen muesst."
                          : "Formuliere die Regel so klar, dass du spaeter nicht noch einmal neu darueber sprechen musst."
                    )}
                  </p>

                  {currentStepUsesStructuredOutput && structuredAgreement && currentStructuredOutputFields ? (
                    <>
                      <div className="mt-6 grid gap-5">
                        {currentStructuredOutputFields.map((field) => (
                          <WorkbookField
                            key={field.key}
                            title={t(field.title)}
                            value={structuredAgreement[field.key]}
                            onChange={(value) =>
                              updateStructuredAgreementField(field.key, value)
                            }
                            placeholder={t(field.placeholder)}
                            highlight={field.highlight === true}
                            readOnly={!canEditField("agreement")}
                            helperText={t(canEditField("agreement") ? field.helperText : getFieldReadOnlyHint("agreement") ?? "")}
                          />
                        ))}
                      </div>

                      {currentStepContent.riskHint ? (
                        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
                            Risiko-Hinweis
                          </p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">
                            {t(currentStepContent.riskHint)}
                          </p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="mt-6">
                        <WorkbookField
                          title={t(editingMode === "joint" ? "Eure gemeinsame Regel" : "Deine Regel")}
                          value={workbook.steps[currentStep.id].agreement}
                          onChange={(value) => updateEntry("agreement", value)}
                          placeholder={t("Welche konkrete Regel, Entscheidung oder Arbeitsweise soll fuer diesen Schritt kuenftig gelten?")}
                          highlight
                          focusSignal={agreementFieldFocusSignal}
                          readOnly={!canEditField("agreement")}
                          helperText={
                            canEditField("agreement")
                              ? t(
                                  editingMode === "joint"
                                    ? "Hier steht eure gemeinsame Regel fuer diesen Schritt."
                                    : "Hier steht deine Regel fuer diesen Schritt."
                                )
                              : getFieldReadOnlyHint("agreement")
                          }
                        />
                      </div>
                    </>
                  )}
                </StepSection>

                {showAdvisorNotesSection ? (
                  <StepSection
                    title="Hinweis von aussen"
                    className="mt-8 border-[color:var(--brand-accent)]/14 bg-[color:var(--brand-accent)]/5"
                  >
                    <p className="text-sm leading-7 text-slate-700">
                      {t(
                        "Hier ist Platz fuer eine neutrale Beobachtung oder Rueckfrage. Eure gemeinsame Regel bleibt davon getrennt."
                      )}
                    </p>
                    <div className="mt-6">
                      <WorkbookField
                        title={fieldHeading("advisorNotes")}
                        value={workbook.steps[currentStep.id].advisorNotes}
                        onChange={(value) => updateEntry("advisorNotes", value)}
                        placeholder={t("Welche Beobachtung, Rueckfrage oder Moderationsnotiz ist fuer diesen Schritt hilfreich?")}
                        readOnly={!canEditField("advisorNotes")}
                        helperText={getFieldReadOnlyHint("advisorNotes")}
                      />
                    </div>
                  </StepSection>
                ) : null}

                {showStatusSection ? (
                  <StepSection title="Stand dieses Schritts" className="mt-8 border-slate-200/70 bg-white">
                    <p className="text-sm leading-7 text-slate-700">
                      {t(
                        editingMode === "joint"
                          ? "Markiert hier kurz, wie klar dieser Schritt fuer euch schon ist."
                          : "Markiere hier kurz, wie klar dieser Schritt fuer dich schon ist."
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {STEP_CLARITY_OPTIONS.map((option) => {
                        const isActive = stepClarity[currentStep.id] === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              const nextValue =
                                stepClarity[currentStep.id] === option.value ? null : option.value;
                              setStepClarity((current) => ({
                                ...current,
                                [currentStep.id]: nextValue,
                              }));
                              setRevealedStatusSteps((current) => ({
                                ...current,
                                [currentStep.id]: nextValue !== null,
                              }));
                            }}
                            className={`rounded-full border px-4 py-2 text-sm transition ${
                              isActive
                                ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-white"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      {t("Das ist optional und hilft euch spaeter beim schnellen Ueberblick.")}
                    </p>
                  </StepSection>
                ) : (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedStatusSteps((current) => ({
                          ...current,
                          [currentStep.id]: true,
                        }))
                      }
                      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {t("Status festhalten")}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {t("Naechster Schritt")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {currentStepHasAgreement
                      ? t("Guter Fortschritt. Die Regel fuer diesen Schritt steht.")
                      : t(
                          editingMode === "joint"
                            ? "Haltet jetzt noch eure Regel fest. Dann geht ihr in den naechsten Schritt."
                            : "Halte jetzt noch deine Regel fest. Dann gehst du in den naechsten Schritt."
                        )}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                    saveStatusMeta.tone === "success"
                      ? "bg-emerald-100 text-emerald-700"
                      : saveStatusMeta.tone === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : saveStatusMeta.tone === "error"
                          ? "bg-rose-100 text-rose-700"
                          : saveStatusMeta.tone === "info"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {saveStatusMeta.label}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <ReportActionButton
                  variant="utility"
                  onClick={() => persist(previousStepId)}
                  className={currentIndex === 0 ? "pointer-events-none opacity-50" : ""}
                >
                  {t("Zurueck")}
                </ReportActionButton>

                <div className="flex flex-wrap gap-3">
                  <ReportActionButton
                    onClick={() =>
                      currentIndex === visibleSteps.length - 1
                        ? openSummaryView()
                        : persist(nextStepId)
                    }
                  >
                    {currentIndex === visibleSteps.length - 1
                      ? t("Zur Zusammenfassung")
                      : t("Naechster Schritt")}
                  </ReportActionButton>
                </div>
              </div>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              {currentIndex === visibleSteps.length - 1
                ? t("Beim Wechsel in die Zusammenfassung bleibt euer aktueller Stand erhalten.")
                : t(
                    editingMode === "joint"
                      ? "Beim Weitergehen bleibt euer aktueller Stand erhalten und ihr landet direkt im naechsten Schritt."
                      : "Beim Weitergehen bleibt dein aktueller Stand erhalten und du landest direkt im naechsten Schritt."
                  )}
            </p>
            </div>
          </section>
        </div>
        )}
      </div>
    </div>
  );
}

function HighlightCard({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/88 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t(title)}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">
        {t(text ?? "Aktuell liegt fuer diesen Punkt noch keine hervorgehobene Aussage vor.")}
      </p>
    </div>
  );
}

function AdvisorApprovalRow({
  label,
  approved,
  tone = "default",
}: {
  label: string;
  approved: boolean;
  tone?: "default" | "linked";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
      <span className="text-sm text-slate-700">{t(label)}</span>
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
          approved
            ? tone === "linked"
              ? "bg-[color:var(--brand-accent)]/12 text-[color:var(--brand-accent)]"
              : "bg-emerald-50 text-emerald-700"
            : "bg-slate-200/80 text-slate-500"
        }`}
      >
        {approved ? (tone === "linked" ? t("verbunden") : t("zugestimmt")) : t("offen")}
      </span>
    </div>
  );
}

function WorkbookField({
  title,
  value,
  onChange,
  placeholder,
  highlight = false,
  readOnly = false,
  helperText = null,
  focusSignal = 0,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  highlight?: boolean;
  readOnly?: boolean;
  helperText?: string | null;
  focusSignal?: number;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const baseValueRef = useRef(value);
  const finalTranscriptRef = useRef("");
  const speechSupportState = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot
  );
  const [speechActive, setSpeechActive] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<DictationStatus>("idle");
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);

  useEffect(() => {
    if (speechActive) return;
    baseValueRef.current = value;
  }, [speechActive, value]);

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      clearDictationTimers(inactivityTimeoutRef, restartTimeoutRef);
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (focusSignal === 0 || readOnly) return;
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSignal, readOnly]);

  function scheduleInactivityTimeout() {
    clearTimeoutIfSet(inactivityTimeoutRef);
    inactivityTimeoutRef.current = setTimeout(() => {
      shouldKeepListeningRef.current = false;
      clearTimeoutIfSet(restartTimeoutRef);
      setSpeechActive(false);
      setDictationStatus("ended");
      setSpeechMessage(t("Text uebernommen. Du kannst direkt weiter sprechen."));
      recognitionRef.current?.stop();
    }, DICTATION_INACTIVITY_MS);
  }

  function finishDictationSession(status: DictationStatus, message: string | null) {
    shouldKeepListeningRef.current = false;
    clearDictationTimers(inactivityTimeoutRef, restartTimeoutRef);
    setSpeechActive(false);
    setDictationStatus(status);
    setSpeechMessage(message);
  }

  function handleSpeechResult(event: SpeechRecognitionEventLike) {
    let finalizedChunk = finalTranscriptRef.current;
    let interimChunk = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript?.trim();
      if (!transcript) continue;

      if (result.isFinal) {
        finalizedChunk = appendSpeechChunk(finalizedChunk, transcript);
      } else {
        interimChunk = appendSpeechChunk(interimChunk, transcript);
      }
    }

    finalTranscriptRef.current = finalizedChunk;
    setDictationStatus("listening");
    setSpeechMessage(null);
    scheduleInactivityTimeout();
    onChange(mergeSpeechIntoValue(baseValueRef.current, finalizedChunk, interimChunk));
  }

  function stopDictation() {
    finishDictationSession("ended", t("Text uebernommen. Du kannst direkt weiter sprechen."));
    recognitionRef.current?.stop();
  }

  function startDictation() {
    if (typeof window === "undefined" || readOnly) return;

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor(window);
    if (!SpeechRecognitionCtor) {
      setSpeechMessage(t("Diktieren ist in diesem Browser nicht verfuegbar."));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = DEFAULT_SPEECH_LANGUAGE;
    recognition.onresult = handleSpeechResult;
    recognition.onerror = (event) => {
      if (event.error === "no-speech" && shouldKeepListeningRef.current) {
        setDictationStatus("paused");
        setSpeechMessage(null);
        return;
      }

      finishDictationSession("error", mapSpeechError(event.error));
    };
    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        setDictationStatus("paused");
        setSpeechMessage(null);
        clearTimeoutIfSet(restartTimeoutRef);
        restartTimeoutRef.current = setTimeout(() => {
          if (!shouldKeepListeningRef.current) return;

          try {
            recognition.start();
            setSpeechActive(true);
            setDictationStatus("listening");
            setSpeechMessage(null);
          } catch {
            finishDictationSession(
              "error",
              t("Die Aufnahme konnte nicht erneut gestartet werden.")
            );
          }
        }, DICTATION_RESTART_MS);
        return;
      }

      setSpeechActive(false);
    };

    recognitionRef.current?.abort();
    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;
    clearDictationTimers(inactivityTimeoutRef, restartTimeoutRef);
    baseValueRef.current = value;
    finalTranscriptRef.current = "";
    setDictationStatus("listening");
    setSpeechMessage(null);
    scheduleInactivityTimeout();

    try {
      recognition.start();
      setSpeechActive(true);
    } catch {
      finishDictationSession("error", t("Die Aufnahme konnte gerade nicht gestartet werden."));
    }
  }

  function toggleDictation() {
    if (speechActive) {
      stopDictation();
      return;
    }

    startDictation();
  }

  const dictationDisabled = readOnly || speechSupportState !== "supported";
  const dictationButtonLabel = speechActive
    ? dictationStatus === "paused"
      ? t("Kurze Pause")
      : t("Aufnahme laeuft")
    : t("Diktieren");

  return (
    <section
      className={`rounded-[28px] border p-5 transition-all duration-300 ease-out ${
        highlight
          ? readOnly
            ? "border-[color:var(--brand-primary)]/10 bg-[color:var(--brand-primary)]/3"
            : "border-[color:var(--brand-primary)]/26 bg-[color:var(--brand-primary)]/8 shadow-[0_12px_32px_rgba(103,232,249,0.10)]"
          : readOnly
            ? "border-slate-200/70 bg-slate-50/60"
            : "border-slate-200/70 bg-white"
      } ${readOnly ? "cursor-not-allowed" : "hover:-translate-y-0.5"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-slate-900">{t(title)}</p>
            {readOnly ? (
              <span className="text-xs text-slate-400">{t("Nur lesbar")}</span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleDictation}
          disabled={dictationDisabled}
          aria-label={
            speechActive
              ? t(`Diktat fuer ${title} stoppen`)
              : t(`Diktat fuer ${title} starten`)
          }
          title={t("Sprich frei. Der Text landet direkt im Feld.")}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-300 ${
            speechActive && dictationStatus === "paused"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : speechActive
              ? "border-red-200 bg-red-50 text-red-700"
              : dictationDisabled
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300"
          }`}
        >
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              speechActive && dictationStatus === "paused"
                ? "bg-amber-500"
                : speechActive
                  ? "animate-pulse bg-red-500"
                  : "bg-slate-400"
            }`}
          />
          {dictationButtonLabel}
        </button>
      </div>

      {!readOnly && speechSupportState === "unsupported" ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {t("Diktieren geht in diesem Browser gerade nicht. Schreiben funktioniert trotzdem.")}
        </p>
      ) : null}

      {dictationStatus === "listening" ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {t("Aufnahme laeuft. Der Text erscheint direkt im Feld.")}
        </p>
      ) : null}

      {dictationStatus === "paused" ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {t("Kurze Pause erkannt. Sprich einfach weiter.")}
        </p>
      ) : null}

      {speechMessage ? (
        <p
          className={`mt-3 text-xs leading-6 ${
            dictationStatus === "error" ? "text-amber-700" : "text-slate-500"
          }`}
        >
          {speechMessage}
        </p>
      ) : null}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t(placeholder)}
        rows={10}
        readOnly={readOnly}
        className={`mt-4 min-h-[220px] w-full rounded-2xl border px-4 py-3 text-sm leading-7 outline-none transition-all duration-300 ease-out ${
          readOnly
            ? "cursor-not-allowed border-slate-200/70 bg-slate-100/90 text-slate-600"
            : highlight
              ? "border-[color:var(--brand-primary)]/22 bg-white text-slate-700 shadow-[0_8px_20px_rgba(103,232,249,0.05)] focus:border-[color:var(--brand-primary)]/40 focus:ring-2 focus:ring-[color:var(--brand-primary)]/16"
              : "border-slate-200/80 bg-white text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-[color:var(--brand-primary)]/16"
        }`}
      />
      {helperText ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">{helperText}</p>
      ) : null}
    </section>
  );
}

function StepSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[28px] border p-5 sm:p-6 ${className}`}>
      <h3 className="text-base font-semibold text-slate-950">{t(title)}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function WorkbookSummaryView({
  items,
  unresolvedItems,
  onBack,
  onExportSummary,
  onShowFullExport,
}: {
  items: Array<{
    id: FounderAlignmentWorkbookStepId;
    title: string;
    agreement: string;
    advisorNotes: string;
    advisorClosing: FounderAlignmentWorkbookAdvisorClosing | null;
    advisorFollowUp: FounderAlignmentWorkbookAdvisorFollowUp | null;
    founderReaction: { status: FounderAlignmentWorkbookFounderReactionStatus; comment: string } | null;
    status: StepClarity | null;
  }>;
  unresolvedItems: Array<{
    id: FounderAlignmentWorkbookStepId;
    title: string;
    agreement: string;
    advisorNotes: string;
    advisorClosing: FounderAlignmentWorkbookAdvisorClosing | null;
    advisorFollowUp: FounderAlignmentWorkbookAdvisorFollowUp | null;
    founderReaction: { status: FounderAlignmentWorkbookFounderReactionStatus; comment: string } | null;
    status: StepClarity | null;
  }>;
  onBack: () => void;
  onExportSummary: () => void;
  onShowFullExport: () => void;
}) {
  const nextStepRecommendations = buildNextStepRecommendations(unresolvedItems);

  return (
    <>
      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/75 p-6 print:mt-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Zusammenfassung</p>
        <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-700">
          {t(
            "Diese Zusammenfassung buendelt eure wichtigsten Vereinbarungen aus dem Arbeitsdokument. Sie zeigt, was ihr bereits klar fuer eure Zusammenarbeit festgehalten habt und an welchen Punkten noch weitere Entscheidungen noetig sind."
          )}
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-950">{t(item.title)}</p>
                {item.id === "advisor_closing" ? (
                  <div className="mt-4 space-y-4">
                    <SummaryInsightBlock
                      title={t("Wichtigste Beobachtungen")}
                      text={item.advisorClosing?.observations || "Noch keine Beobachtungen festgehalten."}
                    />
                    <SummaryInsightBlock
                      title={t("Offene Rueckfragen an die Founder")}
                      text={item.advisorClosing?.questions || "Noch keine Rueckfragen festgehalten."}
                    />
                    <SummaryInsightBlock
                      title={t("Empfohlene naechste Schritte / To-dos")}
                      text={item.advisorClosing?.nextSteps || "Noch keine naechsten Schritte festgehalten."}
                    />
                    <div className="rounded-2xl border border-[color:var(--brand-primary)]/16 bg-[color:var(--brand-primary)]/6 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t("Reaktion des Teams")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {item.founderReaction?.status
                          ? t(founderReactionStatusLabel(item.founderReaction.status))
                          : t("Noch kein Reaktionsstatus festgehalten.")}
                      </p>
                      {item.founderReaction?.comment ? (
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {t(item.founderReaction.comment)}
                        </p>
                      ) : null}
                    </div>
                    <SummaryInsightBlock
                      title={t("Naechster Check-in")}
                      text={advisorFollowUpLabel(item.advisorFollowUp)}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {t(item.agreement || "Zu diesem Schritt liegt aktuell noch keine klare Regel vor.")}
                  </p>
                )}
                {item.advisorNotes ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--brand-accent)]/14 bg-[color:var(--brand-accent)]/6 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                      {t("Hinweis aus der Moderation")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{t(item.advisorNotes)}</p>
                  </div>
                ) : null}
              </div>
              {item.status ? <SummaryStatusBadge status={item.status} /> : null}
            </div>
          </div>
        ))}
      </div>

      {unresolvedItems.length > 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {t("Noch offene oder teilweise geklaerte Themen")}
          </p>
          <ul className="mt-4 space-y-3">
            {unresolvedItems.map((item) => (
              <li key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{t(item.title)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {item.status === "open"
                    ? t("Dieses Thema ist noch offen und sollte gezielt weiter besprochen werden.")
                    : t("Zu diesem Thema gibt es bereits eine Richtung, aber noch keine klare Regel.")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 rounded-3xl border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/5 p-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
          {t("Naechste sinnvolle Schritte")}
        </p>
        <ul className="mt-4 space-y-3">
          {nextStepRecommendations.map((recommendation) => (
            <li key={recommendation} className="text-sm leading-7 text-slate-700">
              • {t(recommendation)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ReportActionButton variant="utility" onClick={onBack}>
          {t("Zurueck zum letzten Schritt")}
        </ReportActionButton>

        <div className="flex flex-wrap gap-3">
          <ReportActionButton onClick={onExportSummary}>
            Zusammenfassung als PDF
          </ReportActionButton>
          <ReportActionButton variant="secondary" onClick={onShowFullExport}>
            {t("Workbook als PDF")}
          </ReportActionButton>
        </div>
      </div>
    </>
  );
}

function SummaryInsightBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/88 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t(title)}</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{t(text)}</p>
    </div>
  );
}

function founderReactionStatusLabel(status: Exclude<FounderAlignmentWorkbookFounderReactionStatus, null>) {
  switch (status) {
    case "understood":
      return t("verstanden");
    case "open":
      return "offen";
    case "in_clarification":
      return t("wird geklaert");
  }
}

function advisorFollowUpLabel(value: FounderAlignmentWorkbookAdvisorFollowUp | null) {
  switch (value) {
    case "four_weeks":
      return t("Check-in in 4 Wochen");
    case "three_months":
      return t("Check-in in 3 Monaten");
    default:
      return t("Kein Check-in gesetzt.");
  }
}

function SummaryStatusBadge({ status }: { status: StepClarity }) {
  const statusMeta: Record<StepClarity, { label: string; className: string }> = {
    open: {
      label: "Offen",
      className: "border-slate-200 bg-slate-100 text-slate-700",
    },
    partial: {
      label: t("In Arbeit"),
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    clear: {
      label: t("Regel steht"),
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
  };

  const meta = statusMeta[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}
    >
      {t(meta.label)}
    </span>
  );
}

function WorkbookFullExportView({
  items,
  founderALabel,
  founderBLabel,
  onBack,
  onExport,
}: {
  items: Array<{
    id: FounderAlignmentWorkbookStepId;
    title: string;
    subtitle: string;
    context: string[];
    everyday: string;
    prompts: string[];
    founderAResponse: string;
    founderBResponse: string;
    agreement: string;
    advisorNotes: string;
    advisorClosing: FounderAlignmentWorkbookAdvisorClosing | null;
    advisorFollowUp: FounderAlignmentWorkbookAdvisorFollowUp | null;
    founderReaction: { status: FounderAlignmentWorkbookFounderReactionStatus; comment: string } | null;
    status: StepClarity | null;
  }>;
  founderALabel: string;
  founderBLabel: string;
  onBack: () => void;
  onExport: () => void;
}) {
  return (
    <>
      <div className="space-y-8">
        {items.map((item, index) => (
          <section
            key={item.id}
            className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.04)] print:break-inside-avoid print:rounded-none print:border-b print:border-x-0 print:border-t-0 print:px-0 print:py-8 print:shadow-none"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Schritt {index + 1}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t(item.title)}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
                  {t(item.subtitle)}
                </p>
              </div>
              {item.status ? <SummaryStatusBadge status={item.status} /> : null}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
              <p className="text-sm font-semibold text-slate-900">Warum dieses Thema wichtig ist</p>
              <div className="mt-3 space-y-3">
                {item.context.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700">
                    {t(paragraph)}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-900">So zeigt sich das im Alltag</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t(item.everyday)}</p>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
              <p className="text-sm font-semibold text-slate-900">Fragen der Session</p>
              <ul className="mt-4 space-y-3">
                {item.prompts.map((prompt) => (
                  <li
                    key={prompt}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {t(prompt)}
                  </li>
                ))}
              </ul>
            </div>

            {item.id === "advisor_closing" ? (
              <div className="mt-5 grid gap-5">
                <ExportResponseCard
                  title="Wichtigste Beobachtungen"
                  text={item.advisorClosing?.observations || ""}
                />
                <ExportResponseCard
                  title="Offene Rueckfragen an die Founder"
                  text={item.advisorClosing?.questions || ""}
                />
                <ExportResponseCard
                  title="Empfohlene naechste Schritte / To-dos"
                  text={item.advisorClosing?.nextSteps || ""}
                  highlight
                />
                <ExportResponseCard
                  title="Reaktion des Teams"
                  text={
                    item.founderReaction?.status
                      ? `${founderReactionStatusLabel(item.founderReaction.status)}${
                          item.founderReaction.comment
                            ? `\n\n${item.founderReaction.comment}`
                            : ""
                        }`
                      : item.founderReaction?.comment || ""
                  }
                />
                <ExportResponseCard
                  title="Naechster Check-in"
                  text={advisorFollowUpLabel(item.advisorFollowUp)}
                />
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <ExportResponseCard
                    title={`Perspektive ${founderALabel}`}
                    text={item.founderAResponse}
                  />
                  <ExportResponseCard
                    title={`Perspektive ${founderBLabel}`}
                    text={item.founderBResponse}
                  />
                </div>

                <div className="mt-5">
                  <ExportResponseCard
                    title="Gemeinsame Regel"
                    text={item.agreement}
                    highlight
                  />
                </div>

                {item.advisorNotes ? (
                  <div className="mt-5">
                    <ExportResponseCard
                      title="Hinweis aus der Moderation"
                      text={item.advisorNotes}
                    />
                  </div>
                ) : null}
              </>
            )}
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ReportActionButton variant="utility" onClick={onBack}>
          {t("Zurueck zur Zusammenfassung")}
        </ReportActionButton>

        <ReportActionButton onClick={onExport}>{t("Workbook als PDF")}</ReportActionButton>
      </div>
    </>
  );
}

function ExportResponseCard({
  title,
  text,
  highlight = false,
}: {
  title: string;
  text: string;
  highlight?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl border p-6 ${
        highlight
          ? "border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/5"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-semibold text-slate-900">{t(title)}</p>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
        {t(text || "Keine Eingabe festgehalten.")}
      </p>
    </section>
  );
}

function buildNextStepRecommendations(
  unresolvedItems: Array<{
    id: FounderAlignmentWorkbookStepId;
    title: string;
    agreement: string;
    advisorNotes: string;
    status: StepClarity | null;
  }>
) {
  if (unresolvedItems.length === 0) {
    return [
      "Ueberprueft eure Vereinbarungen regelmaessig und achtet darauf, wie sie sich im Alltag bewaehren.",
      t("Richtet die naechsten 90 Tage bewusst an den Punkten aus, die ihr gemeinsam festgehalten habt."),
    ];
  }

  const recommendations = unresolvedItems.map((item) => {
    switch (item.id) {
      case "roles_responsibility":
        return "Haltet Rollen, Zustaendigkeiten und Entscheidungsraeume schriftlich fest.";
      case "decision_rules":
        return t("Definiert eine klare Entscheidungsregel fuer Faelle mit Zeitdruck oder Unsicherheit.");
      case "collaboration_conflict":
        return "Etabliert einen kurzen Konflikt- oder Feedback-Check-in, bevor Spannungen liegen bleiben.";
      case "commitment_load":
        return t("Klaert Verfuegbarkeit, Fokus und Belastungsgrenzen noch einmal explizit miteinander.");
      case "ownership_risk":
        return "Sprecht Risiko, Finanzierung und Ownership mit klaren gemeinsamen Grenzen weiter durch.";
      case "values_guardrails":
        return t(
          "Haltet eure roten Linien und unternehmerischen Leitplanken schriftlich fest, bevor Entscheidungen unter Druck anstehen."
        );
      case "vision_direction":
        return t("Schaerft eure gemeinsame Richtung schriftlich, bevor strategische Entscheidungen anstehen.");
      case "alignment_90_days":
        return t("Uebersetzt offene Punkte in konkrete naechste Schritte fuer die kommenden 90 Tage.");
      default:
        return t("Fuehrt offene Themen mit einer konkreten Vereinbarung oder einem klaren naechsten Schritt weiter.");
    }
  });

  return Array.from(new Set(recommendations));
}

function escapeRegexPattern(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseStructuredAgreement(
  input: string,
  fields: WorkbookStructuredOutputField[]
): StructuredAgreementValues {
  const trimmedInput = input.trim();
  const fallback = Object.fromEntries(fields.map((field) => [field.key, ""]));

  if (!trimmedInput) {
    return fallback;
  }

  const matches = fields.map((field, index) => {
    const nextTitles = fields
      .slice(index + 1)
      .map((nextField) => escapeRegexPattern(nextField.title))
      .join("|");
    const boundary = nextTitles ? `(?:\\n\\s*\\n(?:${nextTitles}):|$)` : "$";
    const pattern = new RegExp(
      `${escapeRegexPattern(field.title)}:\\s*([\\s\\S]*?)${boundary}`
    );

    return {
      key: field.key,
      value: trimmedInput.match(pattern)?.[1]?.trim() ?? "",
    };
  });

  const hasAnyMatch = matches.some((match) => match.value.length > 0);

  if (!hasAnyMatch) {
    return {
      ...fallback,
      [fields[0]?.key ?? "value"]: trimmedInput,
    };
  }

  return Object.fromEntries(matches.map((match) => [match.key, match.value]));
}

function serializeStructuredAgreement(
  fields: WorkbookStructuredOutputField[],
  values: StructuredAgreementValues
) {
  return fields
    .map((field) => `${field.title}: ${(values[field.key] ?? "").trim()}`)
    .join("\n\n");
}

function serializeWorkbookPayload(payload: FounderAlignmentWorkbookPayload) {
  return JSON.stringify(sanitizeFounderAlignmentWorkbookPayload(payload));
}

function teamContextLabel(teamContext: TeamContext | null) {
  if (teamContext === "existing_team") {
    return t("Bestehendes Gruenderteam");
  }

  if (teamContext === "pre_founder") {
    return t("Moegliche Gruendungspartnerschaft");
  }

  return "Unbekannter Kontext";
}

function buildAgreementDraft({
  stepId,
  founderAResponse,
  founderBResponse,
  sourceMode,
}: {
  stepId: FounderAlignmentWorkbookStepId;
  founderAResponse: string;
  founderBResponse: string;
  sourceMode: "solo" | "joint";
}): AgreementDraftResult {
  const meta = AGREEMENT_DRAFT_META[stepId];
  const founderAText = normalizeAgreementSource(founderAResponse);
  const founderBText = normalizeAgreementSource(founderBResponse);
  const founderAThemes = detectThemes(founderAText, meta.themeSignals);
  const founderBThemes = detectThemes(founderBText, meta.themeSignals);
  const sharedThemes = founderAThemes.filter((theme) => founderBThemes.includes(theme));
  const differingThemes = uniqueValues([
    ...founderAThemes.filter((theme) => !sharedThemes.includes(theme)),
    ...founderBThemes.filter((theme) => !sharedThemes.includes(theme)),
  ]);
  const tokenOverlap = getTokenOverlapScore(founderAText, founderBText);
  const isJointUnclear =
    sourceMode === "joint" &&
    founderAText.length + founderBText.length < 90 &&
    sharedThemes.length === 0 &&
    differingThemes.length === 0 &&
    tokenOverlap < 0.18;
  const state =
    sourceMode === "solo"
      ? "solo"
      : isJointUnclear
        ? "unclear"
        : differingThemes.length > 0 || tokenOverlap < 0.12
          ? "different"
          : "aligned";

  return {
    draft: buildStepSpecificAgreementDraft({
      stepId,
      state,
    }),
    sourceMode,
    state,
    comparisonLabel:
      sourceMode === "joint"
        ? state === "aligned"
          ? "Ihr seid euch hier einig"
          : state === "different"
            ? "Ihr wuerdet unterschiedlich entscheiden"
            : "Eure Antworten sind noch zu offen"
        : null,
    comparisonHint:
      sourceMode === "joint"
        ? state === "aligned"
          ? sharedThemes.length > 0
            ? `Beide Antworten ziehen in dieselbe Richtung, vor allem bei ${joinWithUnd(
                sharedThemes.slice(0, 2)
              )}.`
            : "Beide Antworten klingen aehnlich und lassen sich gut in eine gemeinsame Regel uebersetzen."
          : state === "different"
            ? differingThemes.length > 0
              ? `Der Unterschied liegt vor allem bei ${joinWithUnd(
                  differingThemes.slice(0, 2)
                )}. Genau dafuer braucht ihr jetzt eine klare Regel.`
              : "Ihr setzt bei derselben Situation unterschiedliche Schwerpunkte. Genau dafuer braucht ihr jetzt eine klare Regel."
            : "Aus euren Antworten ist noch nicht klar genug, wer was entscheidet oder was im Zweifel gilt."
        : null,
    suggestionTitle:
      sourceMode === "joint"
        ? "Vorschlag fuer eure gemeinsame Regel"
        : "Moegliche Regel auf Basis deiner Antwort",
    suggestionIntro:
      sourceMode === "joint"
        ? "So koennte eure Regel lauten:"
        : "So koennte eure erste Regel lauten:",
  };
}

function normalizeAgreementSource(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function detectThemes(
  text: string,
  themeSignals: Array<{ label: string; keywords: string[] }>
) {
  const normalizedText = text.toLowerCase();
  return themeSignals
    .filter((signal) => signal.keywords.some((keyword) => normalizedText.includes(keyword)))
    .map((signal) => signal.label);
}

function joinWithUnd(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} und ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} und ${values[values.length - 1]}`;
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function buildStepSpecificAgreementDraft({
  stepId,
  state,
}: {
  stepId: FounderAlignmentWorkbookStepId;
  state: "aligned" | "different" | "unclear" | "solo";
}) {
  switch (stepId) {
    case "vision_direction":
      return state === "different"
        ? "Wenn ihr eine neue Chance unterschiedlich seht, dann prueft ihr zuerst, ob sie wirklich zu eurem Ziel passt. Wenn das nicht klar ist, sagt ihr noch nichts zu."
        : state === "unclear"
          ? "Wenn eine neue Chance auftaucht, dann haltet ihr zuerst fest, was gerade Vorrang hat. Solange das offen ist, sagt ihr nichts zu."
          : state === "solo"
            ? "Wenn eine neue Chance auftaucht, dann pruefe ich zuerst, ob sie zu meiner Richtung passt. Erst dann entscheide ich ueber den naechsten Schritt."
            : "Wenn eine neue Chance auftaucht, dann prueft ihr zuerst, ob sie zu eurer gemeinsamen Richtung passt. Erst dann entscheidet ihr ueber den naechsten Schritt.";

    case "decision_rules":
      return state === "different"
        ? `Wenn ihr eine Entscheidung unterschiedlich seht, dann entscheidet zuerst die Person, die das Thema fuehrt. Wenn Risiko, Budget oder Aussenwirkung groesser sind, dann entscheidet ihr gemeinsam bis zu einer festen Frist.`
        : state === "unclear"
          ? "Wenn nicht klar ist, wer entscheidet, dann legt ihr zuerst die verantwortliche Person fest. Wenn ihr danach noch nicht weiterkommt, setzt ihr sofort eine Frist."
          : state === "solo"
            ? "Wenn eine Entscheidung in meinen Bereich faellt, dann entscheide ich sie selbst. Wenn Risiko, Budget oder Aussenwirkung groesser werden, hole ich die andere Person dazu."
            : "Wenn eine Entscheidung im Verantwortungsbereich bleibt, dann entscheidet die fuehrende Person. Wenn Risiko, Budget oder Aussenwirkung groesser werden, entscheidet ihr gemeinsam.";

    case "ownership_risk":
      return state === "different"
        ? `Wenn ein Risiko unterschiedlich bewertet wird, dann macht die fuehrende Person es sofort sichtbar. Wenn die Folgen groesser werden, dann entscheidet ihr gemeinsam ueber Stop, Weitergehen oder Begrenzen.`
        : state === "unclear"
          ? "Wenn ein Risiko auftaucht, dann legt ihr sofort fest, wer es klaert. Auch wenn die Folgen noch unklar sind, macht ihr es direkt sichtbar."
          : state === "solo"
            ? "Wenn ich ein Risiko sehe, dann mache ich es sofort sichtbar. Wenn die Folgen groesser werden, hole ich die andere Person in die Entscheidung."
            : "Wenn ein Risiko auftaucht, dann macht die verantwortliche Person es sofort sichtbar. Wenn eine Grenze erreicht ist, entscheidet ihr gemeinsam ueber den naechsten Schritt.";

    case "values_guardrails":
      return state === "different"
        ? `Wenn ein Schritt fuer eine Person noch okay ist und fuer die andere nicht, dann stoppt ihr ihn zuerst. Wenn ihr ihn weiter prueft, dann nur gegen eine gemeinsam benannte Grenze.`
        : state === "unclear"
          ? "Wenn eine Grauzone auftaucht, dann benennt ihr zuerst eure Grenze. Wenn die Grenze nicht klar ist, trefft ihr die Entscheidung noch nicht."
          : state === "solo"
            ? "Wenn eine Entscheidung fuer mich in eine Grauzone geht, dann stoppe ich sie zuerst. Ich gehe nur weiter, wenn meine Grenze klar benannt ist."
            : "Wenn eine kritische Entscheidung ansteht, dann prueft ihr zuerst, ob sie fuer euch beide noch in Ordnung ist. Wenn sie ueber eure Grenze geht, macht ihr den Schritt nicht.";

    case "roles_responsibility":
      return state === "different"
        ? `Wenn ein Thema in einen Bereich faellt, dann fuehrt die verantwortliche Person. Wenn die andere Person betroffen ist oder etwas blockiert, dann wird sie frueh eingebunden und nicht erst ganz am Ende.`
        : state === "unclear"
          ? "Wenn nicht klar ist, wem ein Thema gehoert, dann legt ihr zuerst die Federfuehrung fest. Wenn die Entscheidung groesser wird, benennt ihr sofort, wer mit reinmuss."
          : state === "solo"
            ? "Wenn ein Thema in meinen Bereich faellt, dann fuehre ich es. Wenn andere betroffen sind oder etwas blockiert, hole ich sie frueh dazu."
            : "Wenn ein Thema in einen Bereich faellt, dann fuehrt die verantwortliche Person. Wenn andere betroffen sind, teilt sie den Stand frueh und holt sie rechtzeitig dazu.";

    case "commitment_load":
      return state === "different"
        ? `Wenn eine Person merkt, dass Verfuegbarkeit oder Belastung nicht mehr passen, dann sagt sie das sofort. Wenn Zusagen dadurch wackeln, dann priorisiert ihr zuerst neu, statt still auf mehr Einsatz zu hoffen.`
        : state === "unclear"
          ? "Wenn nicht klar ist, was realistisch leistbar ist, dann benennt ihr zuerst euren Normalmodus. Wenn jemand davon abweicht, sprecht ihr es sofort an und priorisiert neu."
          : state === "solo"
            ? "Wenn ich merke, dass Verfuegbarkeit oder Belastung nicht mehr passen, sage ich das sofort. Wenn Zusagen dadurch wackeln, priorisieren wir neu."
            : "Wenn alles normal laeuft, dann haltet ihr euch an eure vereinbarte Verfuegbarkeit. Wenn eine Person an ihre Grenze kommt, sprecht ihr das sofort an und setzt Prioritaeten neu.";

    case "collaboration_conflict":
      return state === "different"
        ? "Wenn etwas stoert, sprecht ihr es frueh an. Wenn ihr dabei sehr unterschiedlich vorgeht, legt ihr direkt ein ruhiges Klaerungsgespraech fest."
        : state === "unclear"
          ? "Wenn etwas stoert, dann sprecht ihr es klar an. Wenn das gerade nicht gut geht, legt ihr direkt einen festen Termin dafuer fest."
          : state === "solo"
            ? "Wenn mich etwas stoert, spreche ich es frueh an. Wenn das im Moment nicht gut geht, setze ich direkt einen festen Klaerungspunkt."
            : "Wenn etwas stoert, dann sprecht ihr es frueh an. Wenn das Gespraech festfaehrt, klaert ihr erst den Konflikt und geht dann zur Sache zurueck.";

    case "alignment_90_days":
      return state === "different"
        ? `Wenn Prioritaeten auseinanderlaufen, dann klaert ihr zuerst, was in den naechsten 90 Tagen wirklich Vorrang hat. Wenn ein neues Thema dazukommt, entscheidet ihr direkt, was dafuer liegen bleibt.`
        : state === "unclear"
          ? "Wenn fuer die naechsten 90 Tage noch nichts klar priorisiert ist, dann legt ihr zuerst drei Themen fest. Wenn etwas Neues dazukommt, entscheidet ihr direkt, was dafuer verschoben wird."
          : state === "solo"
            ? "Wenn ich die naechsten 90 Tage plane, halte ich zuerst meine drei wichtigsten Themen fest. Wenn etwas Neues dazukommt, entscheide ich direkt, was dafuer warten muss."
            : "Wenn ihr eure naechsten 90 Tage plant, haltet ihr zuerst eure drei wichtigsten Themen fest. Wenn etwas Neues auftaucht, entscheidet ihr direkt, was dafuer warten muss.";

    default:
      return state === "different"
        ? `Wenn ihr etwas unterschiedlich bewertet, dann sprecht ihr den Unterschied zuerst offen aus. Wenn er den Alltag blockiert, dann legt ihr direkt eine gemeinsame Regel fest.`
        : state === "unclear"
          ? "Wenn noch nicht klar ist, was gelten soll, dann beschreibt ihr zuerst den Normalfall. Wenn etwas davon abweicht, legt ihr sofort fest, wer entscheidet."
          : state === "solo"
            ? "Wenn im Alltag alles normal laeuft, halte ich mich an meine Regel. Wenn etwas davon abweicht, entscheide ich bewusst, was dann gilt."
            : "Wenn im Alltag alles normal laeuft, haltet ihr euch an eure Regel. Wenn etwas davon abweicht, besprecht ihr es frueh und legt es klar fest.";
  }
}

function getTokenOverlapScore(firstText: string, secondText: string) {
  if (!firstText || !secondText) return 0;

  const firstTokens = extractComparisonTokens(firstText);
  const secondTokens = extractComparisonTokens(secondText);

  if (firstTokens.length === 0 || secondTokens.length === 0) return 0;

  const secondSet = new Set(secondTokens);
  const sharedCount = firstTokens.filter((token) => secondSet.has(token)).length;
  return sharedCount / Math.max(firstTokens.length, secondTokens.length);
}

function extractComparisonTokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s]/gi, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 3 &&
        ![
          "dann",
          "wenn",
          "eine",
          "einer",
          "einem",
          "eines",
          "einen",
          "dieser",
          "diesem",
          "dieses",
          "damit",
          "soll",
          "sollte",
          "wuerde",
          "wuerdet",
          "konkret",
          "regel",
          "fuer",
          "euch",
          "eure",
          "einerseits",
          "andererseits",
        ].includes(token)
    );
}

function getSpeechRecognitionConstructor(windowObject: Window) {
  const extendedWindow = windowObject as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return extendedWindow.SpeechRecognition ?? extendedWindow.webkitSpeechRecognition ?? null;
}

function subscribeToSpeechSupport() {
  return () => {};
}

function getSpeechSupportSnapshot(): SpeechSupportState {
  if (typeof window === "undefined") return "unknown";
  return getSpeechRecognitionConstructor(window) ? "supported" : "unsupported";
}

function getSpeechSupportServerSnapshot(): SpeechSupportState {
  return "unknown";
}

function clearTimeoutIfSet(timeoutRef: { current: ReturnType<typeof setTimeout> | null }) {
  if (timeoutRef.current === null) return;
  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

function clearDictationTimers(
  inactivityTimeoutRef: { current: ReturnType<typeof setTimeout> | null },
  restartTimeoutRef: { current: ReturnType<typeof setTimeout> | null }
) {
  clearTimeoutIfSet(inactivityTimeoutRef);
  clearTimeoutIfSet(restartTimeoutRef);
}

function appendSpeechChunk(currentText: string, nextChunk: string) {
  const trimmedChunk = nextChunk.trim();
  if (!trimmedChunk) return currentText;
  if (!currentText.trim()) return trimmedChunk;
  return `${currentText.trim()} ${trimmedChunk}`;
}

function mergeSpeechIntoValue(baseValue: string, finalizedChunk: string, interimChunk: string) {
  const pieces = [baseValue.trim(), finalizedChunk.trim(), interimChunk.trim()].filter(Boolean);
  if (pieces.length === 0) return "";
  return pieces.join(baseValue.trim() ? "\n\n" : " ");
}

function mapSpeechError(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Der Mikrofonzugriff wurde nicht freigegeben.";
    case "audio-capture":
      return "Es konnte kein Mikrofon gefunden werden.";
    case "aborted":
      return "Die Aufnahme wurde beendet.";
    case "no-speech":
      return "Es wurde gerade keine Sprache erkannt.";
    default:
      return "Die Sprachaufnahme konnte gerade nicht verarbeitet werden.";
  }
}

function ModeCard({
  title,
  text,
  active,
  onClick,
  disabled = false,
}: {
  title: string;
  text: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-2xl border p-4 text-left transition-all duration-300 ease-out ${
        active
          ? "border-[color:var(--brand-accent)]/24 bg-[color:var(--brand-accent)]/7 text-slate-900 ring-1 ring-[color:var(--brand-accent)]/10"
          : "border-slate-200/70 bg-slate-50/70 text-slate-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t(title)}</p>
          <p className={`mt-2 text-sm leading-6 ${active ? "text-slate-700" : "text-slate-600"}`}>
            {t(text)}
          </p>
        </div>
        <span
          className={`mt-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
            active
              ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-white"
              : "border-slate-200 bg-white text-slate-400"
          }`}
          aria-hidden="true"
        >
          {active ? "✓" : ""}
        </span>
      </div>
      <p className={`mt-3 text-[11px] uppercase tracking-[0.18em] ${active ? "text-[color:var(--brand-accent)]" : "text-slate-400"}`}>
        {active ? t("Aktiv") : t("Verfuegbar")}
      </p>
    </button>
  );
}
