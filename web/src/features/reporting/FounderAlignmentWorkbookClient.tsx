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
  commonGround: string[];
  differingPerspectives: string[];
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
  { value: "open", label: "Noch offen" },
  { value: "partial", label: t("Teilweise geklaert") },
  { value: "clear", label: "Klar vereinbart" },
];

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
  { value: "none", label: t("kein Follow-up gesetzt") },
  { value: "four_weeks", label: t("Follow-up in 4 Wochen") },
  { value: "three_months", label: t("Follow-up in 3 Monaten") },
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
  const [isPending, startTransition] = useTransition();
  const [editingMode, setEditingMode] = useState<WorkbookEditingMode>(
    currentUserRole === "founderA" || currentUserRole === "founderB" ? "personal" : "joint"
  );
  const [agreementDrafts, setAgreementDrafts] = useState<
    Record<FounderAlignmentWorkbookStepId, AgreementDraftResult | null>
  >(() =>
    Object.fromEntries(
      FOUNDER_ALIGNMENT_WORKBOOK_STEPS.map((step) => [step.id, null])
    ) as Record<FounderAlignmentWorkbookStepId, AgreementDraftResult | null>
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
  const advisorLabel = workbook.advisorName?.trim() || advisorInviteState.advisorName?.trim() || "Advisor";
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
  const currentStepIsAdvisorClosing = currentStep.id === "advisor_closing";
  const isFocusedStep = highlights.prioritizedStepIds.includes(currentStep.id);
  const currentAgreementDraft = agreementDrafts[currentStep.id];
  const hasBothPerspectives =
    workbook.steps[currentStep.id].founderA.trim().length > 0 &&
    workbook.steps[currentStep.id].founderB.trim().length > 0;
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
        return { label: t("Ungespeicherte Aenderungen"), tone: "warning" as const };
      case "saving":
        return { label: "Speichert...", tone: "info" as const };
      case "autosaved":
        return { label: t("Automatisch gespeichert"), tone: "success" as const };
      case "saved":
        return { label: t("Gespeichert"), tone: "success" as const };
      case "error":
        return { label: t("Speichern fehlgeschlagen"), tone: "error" as const };
      default:
        return {
          label: persisted ? t("Bestehende Session geladen") : t("Bereit zum Speichern"),
          tone: "neutral" as const,
        };
    }
  }, [canSave, persisted, saveState.kind, source]);

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
      message: canSave ? t("Ungespeicherte Aenderungen") : current.message,
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
      message: canSave ? t("Ungespeicherte Aenderungen") : current.message,
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

  function updateAdvisorClosing(field: AdvisorClosingField, value: string) {
    if (!canEditAdvisorClosing()) {
      return;
    }

    setSaveState((current) => ({
      ...current,
      kind: canSave ? "dirty" : current.kind,
      message: canSave ? t("Ungespeicherte Aenderungen") : current.message,
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
      message: canSave ? t("Ungespeicherte Aenderungen") : current.message,
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
      message: mode === "autosave" ? t("Speichert automatisch...") : "Speichert...",
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
          ? t("Automatisch gespeichert")
          : t("Session gespeichert"),
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
  const topActionLabel =
    !canSave
      ? null
      : persisted || saveState.kind === "saved" || saveState.kind === "autosaved"
        ? "Arbeitsdokument sichern"
        : t("Arbeitsdokument starten");

  function fieldHeading(field: WorkbookEditableField) {
    if (field === "advisorNotes") {
      return t("Hinweis des Advisors");
    }
    if (field === "agreement") {
      return editingMode === "joint"
        ? "Gemeinsame Vereinbarung"
        : "Gemeinsame Vereinbarung";
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

  function createAgreementDraft() {
    if (!hasBothPerspectives) return;

    const draft = buildAgreementDraft({
      stepId: currentStep.id,
      founderAResponse: workbook.steps[currentStep.id].founderA,
      founderBResponse: workbook.steps[currentStep.id].founderB,
    });

    setAgreementDrafts((current) => ({
      ...current,
      [currentStep.id]: draft,
    }));
  }

  function applyAgreementDraft() {
    if (!currentAgreementDraft) return;
    updateEntry("agreement", currentAgreementDraft.draft);
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
          ? t("Die Advisor-Einladung ist fuer diese Person nicht verfuegbar.")
          : t("Die Advisor-Einladung konnte gerade nicht vorbereitet werden.")
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
          ? t("Deine Zustimmung ist erfasst. Sobald Founder B ebenfalls zustimmt, kann der Advisor-Link erzeugt werden.")
          : t("Deine Zustimmung ist erfasst. Sobald Founder A ebenfalls zustimmt, kann der Advisor-Link erzeugt werden.")
      );
      return;
    }

    if (result.status === "advisor_linked") {
      setAdvisorInviteLink(null);
      setAdvisorInviteMessage(
        t(`Advisor verbunden: ${result.advisorName ?? "Advisor"}. Kommentare koennen jetzt direkt im Workbook hinterlegt werden.`)
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
          t("Der Advisor-Link wurde erstellt und direkt in die Zwischenablage kopiert.")
        );
      } catch {
        setAdvisorInviteMessage(
          t("Der Advisor-Link wurde erstellt. Du kannst ihn jetzt kopieren und weitergeben.")
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
                    ? "Founder Alignment Workbook"
                    : "Founder Alignment Summary"}
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-950">
                  {showFullExportView
                    ? "Founder Alignment Workbook"
                    : "Founder Alignment Summary"}
                </h1>
                <p className="mt-3 text-base leading-7 text-slate-700">
                  {founderALabel} x {founderBLabel}
                </p>
                <p className="mt-4 max-w-3xl text-[15px] leading-8 text-slate-700">
                  {showFullExportView
                    ? t("Dieses Dokument enthaelt die vollstaendigen Antworten und Vereinbarungen aus eurer Founder Alignment Session.")
                    : t("Zusammenfassung eurer wichtigsten Vereinbarungen aus der Alignment Session.")}
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
          <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Founder Alignment Session
              </p>
              <div className="mt-4 inline-flex rounded-full border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                {teamContextLabel(teamContext)}
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">
                {t("Workbook fuer eure gemeinsame Session")}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-700">
                {founderALabel} x {founderBLabel}
              </p>
              <p className="mt-4 text-[15px] leading-8 text-slate-700">
                {t(workbookContextIntro(teamContext))}
              </p>
            </div>

            <div className="flex min-w-[240px] flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 lg:items-end">
              <div className="text-sm text-slate-600">Dauer: 60-90 Minuten</div>
              {topActionLabel ? (
                <ReportActionButton
                  onClick={() => persist()}
                  className="w-full lg:w-auto"
                >
                  {isPending ? t("Sichert...") : t(topActionLabel)}
                </ReportActionButton>
              ) : (
                <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  {t("Vorschau ohne Speichern")}
                </div>
              )}
              <div className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 lg:max-w-xs">
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
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {saveState.message ??
                    (persisted
                      ? t("Bestehende Session geladen")
                      : source === "mock"
                        ? t("Vorschau ohne Speichern")
                        : t("Noch keine gespeicherte Session"))}
                  {formattedUpdatedAt ? ` · zuletzt ${formattedUpdatedAt}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)]">
            <div className="rounded-3xl border border-[color:var(--brand-primary)]/20 bg-[linear-gradient(135deg,rgba(103,232,249,0.12),rgba(255,255,255,0.92))] p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("Arbeitsdokument")}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t(
                  "Hier haltet ihr fest, wie ihr als Gruenderteam konkret zusammenarbeiten wollt: welche Regeln gelten, wie ihr Entscheidungen trefft und woran ihr euren Alltag kuenftig ausrichtet."
                )}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {t(
                  "Dieses Arbeitsdokument koennt ihr auch als ausdruckbare Version herunterladen und gemeinsam offline bearbeiten – zum Beispiel in einem persoenlichen Treffen, Workshop oder Mentoring-Gespraech."
                )}
              </p>
              <div className="mt-5">
                <ReportActionButton
                  href={printWorksheetHref}
                  className="w-full sm:w-auto"
                >
                  {t("Arbeitsdokument als PDF herunterladen")}
                </ReportActionButton>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/92 p-6">
              {currentUserRole === "advisor" ? (
                <>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    {t("Advisor-Modus")}
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
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("Bearbeitungsmodus")}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {t(
                      "Waehlt bei Bedarf, ob jede Person zuerst die eigene Sicht festhaelt oder ob ihr das Arbeitsdokument direkt gemeinsam ausfuellt."
                    )}
                  </p>
                  <div className="mt-5 grid gap-3">
                    <ModeCard
                      title={t("Ich fuelle meinen Teil aus")}
                      text={t("Jede Person bearbeitet standardmaessig den eigenen Bereich. Die andere Perspektive bleibt sichtbar.")}
                      active={editingMode === "personal"}
                      onClick={() => setEditingMode("personal")}
                      disabled={currentUserRole === "unknown"}
                    />
                    <ModeCard
                      title={t("Wir bearbeiten das gemeinsam")}
                      text={t("Beide Perspektiven und die gemeinsame Vereinbarung sind direkt editierbar.")}
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
                      {t("Aktiver Modus")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {editingMode === "joint"
                        ? t("Gemeinsame Bearbeitung ist aktiv.")
                        : t("Persoenliche Bearbeitung ist aktiv.")}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {editingMode === "joint"
                        ? t("Beide Perspektiven und die Vereinbarung koennen jetzt direkt im Schritt bearbeitet werden.")
                        : t("Aktiv ist vor allem dein eigener Bereich. Die andere Perspektive bleibt sichtbar, aber bewusst zurueckgenommen.")}
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
                    {t("Advisor / Moderator")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">
                    {advisorInviteState.advisorLinked
                      ? t("Advisor-Zugang ist aktiv")
                      : t("Optional eine dritte Perspektive einbinden")}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {advisorInviteState.advisorLinked
                      ? t(
                          "Der Advisor sieht alle Inhalte im Workbook und kann pro Schritt Hinweise oder Fragen hinterlassen. Founder-Perspektiven und Vereinbarungen bleiben dabei unveraendert in eurer Verantwortung."
                        )
                      : t(
                          "Wenn ihr euch bei schwierigen Punkten eine neutrale Begleitung wuenscht, koennt ihr eine dritte Person als Advisor oder Moderator einladen. Der Zugang wird erst aktiv, wenn beide Founder zustimmen."
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
                          ? t("Advisor erneut verlinken")
                          : t("Advisor einladen")}
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
                        "Du bist in diesem Workbook als Advisor verknuepft und kannst unter jedem Schritt eigene Hinweise hinterlegen."
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-8 rounded-3xl border border-[color:var(--brand-accent)]/16 bg-[linear-gradient(135deg,rgba(124,58,237,0.08),rgba(255,255,255,0.95))] p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("Fokus-Themen aus eurem Report")}</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{t(reportHeadline)}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {t(
                    "Diese Themen verdienen in eurem Arbeitsdokument besondere Aufmerksamkeit, weil sie im Report als tragende Grundlage, ergaenzende Dynamik oder als wichtiges Klaerungsthema sichtbar wurden."
                  )}
                </p>
              </div>
              <div className="text-sm leading-6 text-slate-600">
                {highlights.prioritizedStepIds.length > 0
                  ? t("Einzelne Schritte sind bereits aus dem Report besonders hervorgehoben.")
                  : t("Arbeitet die Session in Ruhe nacheinander durch und macht Unterschiede konkret.")}
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
            className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Sessionverlauf</p>
              <span className="text-sm text-slate-600">
                {currentIndex + 1}/{visibleSteps.length}
              </span>
            </div>
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
                return (
                  <li
                    key={step.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      isActive
                        ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-slate-900"
                        : "border-slate-200 bg-slate-50/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                          Schritt {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium">{step.title}</p>
                      </div>
                      {isPrioritized ? (
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            isActive
                              ? "bg-white/15 text-white"
                              : "bg-[color:var(--brand-accent)]/10 text-[color:var(--brand-accent)]"
                          }`}
                        >
                          Fokus
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section
            ref={currentStepRef}
            className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Schritt {currentIndex + 1} von {visibleSteps.length} -{" "}
              {currentStep.title}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">{currentStep.title}</h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-700">
              {currentStep.subtitle}
            </p>
            {isFocusedStep ? (
              <div className="mt-6 rounded-2xl border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-accent)]">
                  Fokus aus eurem Report
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {t("Dieser Bereich wurde im Report als besonders relevant fuer eure Zusammenarbeit identifiziert.")}
                </p>
              </div>
            ) : null}

            <StepSection
              title="Kontext"
              className="mt-8 border-slate-200 bg-slate-50/80"
            >
              <p className="text-sm leading-7 text-slate-700">
                {t("Warum dieses Thema fuer Gruenderteams wichtig ist.")}
              </p>
              <div className="mt-4 space-y-3">
                {currentStepContent.context.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-700">
                    {t(paragraph)}
                  </p>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-[color:var(--brand-accent)]/12 bg-[color:var(--brand-accent)]/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                  So zeigt sich das im Alltag
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">{t(currentStepContent.everyday)}</p>
              </div>
            </StepSection>

            {currentStepIsAdvisorClosing ? (
              <StepSection
                title="Abschlussimpulse des Advisors"
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
                    {t("Leichter Follow-up Reminder")}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {t(
                      "Markiere hier, ob fuer dieses Team ein leichter Follow-up in 4 Wochen, in 3 Monaten oder aktuell gar nicht sinnvoll ist."
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
                    {t("Founder-Reaktion")}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {t(
                      "Hier koennen die Founder knapp markieren, ob die Advisor-Impulse bereits aufgenommen sind, noch offen bleiben oder aktiv weitergeklaert werden."
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
                      placeholder={t("Was habt ihr aus den Advisor-Impulsen bereits aufgenommen oder was wollt ihr noch klaeren?")}
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
                <StepSection title="Eure Perspektiven" className="mt-8 border-slate-200 bg-slate-50/70">
                  <p className="text-sm leading-7 text-slate-700">
                    {t(
                      "Haltet hier zunaechst eure individuelle Sicht fest. Diese Felder beschreiben noch keine Einigung, sondern machen sichtbar, welche Prioritaeten, Erwartungen oder Bedenken jede Person in dieses Thema einbringt."
                    )}
                  </p>

                  <div className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-6">
                    <p className="text-sm font-semibold text-slate-900">{t("Fragen fuer eure Reflexion")}</p>
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

                  <div className="mt-6 grid gap-6 xl:grid-cols-2">
                    <WorkbookField
                      title={
                        editingMode === "joint"
                          ? `Perspektive ${founderALabel}`
                          : fieldHeading("founderA")
                      }
                      value={workbook.steps[currentStep.id].founderA}
                      onChange={(value) => updateEntry("founderA", value)}
                      placeholder={t("Welche Sicht, Sorge oder Prioritaet bringst du in diesen Schritt ein?")}
                      readOnly={!canEditField("founderA")}
                      helperText={getFieldReadOnlyHint("founderA")}
                    />
                    <WorkbookField
                      title={
                        editingMode === "joint"
                          ? `Perspektive ${founderBLabel}`
                          : fieldHeading("founderB")
                      }
                      value={workbook.steps[currentStep.id].founderB}
                      onChange={(value) => updateEntry("founderB", value)}
                      placeholder={t("Welche Sicht, Sorge oder Prioritaet bringst du in diesen Schritt ein?")}
                      readOnly={!canEditField("founderB")}
                      helperText={getFieldReadOnlyHint("founderB")}
                    />
                  </div>
                </StepSection>

                <StepSection
                  title="Gemeinsame Vereinbarung"
                  className="mt-8 border-[color:var(--brand-primary)]/16 bg-[color:var(--brand-primary)]/5"
                >
                  <p className="text-sm leading-7 text-slate-700">
                    {t(
                      "Haltet hier fest, welche konkrete Entscheidung, Regel oder feste Arbeitsweise fuer euch kuenftig gelten soll. Der Fokus liegt nicht auf einer Zusammenfassung, sondern auf einer klaren Orientierung fuer euren Alltag als Gruenderteam."
                    )}
                  </p>

                  <div className="mt-5 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <ReportActionButton
                        type="button"
                        variant="utility"
                        onClick={createAgreementDraft}
                        className={!hasBothPerspectives ? "pointer-events-none opacity-50" : ""}
                      >
                        {currentAgreementDraft
                          ? t("Vorschlag aus euren Antworten aktualisieren")
                          : t("Vorschlag aus euren Antworten erstellen")}
                      </ReportActionButton>
                      {!hasBothPerspectives ? (
                        <p className="text-xs leading-6 text-slate-500">
                          {t("Der Vorschlag ist verfuegbar, sobald beide Perspektiven ausgefuellt sind.")}
                        </p>
                      ) : null}
                    </div>

                    {currentAgreementDraft ? (
                      <div className="rounded-3xl border border-slate-200 bg-white/90 p-5">
                        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {t("Gemeinsame Grundlage")}
                            </p>
                            <ul className="mt-3 space-y-2">
                              {currentAgreementDraft.commonGround.map((item) => (
                                <li key={item} className="text-sm leading-6 text-slate-700">
                                  • {t(item)}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {t("Unterschiedliche Perspektiven")}
                            </p>
                            <ul className="mt-3 space-y-2">
                              {currentAgreementDraft.differingPerspectives.map((item) => (
                                <li key={item} className="text-sm leading-6 text-slate-700">
                                  • {t(item)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {t("Vorschlag fuer eure gemeinsame Vereinbarung")}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          {t(
                            "Dieser Vorschlag basiert auf euren beiden Perspektiven und ist als gemeinsamer Arbeitsentwurf gedacht. Ihr koennt ihn uebernehmen, anpassen oder vollstaendig neu formulieren."
                          )}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-slate-700">
                          {t(currentAgreementDraft.draft)}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <ReportActionButton type="button" onClick={applyAgreementDraft}>
                            {t("Vorschlag uebernehmen")}
                          </ReportActionButton>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <WorkbookField
                      title=""
                      value={workbook.steps[currentStep.id].agreement}
                      onChange={(value) => updateEntry("agreement", value)}
                      placeholder={t("Welche konkrete Regel, Entscheidung oder Arbeitsweise soll fuer diesen Schritt kuenftig gelten?")}
                      highlight
                      readOnly={!canEditField("agreement")}
                      helperText={getFieldReadOnlyHint("agreement")}
                    />
                  </div>
                </StepSection>

                {showAdvisorNotesSection ? (
                  <StepSection
                    title="Kommentar eines Advisors / Moderators"
                    className="mt-8 border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/6"
                  >
                    <p className="text-sm leading-7 text-slate-700">
                      {t(
                        "Dieser Bereich ist fuer Hinweise, Nachfragen oder Beobachtungen einer dritten Person gedacht. Die Notiz unterstuetzt eure Reflexion, ist aber bewusst getrennt von eurer gemeinsamen Vereinbarung."
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
                  <StepSection title="Gemeinsamer Status" className="mt-8 border-slate-200 bg-white">
                    <p className="text-sm leading-7 text-slate-700">
                      Markiert hier gemeinsam, wie weit ihr bei diesem Thema aktuell seid.
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
                      {t("Diese Einordnung ist optional und bezieht sich auf euren gemeinsamen Stand nach Gespraech und Vereinbarung.")}
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
                      {t("Optionalen Status festhalten")}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <ReportActionButton
                variant="utility"
                onClick={() => persist(previousStepId)}
                className={currentIndex === 0 ? "pointer-events-none opacity-50" : ""}
              >
                {t("Zurueck")}
              </ReportActionButton>

              <div className="flex flex-wrap gap-3">
                <ReportActionButton variant="utility" onClick={() => persist()}>
                  {isPending ? t("Sichert...") : t("Zwischenspeichern")}
                </ReportActionButton>
                <ReportActionButton
                  onClick={() =>
                    currentIndex === visibleSteps.length - 1
                      ? openSummaryView()
                      : persist(nextStepId)
                  }
                >
                  {currentIndex === visibleSteps.length - 1
                    ? t("Session abschliessen und Zusammenfassung anzeigen")
                    : t("Weiter")}
                </ReportActionButton>
              </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              {currentIndex === visibleSteps.length - 1
                ? t("Session abschliessen und Zusammenfassung anzeigen sichert euren aktuellen Stand und oeffnet danach die Abschluss-Zusammenfassung.")
                : t("Weiter speichert euren aktuellen Stand und springt direkt zum naechsten Schritt. Zwischenspeichern sichert nur den aktuellen Stand.")}
            </p>
          </section>
        </div>
        )}
      </div>
    </div>
  );
}

function HighlightCard({ title, text }: { title: string; text: string | null }) {
  return (
    <div className="rounded-2xl border border-white/75 bg-white/80 p-4">
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
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  highlight?: boolean;
  readOnly?: boolean;
  helperText?: string | null;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function scheduleInactivityTimeout() {
    clearTimeoutIfSet(inactivityTimeoutRef);
    inactivityTimeoutRef.current = setTimeout(() => {
      shouldKeepListeningRef.current = false;
      clearTimeoutIfSet(restartTimeoutRef);
      setSpeechActive(false);
      setDictationStatus("ended");
      setSpeechMessage(t("Aufnahme beendet - du kannst jederzeit weiter diktieren."));
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
    finishDictationSession("ended", t("Aufnahme beendet - du kannst jederzeit weiter diktieren."));
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
      className={`rounded-3xl border p-5 transition-all duration-300 ease-out ${
        highlight
          ? readOnly
            ? "border-[color:var(--brand-primary)]/12 bg-[color:var(--brand-primary)]/4"
            : "border-[color:var(--brand-primary)]/26 bg-[color:var(--brand-primary)]/8 shadow-[0_12px_32px_rgba(103,232,249,0.10)]"
          : readOnly
            ? "border-slate-200 bg-slate-50/70"
            : "border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
      } ${readOnly ? "cursor-not-allowed" : "hover:-translate-y-0.5"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t(title)}</p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                readOnly
                  ? "bg-slate-200/80 text-slate-500"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {readOnly ? t("Nur lesbar") : t("Editierbar")}
            </span>
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
          title={t("Sprich einfach frei - der Text wird automatisch eingefuegt.")}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all duration-300 ${
            speechActive && dictationStatus === "paused"
              ? "border-amber-200 bg-amber-50 text-amber-700 shadow-[0_10px_24px_rgba(245,158,11,0.10)]"
              : speechActive
              ? "border-red-200 bg-red-50 text-red-700 shadow-[0_10px_24px_rgba(239,68,68,0.12)]"
              : dictationDisabled
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
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
          {t("Diktieren ist in diesem Browser nicht verfuegbar. Die normale Texteingabe bleibt erhalten.")}
        </p>
      ) : null}

      {dictationStatus === "listening" ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {t("Aufnahme laeuft - sprich einfach frei, der Text wird automatisch eingefuegt.")}
        </p>
      ) : null}

      {dictationStatus === "paused" ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {t("Kurze Pause erkannt - sprich einfach weiter.")}
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t(placeholder)}
        rows={10}
        readOnly={readOnly}
        className={`mt-4 min-h-[220px] w-full rounded-2xl border px-4 py-3 text-sm leading-7 outline-none transition-all duration-300 ease-out ${
          readOnly
            ? "cursor-not-allowed border-slate-200 bg-slate-100/95 text-slate-600"
            : highlight
              ? "border-[color:var(--brand-primary)]/22 bg-white text-slate-700 shadow-[0_10px_24px_rgba(103,232,249,0.06)] focus:border-[color:var(--brand-primary)]/40 focus:ring-2 focus:ring-[color:var(--brand-primary)]/20"
              : "border-slate-200 bg-white text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-[color:var(--brand-primary)]/20"
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
    <section className={`rounded-3xl border p-6 ${className}`}>
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
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Abschluss</p>
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
                        {t("Founder-Reaktion")}
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
                      title={t("Follow-up")}
                      text={advisorFollowUpLabel(item.advisorFollowUp)}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {t(item.agreement || "Zu diesem Schritt liegt aktuell noch keine gemeinsame Vereinbarung vor.")}
                  </p>
                )}
                {item.advisorNotes ? (
                  <div className="mt-4 rounded-2xl border border-[color:var(--brand-accent)]/14 bg-[color:var(--brand-accent)]/6 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                      {t("Hinweis eines Advisors")}
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
                    : t("Zu diesem Thema gibt es bereits eine Richtung, aber noch keine abschliessend klare Vereinbarung.")}
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
            Zusammenfassung exportieren
          </ReportActionButton>
          <ReportActionButton variant="secondary" onClick={onShowFullExport}>
            {t("Vollstaendige Session exportieren")}
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
      return t("Follow-up in 4 Wochen");
    case "three_months":
      return t("Follow-up in 3 Monaten");
    default:
      return t("Kein Follow-up gesetzt.");
  }
}

function SummaryStatusBadge({ status }: { status: StepClarity }) {
  const statusMeta: Record<StepClarity, { label: string; className: string }> = {
    open: {
      label: "Noch offen",
      className: "border-slate-200 bg-slate-100 text-slate-700",
    },
    partial: {
      label: t("Teilweise geklaert"),
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    clear: {
      label: t("Klar vereinbart"),
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
                  title="Founder-Reaktion"
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
                  title="Follow-up"
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
                    title="Gemeinsame Vereinbarung"
                    text={item.agreement}
                    highlight
                  />
                </div>

                {item.advisorNotes ? (
                  <div className="mt-5">
                    <ExportResponseCard
                      title="Hinweis eines Advisors"
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
          {t("Zurueck zur Summary")}
        </ReportActionButton>

        <ReportActionButton onClick={onExport}>{t("Vollstaendige Session exportieren")}</ReportActionButton>
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
}: {
  stepId: FounderAlignmentWorkbookStepId;
  founderAResponse: string;
  founderBResponse: string;
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

  const commonFoundation =
    sharedThemes.length > 0 ? sharedThemes : meta.fallbackSharedThemes.slice(0, 2);

  const foundationSentence = `Als gemeinsame Grundlage zaehlen fuer euch ${joinWithUnd(
    commonFoundation
  )}.`;

  const differenceSentence =
    differingThemes.length > 0
      ? `Unterschiede liegen vor allem bei ${joinWithUnd(
          differingThemes.slice(0, 2)
        )}; diese Punkte klaert ihr frueh, bevor sie im Alltag mitlaufen.`
      : `Wenn sich Nuancen in euren Sichtweisen zeigen, sprecht ihr sie frueh an, bevor daraus unterschiedliche Erwartungen werden.`;

  const integratedPerspectiveSentence = buildIntegratedPerspectiveSentence(
    commonFoundation,
    differingThemes,
    commonFoundation[0] ?? meta.fallbackSharedThemes[0]
  );

  return {
    draft: buildStepSpecificAgreementDraft({
      stepId,
      commonFoundation,
      differingThemes,
      fallbackSharedThemes: meta.fallbackSharedThemes,
      differenceFocus: meta.differenceFocus,
      integratedPerspectiveSentence,
      ruleFocus: meta.ruleFocus,
      foundationSentence,
      differenceSentence,
    }),
    commonGround: buildCommonGroundPoints(commonFoundation, meta.fallbackSharedThemes),
    differingPerspectives: buildDifferingPerspectivePoints(
      differingThemes,
      meta.differenceFocus
    ),
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

function buildIntegratedPerspectiveSentence(
  commonFoundation: string[],
  differingThemes: string[],
  fallbackTheme: string
) {
  const commonFocus = commonFoundation[0] ?? fallbackTheme;
  const differingFocus = differingThemes[0] ?? null;

  if (differingFocus) {
    return `Fuer den Alltag heisst das, ${commonFocus} als gemeinsame Leitlinie zu halten und Unterschiede bei ${differingFocus} bewusst zu moderieren.`;
  }

  return `Fuer den Alltag heisst das, ${commonFocus} in eine klare und alltagstaugliche Orientierung zu uebersetzen.`;
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
  commonFoundation,
  differingThemes,
  fallbackSharedThemes,
  differenceFocus,
  integratedPerspectiveSentence,
  ruleFocus,
  foundationSentence,
  differenceSentence,
}: {
  stepId: FounderAlignmentWorkbookStepId;
  commonFoundation: string[];
  differingThemes: string[];
  fallbackSharedThemes: string[];
  differenceFocus: string;
  integratedPerspectiveSentence: string;
  ruleFocus: string;
  foundationSentence: string;
  differenceSentence: string;
}) {
  const sharedOrientation = describeThemeSet(commonFoundation, fallbackSharedThemes);
  const differingOrientation = describeDifferenceSet(differingThemes, differenceFocus);

  switch (stepId) {
    case "vision_direction":
      return [
        `Fuer eure gemeinsame Richtung heisst das konkret: ${sharedOrientation} sollen die Entwicklung des Unternehmens tragen.`,
        `Bei ${differingOrientation} nehmt ihr Unterschiede nicht nebenbei mit, sondern besprecht sie bewusst, bevor daraus verschiedene strategische Erwartungen werden.`,
        "So entsteht eine Leitlinie, die Orientierung gibt und dennoch unterschiedliche Gewichtungen sauber einbindet.",
        ruleFocus,
      ].join(" ");

    case "decision_rules":
      return [
        "Fuer Entscheidungen haltet ihr fest, wie ihr Tempo, Sorgfalt und Verantwortung zusammenbringt.",
        `Massgeblich sind fuer euch ${sharedOrientation}.`,
        `Wenn sich Unterschiede bei ${differingOrientation} zeigen, klaert ihr zuerst, was gemeinsam entschieden werden muss und was klar in einer Hand liegt.`,
        `${integratedPerspectiveSentence} ${ruleFocus}`,
      ].join(" ");

    case "ownership_risk":
      return [
        `Im Umgang mit Risiko und Ownership orientiert ihr euch daran, ${sharedOrientation} zusammenzudenken.`,
        `Wo sich eure Sicht bei ${differingOrientation} unterscheidet, sprecht ihr das frueh an, bevor daraus unterschiedliche Risikoschwellen entstehen.`,
        "Experimente und weitreichende Schritte sollen deshalb weder aus purem Vorsprung noch aus reiner Vorsicht heraus entstehen, sondern aus einer bewusst getragenen Abwaegung.",
        ruleFocus,
      ].join(" ");

    case "values_guardrails":
      return [
        `Fuer eure unternehmerischen Leitplanken heisst das, ${sharedOrientation} bewusst festzuhalten.`,
        `Wenn sich Unterschiede bei ${differingOrientation} zeigen, besprecht ihr sie frueh, bevor wirtschaftlicher Druck oder externe Erwartungen euren Rahmen verschieben.`,
        "So entsteht eine gemeinsame Orientierung dafuer, welche Kompromisse fuer euch tragbar sind und wo eure roten Linien liegen.",
        ruleFocus,
      ].join(" ");

    case "roles_responsibility":
      return [
        "Fuer euren Arbeitsalltag haltet ihr fest, wie eng ihr abgestimmt arbeiten, was sichtbar bleiben und wo mehr Eigenraum gelten soll.",
        `Tragend sind fuer euch ${sharedOrientation}.`,
        `Wenn sich Unterschiede bei ${differingOrientation} zeigen, klaert ihr offen, wo mehr Rueckkopplung noetig ist und wo gezielte statt dauernder Abstimmung reicht.`,
        ruleFocus,
      ].join(" ");

    case "commitment_load":
      return [
        `Fuer euer Commitment heisst das, einen Arbeitsrahmen zu setzen, der ${sharedOrientation} realistisch abbildet.`,
        `Wo sich Erwartungen bei ${differingOrientation} unterscheiden, sprecht ihr das offen an, statt es still vorauszusetzen.`,
        "So entsteht ein Rahmen fuer Fokus, Verfuegbarkeit und Belastung, der fuer beide tragfaehig bleibt.",
        ruleFocus,
      ].join(" ");

    case "collaboration_conflict":
      return [
        "Wenn Spannungen entstehen, gilt fuer euch eine klare Regel fuer Abstimmung und Klaerung.",
        `Wichtig sind dabei ${sharedOrientation}.`,
        `Wo ihr bei ${differingOrientation} unterschiedlich tickt, sprecht ihr Irritationen frueh an, bevor sie persoenlich aufgeladen werden.`,
        ruleFocus,
      ].join(" ");

    case "alignment_90_days":
      return [
        `Fuer die naechsten 90 Tage nehmt ihr euch vor, ${sharedOrientation} konkret sichtbar zu machen.`,
        `Bei ${differingOrientation} reicht euch keine lose Abstimmung; daraus sollen in den naechsten Gespraechen klare Entscheidungen werden.`,
        "Die kommenden Wochen nutzt ihr, um Vereinbarungen in Routinen, Verantwortlichkeiten und naechste Schritte zu uebersetzen.",
        ruleFocus,
      ].join(" ");

    default:
      return [foundationSentence, differenceSentence, integratedPerspectiveSentence, ruleFocus].join(
        " "
      );
  }
}

function buildCommonGroundPoints(detectedThemes: string[], fallbackThemes: string[]) {
  const themes = (detectedThemes.length > 0 ? detectedThemes : fallbackThemes).slice(0, 3);

  return themes.map((theme) => `${theme} taucht in beiden Perspektiven als gemeinsamer Bezugspunkt auf.`);
}

function buildDifferingPerspectivePoints(differingThemes: string[], fallbackDifferenceFocus: string) {
  if (differingThemes.length === 0) {
    return [
      `Unterschiede zeigen sich derzeit eher als Nuancen innerhalb von ${fallbackDifferenceFocus.toLowerCase()}.`,
    ];
  }

  return differingThemes
    .slice(0, 3)
    .map((theme) => `${theme} wird in euren Antworten unterschiedlich gewichtet.`);
}

function describeThemeSet(detectedThemes: string[], fallbackThemes: string[]) {
  const themes = detectedThemes.length > 0 ? detectedThemes : fallbackThemes;
  return joinWithUnd(themes.slice(0, 2));
}

function describeDifferenceSet(differingThemes: string[], fallbackDifferenceFocus: string) {
  return differingThemes.length > 0
    ? joinWithUnd(differingThemes.slice(0, 2))
    : fallbackDifferenceFocus.toLowerCase();
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
          ? "border-[color:var(--brand-accent)]/30 bg-[linear-gradient(135deg,rgba(124,58,237,0.14),rgba(255,255,255,0.96))] text-slate-900 shadow-[0_16px_36px_rgba(124,58,237,0.12)] ring-1 ring-[color:var(--brand-accent)]/14"
          : "border-slate-200 bg-slate-50/80 text-slate-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"}`}
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
              ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)]"
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
