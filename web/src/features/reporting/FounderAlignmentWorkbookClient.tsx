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
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import {
  prepareFounderAlignmentAdvisorInvite,
  saveFounderAlignmentWorkbook,
} from "@/features/reporting/founderAlignmentWorkbookActions";
import { type FounderAlignmentWorkbookViewerRole } from "@/features/reporting/founderAlignmentWorkbookData";
import { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
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
  type FounderAlignmentWorkbookPatch,
  type FounderAlignmentWorkbookPayload,
  type FounderAlignmentWorkbookStepMode,
  type FounderAlignmentWorkbookStepStatus,
  type FounderAlignmentWorkbookStepId,
} from "@/features/reporting/founderAlignmentWorkbook";
import { type FounderAlignmentWorkbookAdvisorInviteState } from "@/features/reporting/founderAlignmentWorkbookAdvisor";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type FounderAlignmentWorkbookClientProps = {
  invitationId: string | null;
  teamContext: TeamContext;
  founderAName: string | null;
  founderBName: string | null;
  founderAAvatarId: string | null;
  founderBAvatarId: string | null;
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
type WorkbookModeOption = Exclude<FounderAlignmentWorkbookStepMode, never>;

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

const WORKBOOK_MODE_OPTIONS: ReadonlyArray<{
  value: WorkbookModeOption;
  label: string;
  description: string;
}> = [
  {
    value: "solo",
    label: "Ich arbeite gerade allein",
    description: "Du siehst nur deine eigene Perspektive und kannst einen vorläufigen Vorschlag vorbereiten.",
  },
  {
    value: "collaborative",
    label: "Wir bearbeiten diesen Schritt gemeinsam",
    description: "Beide Perspektiven, gemeinsamer Vorschlag und finale Absprache bleiben gleichzeitig sichtbar.",
  },
] as const;

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
  founderAAvatarId,
  founderBAvatarId,
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
  const [showSummaryView, setShowSummaryView] = useState(false);
  const [agreementFieldFocusSignal, setAgreementFieldFocusSignal] = useState(0);
  const [helperOpenByStep, setHelperOpenByStep] = useState<
    Record<FounderAlignmentWorkbookStepId, boolean>
  >(() =>
    Object.fromEntries(
      FOUNDER_ALIGNMENT_WORKBOOK_STEPS.map((step) => [step.id, false])
    ) as Record<FounderAlignmentWorkbookStepId, boolean>
  );
  const [advisorInviteState, setAdvisorInviteState] =
    useState<FounderAlignmentWorkbookAdvisorInviteState>(advisorInvite);
  const [advisorInviteMessage, setAdvisorInviteMessage] = useState<string | null>(null);
  const [advisorInviteLink, setAdvisorInviteLink] = useState<string | null>(null);
  const currentStepRef = useRef<HTMLElement | null>(null);
  const shouldScrollToStepRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedWorkbookRef = useRef(sanitizeFounderAlignmentWorkbookPayload(initialWorkbook));
  const lastTrackedSnapshotRef = useRef(serializeWorkbookPayload(initialWorkbook));
  const lastUpdatedAtRef = useRef(updatedAt);
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
  const showAdvisorInviteCard =
    currentUserRole === "founderA" ||
    currentUserRole === "founderB" ||
    advisorInviteState.founderAApproved ||
    advisorInviteState.founderBApproved ||
    advisorInviteState.advisorLinked;
  const progress = ((Math.max(currentIndex, 0) + 1) / visibleSteps.length) * 100;
  const currentStepContent = WORKBOOK_STEP_CONTENT[currentStep.id];
  const currentStepIsAdvisorClosing = currentStep.id === "advisor_closing";
  const isFocusedStep = highlights.prioritizedStepIds.includes(currentStep.id);
  const currentStepEntry = workbook.steps[currentStep.id];
  const currentStepMode = currentStepEntry.mode;
  const isCollaborativeMode = currentStepMode === "collaborative";
  const viewerFounderField =
    currentUserRole === "founderA"
      ? "founderA"
      : currentUserRole === "founderB"
        ? "founderB"
        : null;
  const otherFounderField =
    viewerFounderField === "founderA"
      ? "founderB"
      : viewerFounderField === "founderB"
        ? "founderA"
        : null;
  const hasBothPerspectives =
    currentStepEntry.founderA.trim().length > 0 &&
    currentStepEntry.founderB.trim().length > 0;
  const hasAnyPerspectiveInput =
    currentStepEntry.founderA.trim().length > 0 || currentStepEntry.founderB.trim().length > 0;
  const currentUserInputValue = viewerFounderField ? currentStepEntry[viewerFounderField] : "";
  const otherFounderHasInput = otherFounderField
    ? currentStepEntry[otherFounderField].trim().length > 0
    : false;
  const otherFounderApproved =
    otherFounderField === "founderA"
      ? currentStepEntry.founderAApproved
      : otherFounderField === "founderB"
        ? currentStepEntry.founderBApproved
        : false;
  const currentUserApproved =
    viewerFounderField === "founderA"
      ? currentStepEntry.founderAApproved
      : viewerFounderField === "founderB"
        ? currentStepEntry.founderBApproved
        : false;
  const otherFounderLabel =
    otherFounderField === "founderA"
      ? founderALabel
      : otherFounderField === "founderB"
        ? founderBLabel
        : null;
  const currentStepIsApprovedByBoth =
    currentStepEntry.founderAApproved && currentStepEntry.founderBApproved;
  const currentStepStatus = deriveWorkbookStepStatus(currentStepEntry);
  const currentAgreementDraft = useMemo(() => {
    if (currentStepIsAdvisorClosing || !hasAnyPerspectiveInput) {
      return null;
    }

    return buildAgreementDraft({
      stepId: currentStep.id,
      founderAResponse: currentStepEntry.founderA,
      founderBResponse: currentStepEntry.founderB,
      sourceMode: hasBothPerspectives ? "joint" : "solo",
    });
  }, [
    currentStep.id,
    currentStepIsAdvisorClosing,
    hasAnyPerspectiveInput,
    hasBothPerspectives,
    currentStepEntry,
  ]);
  const currentAgreementValue = currentStepEntry.agreement.trim();
  const currentStepHasAgreement = currentAgreementValue.length > 0;
  const helperQuestion = currentStep.prompts[0] ?? "Welche gemeinsame Absprache soll hier fuer euch gelten?";
  const shortContext = currentStepContent.context.slice(0, 1);
  const helperDetails = currentStep.prompts.slice(1);
  const stepProgressMeta = useMemo(
    () =>
      Object.fromEntries(
        visibleSteps.map((step) => {
          const stepEntry = workbook.steps[step.id];
          const status = deriveWorkbookStepStatus(stepEntry);
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
          const completed = step.id === "advisor_closing" ? hasAdvisorClosingContent : status === "finalized";
          const started =
            completed ||
            status !== "collecting_inputs" ||
            hasAdvisorNotes ||
            hasAdvisorClosingContent;

          return [
            step.id,
            {
              completed,
              started,
              status,
            },
          ];
        })
      ) as Record<
        FounderAlignmentWorkbookStepId,
        { completed: boolean; started: boolean; status: FounderAlignmentWorkbookStepStatus }
      >,
    [
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
        };
      }),
    [
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
  }, [activeStepId, showSummaryView]);

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

    if (field === "founderA") {
      return isCollaborativeMode || currentUserRole === "founderA";
    }

    if (field === "founderB") {
      return isCollaborativeMode || currentUserRole === "founderB";
    }

    if (field === "agreement") {
      return true;
    }

    if (field === "advisorNotes") {
      return false;
    }

    return true;
  }

  function updateStepMode(mode: WorkbookModeOption) {
    if (currentStepIsAdvisorClosing || currentUserRole === "advisor" || currentUserRole === "unknown") {
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
          mode,
        },
      },
    }));
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
          ...(field === "advisorNotes"
            ? {}
            : {
                founderAApproved: false,
                founderBApproved: false,
              }),
        },
      },
    }));
  }

  function updateApproval(approved: boolean) {
    if (currentUserRole !== "founderA" && currentUserRole !== "founderB") {
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
          founderAApproved:
            currentUserRole === "founderA"
              ? approved
              : current.steps[activeStepId].founderAApproved,
          founderBApproved:
            currentUserRole === "founderB"
              ? approved
              : current.steps[activeStepId].founderBApproved,
        },
      },
    }));
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

    const patches = buildWorkbookPatches(lastPersistedWorkbookRef.current, nextWorkbook);
    if (patches.length === 0) {
      setSaveState((current) => ({
        ...current,
        kind: mode === "autosave" ? "autosaved" : "saved",
        message: mode === "autosave" ? t("Automatisch gesichert") : t("Alles gesichert"),
        updatedAt: lastUpdatedAtRef.current,
      }));
      return true;
    }

    const previousSnapshot = lastTrackedSnapshotRef.current;
    const nextSnapshot = serializeWorkbookPayload(nextWorkbook);
    const requestId = saveSequenceRef.current + 1;
    saveSequenceRef.current = requestId;
    lastTrackedSnapshotRef.current = nextSnapshot;

    setSaveState((current) => ({
      ...current,
      kind: "saving",
      message: mode === "autosave" ? t("Sichert automatisch...") : "Sichert...",
    }));

    const result = await saveFounderAlignmentWorkbook({
      invitationId,
      teamContext,
      expectedUpdatedAt: lastUpdatedAtRef.current,
      patches,
    });

    if (requestId !== saveSequenceRef.current) {
      return result.ok;
    }

    if (!result.ok) {
      if (result.reason !== "stale_version") {
        lastTrackedSnapshotRef.current = previousSnapshot;
      }
      setSaveState((current) => ({
        ...current,
        kind: "error",
        message:
          result.reason === "stale_version"
            ? t("Dieses Workbook wurde zwischenzeitlich an anderer Stelle aktualisiert. Bitte lade die Seite neu, bevor du weiterarbeitest.")
            : t("Die Session konnte gerade nicht gespeichert werden."),
      }));
      return false;
    }

    lastPersistedWorkbookRef.current = sanitizeFounderAlignmentWorkbookPayload(nextWorkbook);
    lastTrackedSnapshotRef.current = nextSnapshot;
    lastUpdatedAtRef.current = result.updatedAt;

    setSaveState({
      kind: mode === "autosave" ? "autosaved" : "saved",
      message:
        mode === "autosave"
          ? t("Automatisch gesichert")
          : t("Alles gesichert"),
      updatedAt: result.updatedAt,
    });
    return true;
  }, [canSave, invitationId, teamContext]);

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
    if (currentSnapshot === lastTrackedSnapshotRef.current) {
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
      return "Finale Absprache";
    }

    return field === "founderA" ? founderALabel : founderBLabel;
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
    setShowSummaryView(true);
  }

  function returnToWorkbook() {
    shouldScrollToStepRef.current = true;
    setShowSummaryView(false);
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

  return (
    <div className="print-document-root min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_26%,#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8 print:min-h-0 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-7xl print:max-w-none">
        {showSummaryView ? (
          <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none">
            <div className="flex flex-col gap-5 border-b border-slate-200 pb-8 print:pb-6">
              <object
                type="image/svg+xml"
                data="/cofoundery-align-logo.svg"
                className="h-8 w-auto print:h-7"
                aria-label="CoFoundery Align Logo"
              />
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Zusammenfassung</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-950">Zusammenfassung</h1>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  {founderALabel} x {founderBLabel}
                </p>
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-700">
                  {t("Zusammenfassung eurer wichtigsten Vereinbarungen aus dem Workbook.")}
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
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Workbook</p>
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
                      : t("Die erste klare Regel entsteht gleich im Workbook.")}
                  </p>
                </div>
              </div>
            </div>

            {(!currentStepIsAdvisorClosing || showAdvisorInviteCard) && (
              <div
                className={`mt-6 grid gap-4 ${
                  showAdvisorInviteCard
                    ? "xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]"
                    : ""
                }`}
              >
                {!currentStepIsAdvisorClosing ? (
                  <section className="rounded-[28px] border border-[color:var(--brand-primary)]/18 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.035)] sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          {t("Arbeitsmodus")}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-950">
                          {t("Wie möchtet ihr diesen Schritt bearbeiten?")}
                        </h2>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {t("Legt zuerst fest, ob ihr diesen Schritt allein vorbereitet oder direkt gemeinsam bearbeitet.")}
                        </p>
                      </div>
                      <span className="rounded-full border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
                        {t(`Schritt ${currentIndex + 1}`)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      {WORKBOOK_MODE_OPTIONS.map((option) => {
                        const isActive = currentStepMode === option.value;
                        const disabled =
                          currentUserRole === "advisor" || currentUserRole === "unknown";
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateStepMode(option.value)}
                            disabled={disabled}
                            className={`rounded-2xl border px-4 py-4 text-left transition ${
                              isActive
                                ? "border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/10 shadow-[0_10px_24px_rgba(34,211,238,0.08)]"
                                : disabled
                                  ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{t(option.label)}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {t(option.description)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {showAdvisorInviteCard ? (
                  <aside className="rounded-[24px] border border-slate-200/80 bg-slate-50/78 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                    <div className="max-w-md">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t("Dritte Perspektive")}
                      </p>
                      <h3 className="mt-1.5 text-base font-semibold text-slate-950">
                        {advisorInviteState.advisorLinked
                          ? t("Moderation ist verbunden")
                          : t("Optional eine dritte Perspektive einbinden")}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {advisorInviteState.advisorLinked
                          ? t(
                              "Eine neutrale Person kann dieses Workbook begleiten und pro Schritt Hinweise hinterlassen."
                            )
                          : t(
                              "Wenn ihr bei schwierigen Punkten eine neutrale Begleitung möchtet, könnt ihr hier eine dritte Person einladen."
                            )}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/80 bg-white/92 p-3">
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
                        <div className="mt-3 space-y-3">
                          <ReportActionButton
                            type="button"
                            onClick={handleAdvisorInvite}
                            className="w-full justify-center"
                          >
                            {advisorInviteState.advisorLinked
                              ? t("Moderation erneut einladen")
                              : t("Moderation einladen")}
                          </ReportActionButton>
                          {advisorInviteMessage ? (
                            <p className="text-xs leading-6 text-slate-600">{advisorInviteMessage}</p>
                          ) : null}
                          {advisorInviteLink ? (
                            <details className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                              <summary className="cursor-pointer text-xs font-medium text-slate-700">
                                {t("Einladungslink anzeigen")}
                              </summary>
                              <p className="mt-2 break-all text-xs leading-6 text-slate-700">
                                {advisorInviteLink}
                              </p>
                            </details>
                          ) : null}
                        </div>
                      ) : currentUserRole === "advisor" ? (
                        <p className="mt-3 text-xs leading-6 text-slate-600">
                          {t(
                            "Du bist in diesem Workbook für die Moderation verknüpft und kannst unter jedem Schritt eigene Hinweise hinterlegen."
                          )}
                        </p>
                      ) : null}
                    </div>
                  </aside>
                ) : null}
              </div>
            )}

            <details className="mt-6 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                {t("Fokusthemen aus eurem Matching-Report anzeigen")}
              </summary>
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
              <p className="mt-5 text-sm leading-7 text-slate-700">{t(reportHeadline)}</p>
            </details>

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
                onBack={returnToWorkbook}
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
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${workbookStepStatusClassName(
                    currentStepStatus
                  )}`}
                >
                  {t(workbookStepStatusLabel(currentStepStatus))}
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

            <StepSection title="1. Kontext" className="mt-8 border-slate-200 bg-slate-50/80">
              <div className="space-y-3">
                {shortContext.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700">
                    {t(paragraph)}
                  </p>
                ))}
                <p className="text-sm leading-7 text-slate-700">{t(currentStepContent.everyday)}</p>
              </div>
            </StepSection>

            {!currentStepIsAdvisorClosing ? (
              <details
                className="mt-8 rounded-[28px] border border-slate-200/70 bg-white p-5 sm:p-6"
                open={helperOpenByStep[currentStep.id]}
                onToggle={(event) =>
                  setHelperOpenByStep((current) => ({
                    ...current,
                    [currentStep.id]: (event.currentTarget as HTMLDetailsElement).open,
                  }))
                }
              >
                <summary className="cursor-pointer text-base font-semibold text-slate-950">
                  {t("Hilfestellung anzeigen")}
                </summary>
                <div className="mt-4 space-y-4">
                  {currentStepContent.scenario ? (
                    <div className="rounded-2xl border border-[color:var(--brand-accent)]/14 bg-[color:var(--brand-accent)]/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                        {t("Beispiel")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {t(currentStepContent.scenario)}
                      </p>
                    </div>
                  ) : null}
                  {helperDetails.length > 0 ? (
                    <ul className="grid gap-3">
                      {helperDetails.map((prompt) => (
                        <li
                          key={prompt}
                          className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700"
                        >
                          {t(prompt)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {currentStepContent.riskHint ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
                        {t("Worauf ihr achten solltet")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {t(currentStepContent.riskHint)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}

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
                <StepSection title="2. Individuelle Antworten" className="mt-8 border-slate-200/70 bg-white">
                  <p className="text-sm leading-7 text-slate-700">{t(helperQuestion)}</p>
                  {isCollaborativeMode ? (
                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                      <WorkbookField
                        title={founderALabel}
                        showAvatar
                        avatarId={founderAAvatarId}
                        value={currentStepEntry.founderA}
                        onChange={(value) => updateEntry("founderA", value)}
                        placeholder={t("Was ist dir in diesem Punkt wichtig und was sollte hier konkret gelten?")}
                        readOnly={!canEditField("founderA")}
                        helperText={getFieldReadOnlyHint("founderA")}
                      />
                      <WorkbookField
                        title={founderBLabel}
                        showAvatar
                        avatarId={founderBAvatarId}
                        value={currentStepEntry.founderB}
                        onChange={(value) => updateEntry("founderB", value)}
                        placeholder={t("Was ist dir in diesem Punkt wichtig und was sollte hier konkret gelten?")}
                        readOnly={!canEditField("founderB")}
                        helperText={getFieldReadOnlyHint("founderB")}
                      />
                    </div>
                  ) : (
                    <div className="mt-6 space-y-5">
                      {viewerFounderField ? (
                        <WorkbookField
                          title={viewerFounderField === "founderA" ? founderALabel : founderBLabel}
                          showAvatar
                          avatarId={viewerFounderField === "founderA" ? founderAAvatarId : founderBAvatarId}
                          value={currentUserInputValue}
                          onChange={(value) => updateEntry(viewerFounderField, value)}
                          placeholder={t("Was ist dir in diesem Punkt wichtig und was sollte hier konkret gelten?")}
                          readOnly={!canEditField(viewerFounderField)}
                          helperText={t("Hier haeltst du zuerst deine eigene Sicht fest.")}
                        />
                      ) : null}

                      {otherFounderLabel ? (
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/75 px-4 py-4">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {t("Status der anderen Person")}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-900">{otherFounderLabel}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {otherFounderApproved
                                ? t("Zugestimmt")
                                : otherFounderHasInput
                                  ? t("Ausgefuellt")
                                  : t("Noch offen")}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => persist()}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          {t("Eigene Sicht speichern")}
                        </button>
                      </div>
                    </div>
                  )}
                </StepSection>

                <StepSection
                  title={isCollaborativeMode ? "3. Gemeinsamer Vorschlag" : "3. Vorlaeufiger Vorschlag"}
                  className="mt-8 border-[color:var(--brand-accent)]/18 bg-[linear-gradient(135deg,rgba(124,58,237,0.06),rgba(255,255,255,0.98))]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm leading-7 text-slate-700">
                        {isCollaborativeMode
                          ? t("Aus beiden Antworten entsteht hier ein erster gemeinsamer Vorschlag, den ihr direkt weiter bearbeiten koennt.")
                          : t("Auch mit nur einer Perspektive koennt ihr hier schon einen vorlaeufigen Vorschlag vorbereiten. Er bleibt spaeter gemeinsam anpassbar.")}
                      </p>
                      {currentAgreementDraft?.comparisonHint ? (
                        <p className="mt-3 text-sm leading-7 text-slate-700">
                          {t(currentAgreementDraft.comparisonHint)}
                        </p>
                      ) : null}
                    </div>
                    <ReportActionButton
                      type="button"
                      onClick={() => {
                        applyAgreementDraft();
                        focusAgreementField();
                      }}
                      className="shrink-0"
                      disabled={!currentAgreementDraft}
                    >
                      {t(isCollaborativeMode ? "Vorschlag erstellen" : "Vorlaeufigen Vorschlag erstellen")}
                    </ReportActionButton>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {currentAgreementDraft?.suggestionTitle
                        ? t(currentAgreementDraft.suggestionTitle)
                        : t("Vorschau")}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {currentAgreementDraft
                        ? t(currentAgreementDraft.draft)
                        : t(
                            isCollaborativeMode
                              ? "Sobald beide Antworten da sind, koennt ihr hier einen gemeinsamen Vorschlag erstellen."
                              : "Sobald deine Sicht vorliegt, kannst du hier einen vorlaeufigen Vorschlag erstellen."
                          )}
                    </p>
                  </div>
                </StepSection>

                <StepSection
                  title="4. Finale Absprache"
                  className="mt-8 border-[color:var(--brand-primary)]/16 bg-[linear-gradient(180deg,rgba(103,232,249,0.06),rgba(255,255,255,0.99))]"
                >
                  <p className="text-sm leading-7 text-slate-700">
                    {isCollaborativeMode
                      ? t("Hier haltet ihr eure gemeinsame Absprache fest, auf die ihr spaeter direkt zurueckgreifen koennt.")
                      : t("Hier entsteht eure vorlaeufige oder gemeinsame Absprache. Final ist sie erst, wenn beide Founder zustimmen.")}
                  </p>
                  <div className="mt-6">
                    <WorkbookField
                      title={t("Eure finale Absprache")}
                      value={currentStepEntry.agreement}
                      onChange={(value) => updateEntry("agreement", value)}
                      placeholder={t("Welche konkrete Regel, Entscheidung oder Arbeitsweise soll fuer diesen Schritt kuenftig gelten?")}
                      highlight
                      focusSignal={agreementFieldFocusSignal}
                      readOnly={!canEditField("agreement")}
                      helperText={
                        canEditField("agreement")
                          ? t("Das ist das gemeinsame Ergebnis dieses Schritts.")
                          : getFieldReadOnlyHint("agreement")
                      }
                    />
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/88 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t("Status dieser Absprache")}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${workbookStepStatusClassName(
                          currentStepStatus
                        )}`}
                      >
                        {t(workbookStepStatusLabel(currentStepStatus))}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ApprovalStatusCard
                        label={founderALabel}
                        approved={currentStepEntry.founderAApproved}
                      />
                      <ApprovalStatusCard
                        label={founderBLabel}
                        approved={currentStepEntry.founderBApproved}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {viewerFounderField ? (
                        <button
                          type="button"
                          onClick={() => updateApproval(!currentUserApproved)}
                          disabled={!currentStepHasAgreement || !hasBothPerspectives}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            !currentStepHasAgreement || !hasBothPerspectives
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : currentUserApproved
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {currentUserApproved ? t("Zustimmung zuruecknehmen") : t("Finale Absprache bestaetigen")}
                        </button>
                      ) : null}
                      <p className="text-xs leading-6 text-slate-500">
                        {!hasBothPerspectives
                          ? t("Finalisieren koennt ihr erst, wenn beide Perspektiven vorliegen.")
                          : currentStepIsApprovedByBoth
                            ? t("Beide Founder haben zugestimmt. Dieser Schritt ist finalisiert.")
                            : t("Sobald beide Founder bestaetigen, wird dieser Schritt finalisiert.")}
                      </p>
                    </div>
                  </div>
                </StepSection>

                {showAdvisorNotesSection ? (
                  <details className="mt-8 rounded-[28px] border border-[color:var(--brand-accent)]/14 bg-[color:var(--brand-accent)]/5 p-5 sm:p-6">
                    <summary className="cursor-pointer text-base font-semibold text-slate-950">
                      {t("Hinweis von aussen anzeigen")}
                    </summary>
                    <div className="mt-4">
                      <p className="text-sm leading-7 text-slate-700">
                        {t(
                          "Hier ist Platz fuer eine neutrale Beobachtung oder Rueckfrage. Eure gemeinsame Absprache bleibt davon getrennt."
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
                    </div>
                  </details>
                ) : null}
              </>
            )}

            <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {t("Naechster Schritt")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {currentStepStatus === "finalized"
                      ? t("Guter Fortschritt. Dieser Schritt ist finalisiert.")
                      : currentStepStatus === "awaiting_approval"
                        ? t("Die Absprache steht. Es fehlt nur noch die Zustimmung beider Founder.")
                        : currentStepStatus === "draft_ready"
                          ? t("Es gibt bereits einen Entwurf. Macht daraus jetzt eine klare gemeinsame Absprache.")
                          : t("Sammelt zuerst eure Perspektiven und formuliert dann eine erste Absprache.")}
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
                : t("Beim Weitergehen bleibt euer aktueller Stand erhalten und ihr landet direkt im naechsten Schritt.")}
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
  avatarId = null,
  showAvatar = false,
  value,
  onChange,
  placeholder,
  highlight = false,
  readOnly = false,
  helperText = null,
  focusSignal = 0,
}: {
  title: string;
  avatarId?: string | null;
  showAvatar?: boolean;
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
        <div className="flex min-w-0 items-center gap-3">
          {showAvatar ? (
            <ProfileAvatar
              displayName={title}
              avatarId={avatarId}
              className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200/80 object-cover shadow-[0_8px_16px_rgba(15,23,42,0.06)]"
              fallbackClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.12),rgba(255,255,255,0.94)_48%,rgba(124,58,237,0.06))] text-sm font-semibold text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.05)]"
            />
          ) : null}

          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-slate-900">{t(title)}</p>
            {readOnly ? (
              <span className="text-xs text-slate-400">{t("Nur lesbar")}</span>
            ) : null}
          </div>
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

function ApprovalStatusCard({
  label,
  approved,
}: {
  label: string;
  approved: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
        {approved ? t("Zugestimmt") : t("Noch offen")}
      </p>
    </div>
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
  onBack,
}: {
  items: Array<{
    id: FounderAlignmentWorkbookStepId;
    title: string;
    agreement: string;
    advisorNotes: string;
    advisorClosing: FounderAlignmentWorkbookAdvisorClosing | null;
    advisorFollowUp: FounderAlignmentWorkbookAdvisorFollowUp | null;
    founderReaction: { status: FounderAlignmentWorkbookFounderReactionStatus; comment: string } | null;
  }>;
  onBack: () => void;
}) {
  return (
    <>
      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/75 p-6 print:mt-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Zusammenfassung</p>
        <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-700">
          {t(
            "Diese Zusammenfassung buendelt eure wichtigsten Vereinbarungen aus dem Workbook. Sie zeigt, was ihr bereits klar fuer eure Zusammenarbeit festgehalten habt."
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
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ReportActionButton variant="utility" onClick={onBack}>
          {t("Zurueck zum letzten Schritt")}
        </ReportActionButton>
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

function buildWorkbookPatches(
  previousPayload: FounderAlignmentWorkbookPayload,
  nextPayload: FounderAlignmentWorkbookPayload
): FounderAlignmentWorkbookPatch[] {
  const previous = sanitizeFounderAlignmentWorkbookPayload(previousPayload);
  const next = sanitizeFounderAlignmentWorkbookPayload(nextPayload);
  const patches: FounderAlignmentWorkbookPatch[] = [];

  if (previous.currentStepId !== next.currentStepId) {
    patches.push({
      scope: "root",
      field: "currentStepId",
      value: next.currentStepId,
    });
  }

  if (previous.advisorFollowUp !== next.advisorFollowUp) {
    patches.push({
      scope: "root",
      field: "advisorFollowUp",
      value: next.advisorFollowUp,
    });
  }

  for (const field of ["observations", "questions", "nextSteps"] as const) {
    if (previous.advisorClosing[field] !== next.advisorClosing[field]) {
      patches.push({
        scope: "advisorClosing",
        field,
        value: next.advisorClosing[field],
      });
    }
  }

  if (previous.founderReaction.status !== next.founderReaction.status) {
    patches.push({
      scope: "founderReaction",
      field: "status",
      value: next.founderReaction.status,
    });
  }

  if (previous.founderReaction.comment !== next.founderReaction.comment) {
    patches.push({
      scope: "founderReaction",
      field: "comment",
      value: next.founderReaction.comment,
    });
  }

  for (const stepId of Object.keys(next.steps) as FounderAlignmentWorkbookStepId[]) {
    const previousStep = previous.steps[stepId];
    const nextStep = next.steps[stepId];

    if (previousStep.mode !== nextStep.mode) {
      patches.push({ scope: "step", stepId, field: "mode", value: nextStep.mode });
    }
    if (previousStep.founderA !== nextStep.founderA) {
      patches.push({ scope: "step", stepId, field: "founderA", value: nextStep.founderA });
    }
    if (previousStep.founderB !== nextStep.founderB) {
      patches.push({ scope: "step", stepId, field: "founderB", value: nextStep.founderB });
    }
    if (previousStep.agreement !== nextStep.agreement) {
      patches.push({ scope: "step", stepId, field: "agreement", value: nextStep.agreement });
    }
    if (previousStep.founderAApproved !== nextStep.founderAApproved) {
      patches.push({
        scope: "step",
        stepId,
        field: "founderAApproved",
        value: nextStep.founderAApproved,
      });
    }
    if (previousStep.founderBApproved !== nextStep.founderBApproved) {
      patches.push({
        scope: "step",
        stepId,
        field: "founderBApproved",
        value: nextStep.founderBApproved,
      });
    }
    if (previousStep.advisorNotes !== nextStep.advisorNotes) {
      patches.push({
        scope: "step",
        stepId,
        field: "advisorNotes",
        value: nextStep.advisorNotes,
      });
    }
  }

  return patches;
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
            : "Beide Antworten klingen aehnlich und lassen sich gut in eine gemeinsame Absprache uebersetzen."
          : state === "different"
            ? differingThemes.length > 0
              ? `Der Unterschied liegt vor allem bei ${joinWithUnd(
                  differingThemes.slice(0, 2)
                )}. Genau dafuer braucht ihr jetzt eine klare Absprache.`
              : "Ihr setzt bei derselben Situation unterschiedliche Schwerpunkte. Genau dafuer braucht ihr jetzt eine klare Absprache."
            : "Aus euren Antworten ist noch nicht klar genug, wer was entscheidet oder was im Zweifel gilt."
        : null,
    suggestionTitle:
      sourceMode === "joint"
        ? "Vorschlag fuer eure gemeinsame Absprache"
        : "Moegliche Absprache auf Basis deiner Antwort",
    suggestionIntro:
      sourceMode === "joint"
        ? "So koennte eure Absprache lauten:"
        : "So koennte eure erste Absprache lauten:",
  };
}

function normalizeAgreementSource(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function deriveWorkbookStepStatus(
  entry: FounderAlignmentWorkbookPayload["steps"][FounderAlignmentWorkbookStepId]
): FounderAlignmentWorkbookStepStatus {
  const hasBothInputs = entry.founderA.trim().length > 0 && entry.founderB.trim().length > 0;
  const hasAgreement = entry.agreement.trim().length > 0;
  const bothApproved = entry.founderAApproved && entry.founderBApproved;

  if (hasAgreement && bothApproved) {
    return "finalized";
  }

  if (hasAgreement && hasBothInputs) {
    return "awaiting_approval";
  }

  if (hasAgreement) {
    return "draft_ready";
  }

  return "collecting_inputs";
}

function workbookStepStatusLabel(status: FounderAlignmentWorkbookStepStatus) {
  switch (status) {
    case "draft_ready":
      return "Entwurf bereit";
    case "awaiting_approval":
      return "Wartet auf Zustimmung";
    case "finalized":
      return "Finalisiert";
    default:
      return "Sammelt Eingaben";
  }
}

function workbookStepStatusClassName(status: FounderAlignmentWorkbookStepStatus) {
  switch (status) {
    case "draft_ready":
      return "bg-amber-100 text-amber-700";
    case "awaiting_approval":
      return "bg-violet-100 text-violet-700";
    case "finalized":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-200 text-slate-600";
  }
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
