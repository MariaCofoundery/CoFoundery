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
import { ProductFeedbackEntry } from "@/features/feedback/ProductFeedbackEntry";
import {
  approveFounderAlignmentAdvisorProposal,
  copyFounderAlignmentAdvisorInviteLink,
  proposeFounderAlignmentAdvisor,
  prepareFounderAlignmentAdvisorInvite,
  sendFounderAlignmentAdvisorInvite,
  saveFounderAlignmentWorkbook,
} from "@/features/reporting/founderAlignmentWorkbookActions";
import { type FounderAlignmentWorkbookViewerRole } from "@/features/reporting/founderAlignmentWorkbookData";
import { buildWorkbookStepImpulseContent } from "@/features/reporting/founderAlignmentWorkbookImpulses";
import { WORKBOOK_STEP_CONTENT } from "@/features/reporting/founderAlignmentWorkbookStepContent";
import { buildPilotAgreementDraftFromStructuredOutputs } from "@/features/reporting/founderAlignmentWorkbookPilotDraft";
import {
  FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  WORKBOOK_STRUCTURED_STEP_IDS,
  getMissingWorkbookStructuredOutputKeys,
  getWorkbookRequiredStructuredOutputKeys,
  getWorkbookStepStructuredOutputs,
  isWorkbookStructuredStepId,
  resolveFounderAlignmentWorkbookSteps,
  sanitizeFounderAlignmentWorkbookPayload,
  sanitizeWorkbookStepWorkspaceV2,
  sanitizeWorkbookStructuredOutputsByStep,
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
  type FounderAlignmentWorkbookStepWorkspaceV2,
  type FounderAlignmentWorkbookDiscussionAuthor,
  type FounderAlignmentWorkbookDiscussionEntry,
  type FounderAlignmentWorkbookDiscussionReaction,
  type FounderAlignmentWorkbookDiscussionSignal,
  type WorkbookStepMarkersByStep,
  type WorkbookStructuredOutputsByStep,
  type WorkbookStructuredStepOutputs,
  type WorkbookStructuredOutputType,
} from "@/features/reporting/founderAlignmentWorkbook";
import type { FounderMatchingMarkerClass } from "@/features/reporting/founderMatchingMarkers";
import { type FounderAlignmentWorkbookAdvisorInviteState } from "@/features/reporting/founderAlignmentWorkbookAdvisor";
import { type FounderAlignmentWorkbookAdvisorEntry } from "@/features/reporting/founderAlignmentWorkbookAdvisor";
import {
  ADVISOR_IMPULSE_SECTION_META,
  type FounderVisibleAdvisorImpulse,
} from "@/features/reporting/advisorSectionImpulses";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";

type FounderAlignmentWorkbookClientProps = {
  invitationId: string | null;
  teamContext: TeamContext;
  founderAName: string | null;
  founderBName: string | null;
  founderAAvatarId: string | null;
  founderBAvatarId: string | null;
  founderAAvatarUrl: string | null;
  founderBAvatarUrl: string | null;
  currentUserRole: FounderAlignmentWorkbookViewerRole;
  initialWorkbook: FounderAlignmentWorkbookPayload;
  highlights: FounderAlignmentWorkbookHighlights;
  stepMarkersByStep?: WorkbookStepMarkersByStep;
  advisorInvite: FounderAlignmentWorkbookAdvisorInviteState;
  advisorEntries: FounderAlignmentWorkbookAdvisorEntry[];
  advisorImpulses: FounderVisibleAdvisorImpulse[];
  showValuesStep: boolean;
  canSave: boolean;
  persisted: boolean;
  updatedAt: string | null;
  source: "live" | "mock";
  storedTeamContext: TeamContext | null;
  hasTeamContextMismatch: boolean;
};

type WorkbookEditableField = "founderA" | "founderB" | "agreement" | "advisorNotes";
type WorkbookStructuredOutputValue = WorkbookStructuredStepOutputs;
type AdvisorClosingField = keyof FounderAlignmentWorkbookAdvisorClosing;
type FounderReactionField = "status" | "comment";
type AdvisorFollowUpOption = FounderAlignmentWorkbookAdvisorFollowUp;
type WorkbookModeOption = Exclude<FounderAlignmentWorkbookStepMode, never>;
type WorkbookV2Phase = "collect" | "weight" | "rule" | "approval";
type WorkbookVisualTone = "default" | "core" | "light" | "closing" | "guardrails" | "advisor";
type DiscussionSignalOption = {
  value: FounderAlignmentWorkbookDiscussionSignal;
  label: string;
  shortLabel: string;
};

type WorkbookDiscussionThreadGroup = {
  rootEntry: FounderAlignmentWorkbookDiscussionEntry;
  childEntries: FounderAlignmentWorkbookDiscussionEntry[];
};

const PREMIUM_WORKBOOK_V2_STEP_IDS = [
  "vision_direction",
  "roles_responsibility",
  "decision_rules",
  "commitment_load",
  "collaboration_conflict",
  "ownership_risk",
  "values_guardrails",
  "alignment_90_days",
] as const;
type PremiumWorkbookV2StepId = (typeof PREMIUM_WORKBOOK_V2_STEP_IDS)[number];
const LIGHT_PREMIUM_WORKBOOK_V2_STEP_IDS: ReadonlyArray<PremiumWorkbookV2StepId> = [
  "vision_direction",
  "roles_responsibility",
  "commitment_load",
];
const LEGACY_WORKSPACE_TIMESTAMP = "1970-01-01T00:00:00.000Z";

type PremiumWorkbookV2Config = {
  question?: string;
  collectPhaseLabel?: string;
  collectTitle?: string;
  collectActionLabel?: string;
  collectIntro: string;
  collectPlaceholder: string;
  collectHelper: string;
  collectReadyText: string;
  missingPerspectiveText: (missingLabel: string) => string;
  weightingPhaseLabel?: string;
  weightingTitle?: string;
  weightingActionLabel?: string;
  weightingIntro: string;
  signalOptions?: DiscussionSignalOption[];
  sharedInsightTitle?: string;
  sharedInsightText?: string;
  pendingInsightTitle?: string;
  pendingInsightText?: string;
  criticalInsightTitle?: string;
  criticalInsightText?: string;
  insightCountMode?: "default" | "alignment" | "guardrails";
  rulePhaseLabel?: string;
  ruleTitle?: string;
  ruleIntro: string;
  agreementTitle: string;
  agreementPlaceholder: string;
  escalationTitle: string;
  escalationPlaceholder: string;
  escalationHelper: string;
  reviewTitle: string;
  reviewPlaceholder: string;
  reviewHelper: string;
  reviewSummary: string;
  requireReviewForApproval?: boolean;
  approvalTitle?: string;
  approvalIntro?: string;
  rulePreviewSummary: string;
  rulePreviewDetail: string;
};

const PREMIUM_WORKBOOK_V2_CONFIG: Record<PremiumWorkbookV2StepId, PremiumWorkbookV2Config> = {
  vision_direction: {
    collectIntro:
      "Haltet zuerst die Punkte fest, die eure Richtung im Alltag wirklich steuern: was bei euch Vorrang bekommt, welche Chancen attraktiv wirken und wann ihr bewusst beim Fokus bleibt. Ein klarer Punkt pro Beobachtung reicht.",
    collectPlaceholder:
      "Zum Beispiel: Umsatzchancen kippen bei uns schnell in Vorrang. Oder: Wir wechseln den Fokus erst, wenn ein Thema klar zum Kern passt und nicht nur laut wirkt.",
    collectHelper: "Startet mit zwei oder drei klaren Prioritaets- oder Fokusbeobachtungen.",
    collectReadyText:
      "Beide Perspektiven sind jetzt sichtbar. Als Naechstes ordnet ihr, welche Richtung euch gemeinsam traegt und wo ihr Chancen unterschiedlich lest.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Punkt von ${missingLabel}. Erst dann wird sichtbar, wie ihr Fokus, Chancen und Richtungswechsel wirklich abwaegt.`,
    weightingIntro:
      "Ordnet jetzt jeden Punkt ein. So wird sichtbar, was fuer euch beide Prioritaet hat, wo eine Chance unterschiedlich attraktiv wirkt und welche Linie euch gemeinsam traegt.",
    ruleIntro:
      "Verdichtet eure Punkte jetzt zu einer klaren Richtungsregel fuer Fokus, Chancen und bewusste Nicht-Prioritaeten. Hier legt ihr fest, was im Zweifel Vorrang hat und wann ihr euch nicht vom Kern wegziehen lasst.",
    agreementTitle: "Richtungsregel",
    agreementPlaceholder:
      "Wenn neue Chancen, Produktfokus und Aufbau gleichzeitig ziehen, hat ... Vorrang. Eine neue Richtung prueft ihr erst dann weiter, wenn ...",
    escalationTitle: "Wann ihr bewusst nein sagt",
    escalationPlaceholder:
      "Auch wenn eine Chance attraktiv wirkt, verfolgt ihr sie nicht weiter, wenn ...",
    escalationHelper:
      "Diese Regel schuetzt euren Fokus vor laut wirkenden, aber unpassenden Chancen.",
    reviewTitle: "Wann ihr eure Richtung bewusst neu prueft",
    reviewPlaceholder:
      "Zum Beispiel: wenn sich Markt, Team oder Prioritaeten sichtbar veraendern und eure bisherige Linie nicht mehr sauber traegt.",
    reviewHelper: "Hilfreich, damit Richtungswechsel bewusst und nicht nebenbei passieren.",
    reviewSummary: "Review-Punkt optional ergaenzen",
    rulePreviewSummary:
      "Die gemeinsame Linie wird erst stark, wenn eure Prioritaeten und Fokusmuster sichtbar eingeordnet sind.",
    rulePreviewDetail:
      "So wirkt die Richtungsregel wie eine klare Linie und nicht wie ein weiterer Textblock.",
  },
  roles_responsibility: {
    question:
      "Wer fuehrt welche Themen, und ab wann braucht die andere Person Mitsicht oder Mitsprache?",
    collectIntro:
      "Sammelt konkrete Ownership-Punkte: welche Themen eine Person fuehrt, was sie allein entscheiden kann und wo fruehe Sichtbarkeit wichtig ist.",
    collectPlaceholder:
      "Zum Beispiel: Produktprioritaeten fuehrt ... allein. Oder: Hiring-Entscheidungen bleiben sichtbar, sobald Budget, Kultur oder Timing betroffen sind.",
    collectHelper: "Ein guter Punkt nennt Thema, Fuehrung und wann die andere Person reinmuss.",
    collectReadyText:
      "Beide Perspektiven sind sichtbar. Als Naechstes ordnet ihr, welche Ownership klar tragbar ist und wo Mitsicht oder Mitsprache fehlt.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Ownership-Punkt von ${missingLabel}. Erst dann wird sichtbar, wo Fuehrung, Mitsicht und Entscheidungsspielraum wirklich passen.`,
    weightingIntro:
      "Ordnet jeden Punkt ein. So seht ihr, was eigenstaendig laufen kann, wo fruehe Mitsicht reicht und wo ihr gemeinsam klaeren muesst.",
    signalOptions: [
      { value: "important", label: "Brauche frueh Mitsicht", shortLabel: "Mitsicht" },
      { value: "agree", label: "Kann so laufen", shortLabel: "Passt" },
      { value: "critical", label: "Muss geklaert werden", shortLabel: "Klaeren" },
    ],
    sharedInsightTitle: "Kann so laufen",
    sharedInsightText: "Punkte, bei denen Fuehrung und Mitsicht fuer beide passen.",
    pendingInsightTitle: "Noch nicht von beiden eingeordnet",
    pendingInsightText: "Punkte, bei denen noch keine gemeinsame Lesart sichtbar ist.",
    criticalInsightTitle: "Klaerungsbedarf",
    criticalInsightText: "Punkte, bei denen Ownership oder Mitsprache noch offen ist.",
    ruleIntro:
      "Formuliert jetzt eure Verantwortungsregel. Sie soll im Alltag klar machen, wer fuehrt, was sichtbar bleibt und ab wann gemeinsam abgestimmt wird.",
    agreementTitle: "Verantwortungsregel",
    agreementPlaceholder:
      "Dieses Thema fuehrt ... eigenstaendig. Die andere Person bekommt frueh Mitsicht, sobald ...",
    escalationTitle: "Grenze fuer Mitsprache",
    escalationPlaceholder:
      "Ab dieser Grenze wird nicht mehr allein weitergefuehrt: ... Wenn Zustaendigkeit unklar wird, klaert ihr zuerst ...",
    escalationHelper:
      "Diese Grenze trennt echte Eigenverantwortung von Themen, die gemeinsame Abstimmung brauchen.",
    reviewTitle: "Woran ihr merkt, dass Ownership unscharf wird",
    reviewPlaceholder:
      "Zum Beispiel: wenn Entscheidungen zurueckgeholt werden, Arbeit doppelt laeuft oder wichtige Themen erst spaet sichtbar werden.",
    reviewHelper: "Hilfreich, damit Rollen nicht erst bei Reibung neu verhandelt werden.",
    reviewSummary: "Ownership-Signal optional ergaenzen",
    rulePreviewSummary:
      "Die Verantwortungsregel wird erst tragfaehig, wenn Fuehrung, Mitsicht und Mitsprache sauber eingeordnet sind.",
    rulePreviewDetail:
      "Dann ist klar, was eigenstaendig laeuft und was gemeinsam sichtbar bleiben muss.",
  },
  decision_rules: {
    collectIntro:
      "Haltet zuerst nur die Punkte fest, die eure Entscheidungen im Alltag tragen oder blockieren. Ein klarer Satz pro Punkt reicht.",
    collectPlaceholder:
      "Zum Beispiel: Ab Budget X entscheidet niemand mehr allein. Oder: Marktfenster duerfen nicht zweimal in dieselbe Schleife fallen.",
    collectHelper: "Startet mit zwei oder drei Punkten, nicht mit einem perfekten Text.",
    collectReadyText:
      "Beide Perspektiven sind jetzt auf dem Tisch. Als Naechstes ordnet ihr jeden Punkt gemeinsam ein.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Punkt von ${missingLabel}. Erst dann wird die Gewichtung wirklich belastbar.`,
    weightingIntro:
      "Ordnet jetzt jeden vorhandenen Punkt ein. Erst wenn beide Seiten alle Punkte gelesen und markiert haben, wird die Regel wirklich belastbar.",
    ruleIntro:
      "Verdichtet jetzt eure Punkte zu einer Regel, die im Alltag wirklich traegt. Hier entscheidet sich, was kuenftig gilt.",
    agreementTitle: "Entscheidungsregel",
    agreementPlaceholder:
      "Wenn eine Entscheidung im Verantwortungsbereich bleibt, entscheidet ... Sobald Risiko, Budget oder Aussenwirkung groesser werden, ...",
    escalationTitle: "Wenn ihr nicht einig seid",
    escalationPlaceholder:
      "Wenn ihr bis zu einer festen Frist nicht einig seid, dann entscheidet ... oder ihr zieht ... dazu.",
    escalationHelper: "Diese Regel macht den Schritt erst belastbar.",
    reviewTitle: "Wann ihr die Regel wieder prueft",
    reviewPlaceholder:
      "Zum Beispiel: wenn Entscheidungen wieder haengen bleiben oder Verantwortung unklar wird.",
    reviewHelper: "Hilfreich, wenn ihr spaeter bewusst nachschaerfen wollt.",
    reviewSummary: "Review-Trigger optional ergaenzen",
    rulePreviewSummary:
      "Die Regel wird erst wichtig, wenn eure Punkte und Gewichtungen sauber sichtbar sind.",
    rulePreviewDetail:
      "Sie kommt erst dann nach vorn, wenn beide Perspektiven und alle Einordnungen wirklich da sind.",
  },
  commitment_load: {
    question:
      "Was ist bei Einsatz und Verfuegbarkeit realistisch, und was passiert, wenn Kapazitaet kippt?",
    collectIntro:
      "Sammelt konkrete Punkte zu Einsatz, Verfuegbarkeit und Belastung: was realistisch ist, was frueh sichtbar werden muss und was nicht still vorausgesetzt werden darf.",
    collectPlaceholder:
      "Zum Beispiel: Abends reagiere ich nicht verlaesslich. Oder: Wenn Kundenarbeit und Produkt gleichzeitig ziehen, muss zuerst ... neu priorisiert werden.",
    collectHelper: "Ein guter Punkt nennt Erwartung, Grenze oder fruehes Signal. Kein Rechtfertigungstext noetig.",
    collectReadyText:
      "Beide Perspektiven sind sichtbar. Als Naechstes ordnet ihr, was tragbar ist, was frueh gesagt werden muss und wo ihr neu priorisieren muesst.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Commitment-Punkt von ${missingLabel}. Erst dann wird sichtbar, welche Erwartungen, Grenzen und Belastungssignale wirklich zusammenpassen.`,
    weightingIntro:
      "Ordnet jeden Punkt ein. So seht ihr, was realistisch tragbar ist, was frueh transparent werden muss und wo ihr Erwartungen neu sortieren solltet.",
    signalOptions: [
      { value: "important", label: "Muss frueh sichtbar sein", shortLabel: "Frueh sichtbar" },
      { value: "agree", label: "Ist realistisch tragbar", shortLabel: "Tragbar" },
      { value: "critical", label: "Muss neu sortiert werden", shortLabel: "Neu sortieren" },
    ],
    sharedInsightTitle: "Realistisch tragbar",
    sharedInsightText: "Punkte, die beide als realistische Arbeitsbasis tragen koennen.",
    pendingInsightTitle: "Noch nicht von beiden eingeordnet",
    pendingInsightText: "Punkte, bei denen noch keine gemeinsame Erwartung sichtbar ist.",
    criticalInsightTitle: "Neu sortieren",
    criticalInsightText: "Punkte, bei denen Belastung oder Erwartung aktiv geklaert werden muss.",
    ruleIntro:
      "Formuliert jetzt eure Commitment-Regel. Sie soll klar machen, was realistisch gilt, was frueh transparent wird und wie ihr neu priorisiert, wenn Kapazitaet kippt.",
    agreementTitle: "Commitment-Regel",
    agreementPlaceholder:
      "Im Normalmodus ist realistisch: ... Wenn sich Verfuegbarkeit oder Belastung veraendert, wird das frueh sichtbar gemacht durch ...",
    escalationTitle: "Wenn Kapazitaet kippt",
    escalationPlaceholder:
      "Wenn eine Person merkt, dass Zusagen nicht mehr tragbar sind, dann sortiert ihr zuerst ... neu. Still vorausgesetzt wird nicht ...",
    escalationHelper:
      "Diese Regel verhindert, dass Belastung still mitlaeuft und erst spaet in Reibung kippt.",
    reviewTitle: "Fruehwarnsignal fuer Ueberlast",
    reviewPlaceholder:
      "Zum Beispiel: wenn Reaktionszeiten kippen, Zusagen wiederholt wackeln oder wichtige Arbeit nur noch mit Druck erledigt wird.",
    reviewHelper: "Hilfreich, damit Belastung frueh sichtbar wird und nicht als Vorwurf auftaucht.",
    reviewSummary: "Fruehwarnsignal optional ergaenzen",
    rulePreviewSummary:
      "Die Commitment-Regel wird erst tragfaehig, wenn Einsatz, Grenzen und Repriorisierung sauber eingeordnet sind.",
    rulePreviewDetail:
      "Dann ist klar, was realistisch ist und was ihr nicht still voneinander erwartet.",
  },
  collaboration_conflict: {
    collectIntro:
      "Haltet zuerst die Situationen fest, in denen Reibung entsteht, Kritik haengen bleibt oder ein Thema einen eigenen Klaerungsrahmen braucht. Ein klarer Punkt pro Beobachtung reicht.",
    collectPlaceholder:
      "Zum Beispiel: Kritik kommt oft erst, wenn der Frust schon da ist. Oder: In angespannten Meetings wird zu schnell in der Sache weitergemacht.",
    collectHelper: "Startet mit konkreten Situationen, nicht mit langen Erklaerungen.",
    collectReadyText:
      "Beide Perspektiven sind jetzt sichtbar. Als Naechstes ordnet ihr, was ihr gemeinsam tragen koennt und wo klare Spielregeln fehlen.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Punkt von ${missingLabel}. Erst dann wird sichtbar, wie ihr mit Spannung und Feedback wirklich umgeht.`,
    weightingIntro:
      "Ordnet jetzt jeden Punkt ein. So wird sichtbar, welche Reibungen ihr gemeinsam klaeren koennt und wo ihr bewusst andere Spielregeln braucht.",
    ruleIntro:
      "Verdichtet eure Punkte jetzt zu einer klaren Regel fuer Feedback, Klaerung und Konflikt. Hier legt ihr fest, was im Alltag gilt und wann ihr aus dem Tagesgeschaeft in einen eigenen Klaerungsrahmen wechselt.",
    agreementTitle: "Klaerungsregel",
    agreementPlaceholder:
      "Wenn mich etwas stoert, spreche ich es ... an. Wenn ein Thema im laufenden Austausch nicht sauber geklaert wird, ...",
    escalationTitle: "Wenn ein Thema nicht im Alltag geloest wird",
    escalationPlaceholder:
      "Wenn ein Punkt wiederkommt, im Ton kippt oder im Meeting nicht sauber geloest wird, dann ...",
    escalationHelper:
      "Diese Regel trennt Alltagsreibung von einem bewussten Klaerungsgespraech.",
    reviewTitle: "Woran ihr merkt, dass ihr frueher klaeren muesst",
    reviewPlaceholder:
      "Zum Beispiel: wenn Feedback liegen bleibt, Gespraeche schaerfer werden oder dieselbe Reibung mehrfach auftaucht.",
    reviewHelper: "Hilfreich, damit Konflikte nicht erst spaet einen eigenen Raum bekommen.",
    reviewSummary: "Fruehwarnsignal optional ergaenzen",
    rulePreviewSummary:
      "Die Regel fuer Feedback und Klaerung wird erst tragfaehig, wenn eure Spannungen und Muster sichtbar eingeordnet sind.",
    rulePreviewDetail:
      "So wird aus Reibung eine klare Arbeitsregel und nicht nur ein guter Vorsatz.",
  },
  ownership_risk: {
    question:
      "Welche Risiken fuehrt eine Person selbst, und ab wann gehoeren sie verbindlich auf euren gemeinsamen Tisch?",
    collectIntro:
      "Legt konkrete Risikosituationen auf den Tisch: was frueh sichtbar werden muss, was noch tragbar ist und wo niemand still allein weiterlaufen darf.",
    collectPlaceholder:
      "Zum Beispiel: Runway unter X Monaten. Ein rechtlicher Punkt mit Aussenwirkung. Eine Produktentscheidung, die Budget, Haftung oder Reputation beruehrt.",
    collectHelper: "Ein guter Punkt nennt Risiko, Schwelle und wer spaetestens dazu muss.",
    collectReadyText:
      "Beide Perspektiven sind sichtbar. Als Naechstes trennt ihr, was tragbar bleibt, was frueh sichtbar werden muss und wo ihr gemeinsam entscheidet.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Risikopunkt von ${missingLabel}. Erst dann wird sichtbar, wo ihr Schwellen, Verantwortung und Absicherung unterschiedlich setzt.`,
    weightingIntro:
      "Ordnet jeden Punkt ein. So seht ihr, was fuer beide tragbar ist, was frueh sichtbar werden muss und wo eine Person nicht allein weitergehen sollte.",
    signalOptions: [
      { value: "important", label: "Muss frueh sichtbar sein", shortLabel: "Frueh sichtbar" },
      { value: "agree", label: "Ist fuer mich tragbar", shortLabel: "Tragbar" },
      { value: "critical", label: "Nicht allein weiter", shortLabel: "Nicht allein" },
    ],
    sharedInsightTitle: "Tragbar fuer beide",
    sharedInsightText: "Punkte, die beide in dieser Form tragen koennen.",
    pendingInsightTitle: "Noch nicht von beiden eingeordnet",
    pendingInsightText: "Punkte, bei denen noch keine gemeinsame Lesart sichtbar ist.",
    criticalInsightTitle: "Nicht allein weiter",
    criticalInsightText: "Punkte, die eine gemeinsame Entscheidung brauchen.",
    ruleIntro:
      "Formuliert jetzt eure Arbeitsregel fuer Risiko-Fuehrung, Sichtbarkeit und Eingriff. Sie soll im Alltag sofort klarmachen, wer fuehrt und wann Absicherung Vorrang hat.",
    agreementTitle: "Fuehrungsregel fuer Risiken",
    agreementPlaceholder:
      "Bis zu dieser Schwelle fuehrt ... das Risiko selbst. Sichtbar wird es fuer beide spaetestens, wenn ...",
    escalationTitle: "Schwelle fuer gemeinsamen Eingriff",
    escalationPlaceholder:
      "Ab dieser Schwelle entscheidet niemand mehr allein: ... Wenn Absicherung Vorrang vor Tempo hat, gilt ...",
    escalationHelper:
      "Diese Schwelle macht klar, wann Beobachten endet und gemeinsames Entscheiden beginnt.",
    reviewTitle: "Fruehwarnsignal fuer zu spaete Sichtbarkeit",
    reviewPlaceholder:
      "Zum Beispiel: wenn ein Risiko erst im Notfall auftaucht, laenger still weiterlaeuft oder eine Person es wiederholt frueher kritisch sieht.",
    reviewHelper: "Hilfreich, damit Risiken nicht erst unter Druck auf den gemeinsamen Tisch kommen.",
    reviewSummary: "Fruehwarnsignal optional ergaenzen",
    rulePreviewSummary:
      "Die Risikoregel wird erst tragfaehig, wenn Fuehrung, Sichtbarkeit und Eingriffsschwelle sauber geklaert sind.",
    rulePreviewDetail:
      "Dann ist klar, wo eine Person fuehrt und wo ihr gemeinsam absichert.",
  },
  values_guardrails: {
    question:
      "Welche Grenzen gelten fuer euch auch dann, wenn Wachstum, Geld oder Druck dagegen ziehen?",
    collectPhaseLabel: "Grenzen",
    collectTitle: "1. Grenzraum",
    collectActionLabel: "Grenzraum bearbeiten",
    collectIntro:
      "Sammelt konkrete Grenzfaelle: was noch tragbar waere, wo ihr bewusst nein sagt und was nie still nebenher entschieden wird.",
    collectPlaceholder:
      "Zum Beispiel: Ein Investor bringt Tempo, aber verlangt eine Richtung, die nicht zu uns passt. Oder: Ein Kunde ist wirtschaftlich attraktiv, passt aber nicht zu unserer Arbeitsweise.",
    collectHelper:
      "Ein guter Punkt beschreibt einen echten Fall, keine abstrakte Werteformel.",
    collectReadyText:
      "Beide Perspektiven sind sichtbar. Als Naechstes ordnet ihr, was tragbar ist, was ein Grenzfall bleibt und was nicht euer Weg ist.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Grenzfall von ${missingLabel}. Erst dann wird sichtbar, welche Kompromisse, roten Linien und Freigaben fuer euch beide gelten.`,
    weightingPhaseLabel: "Einordnen",
    weightingTitle: "2. Persoenliche Einordnung",
    weightingActionLabel: "Einordnung bearbeiten",
    weightingIntro:
      "Ordnet jeden Fall ein. Hier geht es nicht um Bewertung, sondern um Klarheit: tragbar, Grenzfall oder nicht euer Weg.",
    signalOptions: [
      { value: "agree", label: "Ist tragbar", shortLabel: "Tragbar" },
      { value: "important", label: "Ist ein Grenzfall", shortLabel: "Grenzfall" },
      { value: "critical", label: "Nicht unser Weg", shortLabel: "Nicht unser Weg" },
    ],
    sharedInsightTitle: "Tragbar",
    sharedInsightText: "Faelle, die beide in dieser Form vertreten koennen.",
    pendingInsightTitle: "Grenzfaelle",
    pendingInsightText: "Faelle, die bewusst freigegeben und nicht nebenbei entschieden werden sollten.",
    criticalInsightTitle: "Nicht unser Weg",
    criticalInsightText: "Faelle, bei denen mindestens eine Person klar aussteigt.",
    insightCountMode: "guardrails",
    rulePhaseLabel: "Leitplanke",
    ruleTitle: "3. Leitplanken-Vereinbarung",
    ruleIntro:
      "Verdichtet eure Einordnung zu einer Leitplanken-Vereinbarung. Sie soll im Alltag klar machen, was okay ist, was bewusste Freigabe braucht und was ihr nicht macht.",
    agreementTitle: "Leitplankenregel",
    agreementPlaceholder:
      "Fuer uns ist tragbar: ... Ein Grenzfall beginnt, wenn ... Dann entscheiden wir bewusst gemeinsam.",
    escalationTitle: "Rote Linie und bewusste Freigabe",
    escalationPlaceholder:
      "Nicht unser Weg ist ... Wenn ein wirtschaftlich attraktiver Fall diese Linie beruehrt, entscheiden wir nicht still weiter, sondern ...",
    escalationHelper:
      "Diese Regel schuetzt euch davor, rote Linien unter Druck nebenbei aufzuweichen.",
    reviewTitle: "Prueffrage fuer spaetere Grenzfaelle",
    reviewPlaceholder:
      "Zum Beispiel: Koennen wir diese Entscheidung auch dann vertreten, wenn sie sichtbar wird, skaliert oder spaeter erklaert werden muss?",
    reviewHelper:
      "Hilfreich, damit neue Grenzfaelle nicht jedes Mal bei null beginnen.",
    reviewSummary: "Prueffrage optional ergaenzen",
    approvalTitle: "4. Leitplanke bestaetigen",
    approvalIntro:
      "Bestaetigt diese Leitplanke erst, wenn tragbare Kompromisse, Grenzfaelle und rote Linien fuer euch beide klar sind.",
    rulePreviewSummary:
      "Die Leitplanke wird erst stark, wenn eure Grenzfaelle und roten Linien sauber eingeordnet sind.",
    rulePreviewDetail:
      "Dann ist klar, wo ihr flexibel bleibt und wo ihr bewusst nicht opportunistisch werdet.",
  },
  alignment_90_days: {
    question:
      "Worauf gebt ihr in den naechsten 90 Tagen wirklich Energie, und was laeuft bewusst nicht parallel?",
    collectPhaseLabel: "Fokus",
    collectTitle: "1. Fokusraum",
    collectActionLabel: "Fokusraum bearbeiten",
    collectIntro:
      "Sammelt nur die Punkte, die fuer die naechsten 90 Tage wirklich eine Entscheidung brauchen: Fokus, Nicht-Fokus, Fortschritt oder Review.",
    collectPlaceholder:
      "Zum Beispiel: Bis Ende Quartal hat Produktvalidierung Vorrang. Oder: Fundraising-Vorbereitung laeuft nur weiter, wenn ... dafuer runtergeht.",
    collectHelper: "Ein guter Punkt ist kein To-do, sondern eine Fokusentscheidung fuer die naechste Phase.",
    collectReadyText:
      "Beide Perspektiven sind sichtbar. Als Naechstes waehlt ihr, was Vorrang hat, was warten kann und was nur bewusst freigegeben wird.",
    missingPerspectiveText: (missingLabel) =>
      `Noch fehlt mindestens ein eigener Fokuspunkt von ${missingLabel}. Erst dann wird sichtbar, worauf ihr beide in den naechsten 90 Tagen wirklich Energie geben wollt.`,
    weightingPhaseLabel: "Priorisieren",
    weightingTitle: "2. Priorisierung",
    weightingActionLabel: "Priorisierung bearbeiten",
    weightingIntro:
      "Ordnet jeden Punkt ein. Hier geht es nicht um eine lange Liste, sondern um klare Auswahl: Vorrang, warten lassen oder nur bewusst freigeben.",
    signalOptions: [
      { value: "important", label: "Hat Vorrang", shortLabel: "Vorrang" },
      { value: "agree", label: "Kann warten", shortLabel: "Warten" },
      { value: "critical", label: "Nur bewusst freigeben", shortLabel: "Nur bewusst" },
    ],
    sharedInsightTitle: "Gemeinsamer Fokus",
    sharedInsightText: "Punkte, die beide klar in den Fokus nehmen.",
    pendingInsightTitle: "Bewusst geparkt",
    pendingInsightText: "Punkte, die beide aktuell warten lassen koennen.",
    criticalInsightTitle: "Nur bewusst freigeben",
    criticalInsightText: "Punkte, die nur laufen, wenn ihr aktiv etwas anderes reduziert.",
    insightCountMode: "alignment",
    rulePhaseLabel: "Vereinbarung",
    ruleTitle: "3. 90-Tage-Vereinbarung",
    ruleIntro:
      "Verdichtet eure Auswahl jetzt zu einer 90-Tage-Vereinbarung. Sie soll festhalten, was Vorrang hat, was nicht parallel mitlaeuft und woran ihr Fortschritt prueft.",
    agreementTitle: "90-Tage-Fokus",
    agreementPlaceholder:
      "In den naechsten 90 Tagen konzentrieren wir uns auf ... Vorrang hat ...",
    escalationTitle: "Was bewusst nicht parallel laeuft",
    escalationPlaceholder:
      "Nicht parallel mitlaufen darf ... Wenn ein neues Thema rein soll, muss dafuer ... runtergehen.",
    escalationHelper:
      "Diese Stop-Regel schuetzt euren Fokus vor gut klingenden Nebenbaustellen.",
    reviewTitle: "Woran ihr Fortschritt prueft",
    reviewPlaceholder:
      "Ihr prueft euren Fortschritt an ... Neu entschieden wird spaetestens am ... oder wenn ...",
    reviewHelper: "Dieser Punkt macht aus Fokus eine pruefbare Vereinbarung.",
    reviewSummary: "Fortschritts- und Review-Punkt festlegen",
    requireReviewForApproval: true,
    approvalTitle: "4. Gemeinsames Commitment",
    approvalIntro:
      "Bestaetigt diese 90-Tage-Vereinbarung erst, wenn Fokus, Nicht-Fokus und Review fuer euch beide klar sind.",
    rulePreviewSummary:
      "Die 90-Tage-Vereinbarung kommt erst nach eurer gemeinsamen Priorisierung nach vorn.",
    rulePreviewDetail:
      "So bleibt der Abschluss fokussiert und wird nicht zur naechsten Aufgabenliste.",
  },
};

function isPremiumWorkbookV2StepId(stepId: FounderAlignmentWorkbookStepId): stepId is PremiumWorkbookV2StepId {
  return (PREMIUM_WORKBOOK_V2_STEP_IDS as readonly FounderAlignmentWorkbookStepId[]).includes(stepId);
}

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
    label: "Erst allein starten",
    description:
      "Du legst einen ersten Stand im gemeinsamen Raum an. Die zweite Perspektive kommt spaeter mit eigener Autorenschaft dazu.",
  },
  {
    value: "collaborative",
    label: "Direkt gemeinsam starten",
    description:
      "Ihr sammelt direkt im selben Raum. Jeder Punkt bleibt klar einer Person zugeordnet.",
  },
] as const;

const WORKBOOK_MODE_SHORT_LABELS: Record<WorkbookModeOption, string> = {
  solo: "Erst allein",
  collaborative: "Direkt gemeinsam",
};

const WORKBOOK_MODE_V2_HINTS: Record<WorkbookModeOption, string> = {
  solo:
    "Gemeinsamer Raum: Du startest mit deinen Punkten. Die andere Person sieht sie hier und ergaenzt spaeter ihre eigene Sicht.",
  collaborative:
    "Gemeinsamer Raum: Ihr sammelt direkt zusammen. Jeder Punkt bleibt einer Person zugeordnet, die Vereinbarung entsteht gemeinsam.",
};

const FOUNDER_REACTION_OPTIONS: Array<{
  value: Exclude<FounderAlignmentWorkbookFounderReactionStatus, null>;
  label: string;
}> = [
  { value: "understood", label: t("Aufgenommen") },
  { value: "open", label: t("Bleibt offen") },
  { value: "in_clarification", label: t("Weiter klaeren") },
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
const DISCUSSION_SIGNAL_OPTIONS: DiscussionSignalOption[] = [
  { value: "important", label: "Wichtig fuer mich", shortLabel: "Wichtig" },
  { value: "agree", label: "Trage ich mit", shortLabel: "Trage ich mit" },
  { value: "critical", label: "Sehe ich kritisch", shortLabel: "Kritisch" },
];

function createDiscussionEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildLegacyDecisionRulesWorkspace(
  entry: FounderAlignmentWorkbookPayload["steps"][FounderAlignmentWorkbookStepId]
): FounderAlignmentWorkbookStepWorkspaceV2 {
  const entries: FounderAlignmentWorkbookDiscussionEntry[] = [];

  if (entry.founderA.trim()) {
    entries.push({
      id: "legacy-founderA",
      content: entry.founderA.trim(),
      createdBy: "founderA",
      createdAt: LEGACY_WORKSPACE_TIMESTAMP,
      sourceEntryId: null,
      updatedAt: null,
      updatedBy: null,
    });
  }

  if (entry.founderB.trim()) {
    entries.push({
      id: "legacy-founderB",
      content: entry.founderB.trim(),
      createdBy: "founderB",
      createdAt: LEGACY_WORKSPACE_TIMESTAMP,
      sourceEntryId: null,
      updatedAt: null,
      updatedBy: null,
    });
  }

  return {
    entries,
    reactions: [],
  };
}

function resolveDecisionRulesWorkspace(
  entry: FounderAlignmentWorkbookPayload["steps"][FounderAlignmentWorkbookStepId]
): FounderAlignmentWorkbookStepWorkspaceV2 {
  const workspace = sanitizeWorkbookStepWorkspaceV2(entry.workspaceV2);
  return workspace ?? buildLegacyDecisionRulesWorkspace(entry);
}

function getDecisionRulesReaction(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  entryId: string,
  userId: FounderAlignmentWorkbookDiscussionAuthor
) {
  return workspace.reactions.find(
    (reaction) => reaction.entryId === entryId && reaction.userId === userId
  )?.signal ?? null;
}

function hasDecisionRulesPerspective(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  userId: FounderAlignmentWorkbookDiscussionAuthor
) {
  return workspace.entries.some(
    (entry) => entry.createdBy === userId && entry.content.trim().length > 0
  );
}

function hasDecisionRulesWeightingForAllEntries(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  userId: FounderAlignmentWorkbookDiscussionAuthor
) {
  return (
    workspace.entries.length > 0 &&
    workspace.entries.every((entry) => getDecisionRulesReaction(workspace, entry.id, userId) !== null)
  );
}

function buildWorkbookV2MatchingHint(
  stepId: PremiumWorkbookV2StepId,
  markerClass: FounderMatchingMarkerClass | null
) {
  if (stepId === "vision_direction") {
    switch (markerClass) {
      case "critical_clarification_point":
        return "Hier zieht ihr strategisch nicht automatisch in dieselbe Richtung. Ohne klare Prioritaetslinie entscheidet ihr Chancen jedes Mal neu.";
      case "high_rule_need":
        return "Gutes Verstaendnis reicht hier nicht. Ihr braucht eine klare Linie dafuer, was wirklich Vorrang hat und was bewusst liegen bleibt.";
      case "conditional_complement":
        return "Ihr bringt unterschiedliche Blickwinkel auf Fokus und Chancen mit. Das hilft euch, wenn klar ist, wann Wachstum zieht und wann ihr den Kern schuetzt.";
      default:
        return "Euer Matching zeigt hier Unterschiede darin, wie ihr Fokus haltet, Chancen bewertet und wann fuer euch ein Richtungswechsel wirklich Sinn ergibt.";
    }
  }

  if (stepId === "roles_responsibility") {
    switch (markerClass) {
      case "critical_clarification_point":
        return "Hier koennen Fuehrung und Mitsicht schnell auseinanderlaufen. Ohne klare Ownership greift ihr zu spaet ein oder zieht Themen doppelt.";
      case "high_rule_need":
        return "Gutes Vertrauen reicht hier nicht. Ihr braucht klare Grenzen dafuer, was eigenstaendig laeuft und was frueh sichtbar werden muss.";
      case "conditional_complement":
        return "Ihr koennt euch gut ergaenzen, wenn klar ist, wer fuehrt und wann die andere Person nicht erst am Ende dazukommt.";
      default:
        return "Euer Matching zeigt Unterschiede darin, wie viel Eigenstaendigkeit, Mitsicht und Abstimmung ihr im Alltag braucht.";
    }
  }

  if (stepId === "ownership_risk") {
    switch (markerClass) {
      case "critical_clarification_point":
        return "Hier setzt ihr Risikoschwellen unterschiedlich. Wenn ihr das nicht klaert, wird ein Thema oft erst sichtbar, wenn Tempo, Geld oder Haftung schon betroffen sind.";
      case "high_rule_need":
        return "Bei euch reicht gutes Gefuehl nicht. Ihr braucht klare Schwellen: was eine Person selbst fuehrt, was frueh sichtbar wird und wann ihr gemeinsam entscheidet.";
      case "conditional_complement":
        return "Ihr seht Risiken unterschiedlich frueh. Das kann stark sein, wenn eine Person Tempo halten kann und die andere rechtzeitig Absicherung reinbringt.";
      default:
        return "Euer Matching zeigt Unterschiede darin, wie frueh ihr Risiken seht, wie viel Unsicherheit ihr tragt und wann Absicherung Vorrang vor Tempo bekommt.";
    }
  }

  if (stepId === "commitment_load") {
    switch (markerClass) {
      case "critical_clarification_point":
        return "Hier koennen Erwartungen an Einsatz und Verfuegbarkeit deutlich auseinandergehen. Ohne klare Transparenz entsteht schnell stiller Druck.";
      case "high_rule_need":
        return "Gute Absicht reicht hier nicht. Ihr braucht eine klare Regel dafuer, was realistisch ist und was passiert, wenn Kapazitaet kippt.";
      case "conditional_complement":
        return "Ihr bringt unterschiedliche Arbeitsrhythmen und Belastungsgrenzen mit. Das kann funktionieren, wenn Verfuegbarkeit und Repriorisierung klar sind.";
      default:
        return "Euer Matching zeigt Unterschiede darin, wie ihr Einsatz, Tempo und Belastung im Alltag lest. Dieser Schritt macht daraus eine realistische Arbeitsbasis.";
    }
  }

  if (stepId === "values_guardrails") {
    switch (markerClass) {
      case "critical_clarification_point":
        return "Hier koennen rote Linien unterschiedlich liegen. Unter Druck wird das gefaehrlich, wenn wirtschaftlich attraktive Faelle still weiterlaufen.";
      case "high_rule_need":
        return "Gute Werte reichen hier nicht. Ihr braucht eine klare Leitplanke dafuer, was tragbar ist, was bewusste Freigabe braucht und was ihr nicht macht.";
      case "conditional_complement":
        return "Ihr koennt euch gut ergaenzen, wenn eine Person Chancen sieht und die andere Grenzen frueh benennt. Stark wird das erst mit klaren Grauzonen.";
      default:
        return "Euer Matching zeigt, wie ihr Kompromisse, Druck und unternehmerische Grenzen lest. Dieser Schritt macht daraus eine gemeinsame Linie.";
    }
  }

  if (stepId === "alignment_90_days") {
    switch (markerClass) {
      case "critical_clarification_point":
        return "Euer Workbook hat wichtige Klaerungspunkte sichtbar gemacht. Jetzt geht es darum, daraus einen klaren 90-Tage-Fokus zu machen und Nebenbaustellen bewusst zu stoppen.";
      case "high_rule_need":
        return "Ihr habt mehrere Felder, die Fuehrung brauchen. Dieser Schritt setzt daraus eine kurze, verbindliche Linie fuer die naechsten 90 Tage.";
      case "conditional_complement":
        return "Eure Unterschiede koennen euch breiter machen. Fuer die naechsten 90 Tage braucht ihr trotzdem eine klare Auswahl, worauf Energie geht und was wartet.";
      default:
        return "Ihr habt eure Zusammenarbeit geklaert. Jetzt uebersetzt ihr das in Fokus, Nicht-Fokus und einen pruefbaren Review-Moment fuer die naechsten 90 Tage.";
    }
  }

  if (stepId === "collaboration_conflict") {
    switch (markerClass) {
      case "critical_clarification_point":
        return "Wenn Reibung hier liegen bleibt, zieht sie sich schnell durch andere Themen. Ihr braucht eine klare Form fuer Feedback und Klaerung.";
      case "high_rule_need":
        return "Gute Absicht reicht hier nicht. Ihr braucht klare Spielregeln dafuer, wann ihr Dinge ansprecht und wann ihr sie aus dem Tagesgeschaeft herausnehmt.";
      case "conditional_complement":
        return "Ihr bringt unterschiedliche Konflikt- und Abstimmungsstile mit. Das hilft euch nur dann, wenn Timing und Form der Klaerung klar sind.";
      default:
        return "Euer Matching zeigt hier Unterschiede darin, wie direkt ihr Feedback gebt, wie viel Abstimmung ihr braucht und wann Reibung wirklich geklaert werden muss.";
    }
  }

  switch (markerClass) {
    case "critical_clarification_point":
      return "Hier braucht ihr eine klare Entscheidungsgrenze. Sonst kippt Druck schnell in Blockade oder Rueckzug.";
    case "high_rule_need":
      return "In diesem Feld reicht gutes Verstaendnis nicht. Ihr braucht eine Regel, die auch unter Druck traegt.";
    case "conditional_complement":
      return "Ihr bringt unterschiedliche Staerken in Entscheidungen ein. Das hilft nur dann, wenn klar ist, wann Tempo und wann Absicherung fuehrt.";
    default:
      return "An diesem Punkt zeigt euer Matching, wie unterschiedlich ihr Tempo, Risiko und Verantwortung in Entscheidungen lest.";
  }
}

function formatDiscussionTimestamp(value: string) {
  if (!value || value === LEGACY_WORKSPACE_TIMESTAMP) {
    return "Vorhandener Stand";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAdvisorInviteTimestamp(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAdvisorImpulseTimestamp(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDiscussionSignalShortLabel(
  options: DiscussionSignalOption[],
  signal: FounderAlignmentWorkbookDiscussionSignal | null
) {
  if (!signal) return null;
  return options.find((option) => option.value === signal)?.shortLabel ?? null;
}

function truncateDiscussionPreview(content: string, maxLength = 180) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function resolveDiscussionRootEntryId(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  entryId: string
) {
  const entryById = new Map(workspace.entries.map((entry) => [entry.id, entry]));
  let current = entryById.get(entryId) ?? null;
  const visited = new Set<string>();

  while (current?.sourceEntryId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = entryById.get(current.sourceEntryId) ?? null;
    if (!parent) {
      break;
    }
    current = parent;
  }

  return current?.id ?? entryId;
}

function buildDiscussionThreadGroups(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2
): WorkbookDiscussionThreadGroup[] {
  const groupsByRootId = new Map<string, WorkbookDiscussionThreadGroup>();

  for (const entry of workspace.entries) {
    const rootId = entry.sourceEntryId
      ? resolveDiscussionRootEntryId(workspace, entry.id)
      : entry.id;

    if (!groupsByRootId.has(rootId)) {
      groupsByRootId.set(rootId, {
        rootEntry: entry,
        childEntries: [],
      });
    }

    const group = groupsByRootId.get(rootId)!;
    if (rootId === entry.id && !entry.sourceEntryId) {
      group.rootEntry = entry;
    } else if (rootId === entry.id && entry.sourceEntryId) {
      group.rootEntry = entry;
    } else {
      group.childEntries.push(entry);
    }
  }

  return workspace.entries
    .filter((entry) => groupsByRootId.has(entry.id))
    .map((entry) => groupsByRootId.get(entry.id)!)
    .filter((group, index, all) => all.findIndex((candidate) => candidate.rootEntry.id === group.rootEntry.id) === index);
}

function countDiscussionEntryReactions(
  workspace: FounderAlignmentWorkbookStepWorkspaceV2,
  entryId: string
) {
  return workspace.reactions.filter((reaction) => reaction.entryId === entryId).length;
}

function buildWorkbookV2Suggestion(params: {
  stepId: PremiumWorkbookV2StepId;
  workspace: FounderAlignmentWorkbookStepWorkspaceV2;
  founderALabel: string;
  founderBLabel: string;
}) {
  const hasFounderA = hasDecisionRulesPerspective(params.workspace, "founderA");
  const hasFounderB = hasDecisionRulesPerspective(params.workspace, "founderB");
  const criticalEntries = params.workspace.entries.filter((entry) => {
    const reactionA = getDecisionRulesReaction(params.workspace, entry.id, "founderA");
    const reactionB = getDecisionRulesReaction(params.workspace, entry.id, "founderB");
    return reactionA === "critical" || reactionB === "critical";
  });
  const sharedEntries = params.workspace.entries.filter((entry) => {
    const reactionA = getDecisionRulesReaction(params.workspace, entry.id, "founderA");
    const reactionB = getDecisionRulesReaction(params.workspace, entry.id, "founderB");
    return (
      reactionA !== "critical" &&
      reactionB !== "critical" &&
      Boolean(reactionA) &&
      Boolean(reactionB)
    );
  });

  if (params.stepId === "vision_direction") {
    const agreement =
      criticalEntries.length > 0
        ? "Wenn Umsatzchance, Produktfokus und Aufbau gleichzeitig ziehen, richtet ihr euch zuerst an eurer gemeinsamen Prioritaet aus. Sobald eine Person eine Chance klar kritisch sieht oder sie euch sichtbar vom Kern wegzieht, verfolgt ihr sie nicht weiter, bevor ihr die Richtung gemeinsam neu prueft."
        : "Wenn Umsatzchance, Produktfokus und Aufbau gleichzeitig ziehen, richtet ihr euch zuerst an eurer gemeinsamen Prioritaet aus. Neue Chancen verfolgt ihr nur weiter, wenn sie klar zu eurer Richtung passen und nicht nur kurzfristig attraktiv wirken.";

    const escalationRule =
      hasFounderA && hasFounderB
        ? `Wenn eine Chance oder Richtungsveraenderung unterschiedlich gelesen wird, stoppt ihr zuerst den Zug zum lauteren Thema und legt fest, wann ${params.founderALabel} und ${params.founderBLabel} die Prioritaet gemeinsam neu pruefen.`
        : "Wenn eine Chance attraktiv wirkt, eure Richtung aber unscharf wird, stoppt ihr sie zuerst und legt direkt fest, wann ihr die Prioritaet gemeinsam neu prueft.";

    const reviewTrigger =
      sharedEntries.length > 0
        ? "Ihr prueft diese Linie neu, wenn wieder zu viele Themen gleichzeitig ziehen, gute Chancen unterschiedlich gelesen werden oder euer Kernfokus unscharf wird."
        : "Ihr prueft diese Linie neu, wenn neue Chancen haeufig zu Richtungswechseln fuehren oder Prioritaeten immer wieder neu verhandelt werden.";

    return {
      agreement,
      escalationRule,
      reviewTrigger,
    };
  }

  if (params.stepId === "roles_responsibility") {
    const agreement =
      criticalEntries.length > 0
        ? "Jedes zentrale Thema hat eine fuehrende Person. Diese Person entscheidet im eigenen Bereich eigenstaendig, macht aber frueh sichtbar, wenn Budget, Timing, Team, Kultur oder die Arbeit der anderen Person betroffen sind."
        : "Jedes zentrale Thema hat eine fuehrende Person. Diese Person entscheidet im eigenen Bereich eigenstaendig und teilt frueh, was fuer die andere Person relevant wird.";

    const escalationRule =
      hasFounderA && hasFounderB
        ? `Wenn Ownership unklar wird oder ein Thema beide Bereiche beruehrt, stoppt ihr stille Weiterarbeit und legt fest, ob ${params.founderALabel}, ${params.founderBLabel} oder ihr beide die Fuehrung fuer den naechsten Schritt uebernehmt.`
        : "Wenn Ownership unklar wird oder ein Thema beide Bereiche beruehrt, stoppt ihr stille Weiterarbeit und legt zuerst die Fuehrung fuer den naechsten Schritt fest.";

    const reviewTrigger =
      sharedEntries.length > 0
        ? "Ihr prueft diese Regel neu, wenn Themen doppelt laufen, Entscheidungen zurueckgeholt werden oder wichtige Arbeit erst spaet sichtbar wird."
        : "Ihr prueft diese Regel neu, wenn unklar bleibt, wer fuehrt, wer mitreden muss oder was frueh geteilt werden sollte.";

    return {
      agreement,
      escalationRule,
      reviewTrigger,
    };
  }

  if (params.stepId === "ownership_risk") {
    const agreement =
      criticalEntries.length > 0
        ? "Bis zur vereinbarten Schwelle fuehrt die verantwortliche Person das Risiko selbst. Sobald eine Person es als nicht mehr allein tragbar einordnet oder Geld, Haftung, Reputation oder Runway beruehrt sind, wird es fuer beide sichtbar und ihr entscheidet gemeinsam ueber Stop, Begrenzung oder den naechsten Schritt."
        : "Bis zur vereinbarten Schwelle fuehrt die verantwortliche Person das Risiko selbst. Sobald die Auswirkung groesser wird oder eine feste Schwelle erreicht ist, macht ihr es frueh fuer beide sichtbar und entscheidet gemeinsam ueber den naechsten Schritt.";

    const escalationRule =
      hasFounderA && hasFounderB
        ? `Wenn ein Risiko unterschiedlich gelesen wird oder eine Schwelle erreicht, stoppt ihr die stille Weiterarbeit, benennt die betroffene Folge und legt fest, ob ${params.founderALabel}, ${params.founderBLabel} oder ihr beide bis wann entscheidet.`
        : "Wenn ein Risiko kritisch wird oder unterschiedlich gelesen bleibt, stoppt ihr die stille Weiterarbeit und legt direkt fest, wer bis wann gemeinsam entscheidet.";

    const reviewTrigger =
      sharedEntries.length > 0
        ? "Ihr prueft diese Regel neu, wenn Risiken zu spaet sichtbar werden, unterschiedlich lange still weiterlaufen oder erst im kritischen Moment gemeinsam entschieden werden."
        : "Ihr prueft diese Regel neu, wenn ein Risiko zu lange bei einer Person bleibt oder erst unter Druck auf den gemeinsamen Tisch kommt.";

    return {
      agreement,
      escalationRule,
      reviewTrigger,
    };
  }

  if (params.stepId === "commitment_load") {
    const agreement =
      criticalEntries.length > 0
        ? "Einsatz und Verfuegbarkeit werden nicht still vorausgesetzt. Jede Person macht frueh sichtbar, wenn Zusagen, Reaktionszeit oder Energie nicht mehr tragbar sind, und ihr entscheidet gemeinsam, was zuerst reduziert oder verschoben wird."
        : "Einsatz und Verfuegbarkeit werden realistisch zugesagt. Wenn Kapazitaet, Reaktionszeit oder Fokus sichtbar kippen, macht die betroffene Person das frueh transparent und ihr prueft gemeinsam die Prioritaeten.";

    const escalationRule =
      hasFounderA && hasFounderB
        ? `Wenn Kapazitaet kippt, sortieren ${params.founderALabel} und ${params.founderBLabel} zuerst die laufenden Prioritaeten neu: was bleibt, was wartet und was aktiv abgesagt oder uebergeben wird.`
        : "Wenn Kapazitaet kippt, sortiert ihr zuerst die laufenden Prioritaeten neu: was bleibt, was wartet und was aktiv abgesagt oder uebergeben wird.";

    const reviewTrigger =
      sharedEntries.length > 0
        ? "Ihr prueft diese Regel neu, wenn Zusagen wiederholt wackeln, Reaktionszeiten unklar werden oder Belastung erst als Frust sichtbar wird."
        : "Ihr prueft diese Regel neu, wenn Verfuegbarkeit, Tempo oder Belastung immer wieder neu verhandelt werden muessen.";

    return {
      agreement,
      escalationRule,
      reviewTrigger,
    };
  }

  if (params.stepId === "values_guardrails") {
    const agreement =
      criticalEntries.length > 0
        ? "Tragbare Kompromisse sind nur solche, die beide bewusst vertreten koennen. Sobald ein Fall eine rote Linie beruehrt oder eine Person ihn nicht mehr mittraegt, stoppt ihr die stille Weiterarbeit und entscheidet gemeinsam, ob ihr ablehnt, begrenzt oder neu verhandelt."
        : "Tragbare Kompromisse sind erlaubt, wenn sie zu eurer Linie passen und beide sie bewusst vertreten koennen. Grenzfaelle werden nicht nebenbei entschieden, sondern klar benannt und gemeinsam freigegeben.";

    const escalationRule =
      hasFounderA && hasFounderB
        ? `Wenn ein wirtschaftlich attraktiver Fall eure Leitplanke beruehrt, entscheiden ${params.founderALabel} und ${params.founderBLabel} nicht still weiter. Ihr benennt zuerst die Grenze, die betroffen ist, und legt dann gemeinsam fest, ob ihr ablehnt, begrenzt oder bewusst freigebt.`
        : "Wenn ein wirtschaftlich attraktiver Fall eure Leitplanke beruehrt, entscheidet ihr nicht still weiter. Ihr benennt zuerst die betroffene Grenze und legt dann gemeinsam fest, ob ihr ablehnt, begrenzt oder bewusst freigebt.";

    const reviewTrigger =
      sharedEntries.length > 0
        ? "Ihr prueft diese Leitplanke neu, wenn Grenzfaelle wiederkehren, Kompromisse still groesser werden oder eine Entscheidung spaeter schwer erklaerbar waere."
        : "Ihr prueft diese Leitplanke neu, wenn wirtschaftlicher Druck eure Grenzen unscharf macht oder Entscheidungen haeufig als Ausnahme begruendet werden.";

    return {
      agreement,
      escalationRule,
      reviewTrigger,
    };
  }

  if (params.stepId === "alignment_90_days") {
    const agreement =
      criticalEntries.length > 0
        ? "In den naechsten 90 Tagen konzentriert ihr eure Energie auf die Punkte, die beide klar tragen. Neue oder strittige Themen laufen nur weiter, wenn ihr bewusst entscheidet, was dafuer reduziert, gestoppt oder verschoben wird."
        : "In den naechsten 90 Tagen konzentriert ihr eure Energie auf die gemeinsame Prioritaet. Neue Themen kommen nur dazu, wenn sie diesen Fokus direkt staerken oder ihr bewusst etwas anderes herausnehmt.";

    const escalationRule =
      hasFounderA && hasFounderB
        ? `Nicht parallel mitlaufen laesst ihr alles, was euren Fokus verwischt oder Kapazitaet bindet, ohne die 90-Tage-Prioritaet zu staerken. Wenn ein neues Thema rein soll, entscheiden ${params.founderALabel} und ${params.founderBLabel} zuerst, was dafuer runtergeht.`
        : "Nicht parallel mitlaufen lasst ihr alles, was euren Fokus verwischt oder Kapazitaet bindet, ohne die 90-Tage-Prioritaet zu staerken. Wenn ein neues Thema rein soll, entscheidet ihr zuerst, was dafuer runtergeht.";

    const reviewTrigger =
      sharedEntries.length > 0
        ? "Ihr prueft den Fortschritt spaetestens nach 90 Tagen und frueher, wenn zu viele Themen parallel ziehen, Fokus verwischt oder Fortschritt nicht mehr sichtbar ist."
        : "Ihr prueft den Fortschritt spaetestens nach 90 Tagen und frueher, wenn Prioritaeten wieder nebeneinander statt nacheinander laufen.";

    return {
      agreement,
      escalationRule,
      reviewTrigger,
    };
  }

  if (params.stepId === "collaboration_conflict") {
    const agreement =
      criticalEntries.length > 0
        ? "Wenn etwas stoert oder kippt, sprecht ihr es frueh und direkt an. Sobald eine Person einen Punkt klar kritisch sieht oder dieselbe Reibung wiederkommt, nehmt ihr ihn aus dem Tagesgeschaeft und klaert ihn in einem eigenen ruhigen Gespraech."
        : "Wenn etwas stoert, sprecht ihr es frueh und direkt an. Wenn im laufenden Austausch keine saubere Klaerung entsteht, legt ihr zeitnah ein eigenes Gespraech dafuer fest.";

    const escalationRule =
      hasFounderA && hasFounderB
        ? `Wenn ein Thema im Alltag nicht geloest wird, benennt ihr noch im selben Termin, was offen ist, und legt fest, wann ${params.founderALabel} und ${params.founderBLabel} es in einem eigenen Klaerungsrahmen besprechen.`
        : "Wenn ein Thema im Alltag nicht sauber geloest wird, nehmt ihr es aus dem laufenden Geschaeft heraus und legt direkt einen festen Klaerungstermin fest.";

    const reviewTrigger =
      sharedEntries.length > 0
        ? "Ihr prueft diese Regel neu, wenn Feedback wieder liegen bleibt, Gespraeche schaerfer werden oder dieselbe Reibung mehrfach auftaucht."
        : "Ihr prueft diese Regel neu, wenn Kritik zu spaet kommt, zwischen den Zeilen landet oder ein Thema mehrfach offen bleibt.";

    return {
      agreement,
      escalationRule,
      reviewTrigger,
    };
  }

  const agreement =
    criticalEntries.length > 0
      ? "Wenn eine Entscheidung im Verantwortungsbereich bleibt, entscheidet die fuehrende Person. Sobald Risiko, Budget oder Aussenwirkung groesser werden oder eine Person einen Punkt klar kritisch sieht, zieht ihr die andere Person sofort dazu und entscheidet bis zu einer festen Frist gemeinsam."
      : "Wenn eine Entscheidung im Verantwortungsbereich bleibt, entscheidet die fuehrende Person. Sobald Risiko, Budget oder Aussenwirkung groesser werden, zieht ihr die andere Person frueh dazu und entscheidet gemeinsam bis zu einer festen Frist.";

  const escalationRule =
    hasFounderA && hasFounderB
      ? `Wenn ihr euch in einer Entscheidung festfahrt, stoppt ihr die Schleife, benennt die offene Frage und legt noch im selben Termin fest, ob ${params.founderALabel}, ${params.founderBLabel} oder ihr beide gemeinsam bis wann entscheidet.`
      : "Wenn eine Entscheidung offen bleibt oder Zeitdruck steigt, stoppt ihr die Schleife sofort und legt eine klare Frist fuer die finale Entscheidung fest.";

  const reviewTrigger =
    sharedEntries.length > 0
      ? "Ihr prueft diese Regel neu, wenn Entscheidungen trotz Regel wieder haengen bleiben, mehrfach zurueckgeholt werden oder Verantwortung unklar wird."
      : "Ihr prueft diese Regel neu, wenn Entscheidungen zu lange offen bleiben oder im Nachgang wieder aufgemacht werden.";

  return {
    agreement,
    escalationRule,
    reviewTrigger,
  };
}

export function FounderAlignmentWorkbookClient({
  invitationId,
  teamContext,
  founderAName,
  founderBName,
  founderAAvatarId,
  founderBAvatarId,
  founderAAvatarUrl,
  founderBAvatarUrl,
  currentUserRole,
  initialWorkbook,
  highlights,
  stepMarkersByStep,
  advisorInvite,
  advisorEntries,
  advisorImpulses,
  showValuesStep,
  canSave,
  persisted,
  updatedAt,
  source,
  storedTeamContext,
  hasTeamContextMismatch,
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
  const [discussionDraftByStep, setDiscussionDraftByStep] = useState<
    Record<FounderAlignmentWorkbookStepId, string>
  >(() =>
    Object.fromEntries(
      FOUNDER_ALIGNMENT_WORKBOOK_STEPS.map((step) => [step.id, ""])
    ) as Record<FounderAlignmentWorkbookStepId, string>
  );
  const [discussionDraftSourceEntryIdByStep, setDiscussionDraftSourceEntryIdByStep] = useState<
    Partial<Record<FounderAlignmentWorkbookStepId, string | null>>
  >({});
  const [discussionOpenThreadByStep, setDiscussionOpenThreadByStep] = useState<
    Partial<Record<FounderAlignmentWorkbookStepId, string | null>>
  >({});
  const [workbookV2OpenPhaseByStep, setWorkbookV2OpenPhaseByStep] = useState<
    Partial<Record<FounderAlignmentWorkbookStepId, WorkbookV2Phase>>
  >({});
  const [advisorInviteState, setAdvisorInviteState] =
    useState<FounderAlignmentWorkbookAdvisorInviteState>(advisorInvite);
  const [advisorEntriesState, setAdvisorEntriesState] =
    useState<FounderAlignmentWorkbookAdvisorEntry[]>(advisorEntries);
  const [advisorProposalName, setAdvisorProposalName] = useState("");
  const [advisorProposalEmail, setAdvisorProposalEmail] = useState("");
  const effectiveStepMarkersByStep = useMemo<WorkbookStepMarkersByStep>(
    () =>
      stepMarkersByStep ??
      Object.fromEntries(
        WORKBOOK_STRUCTURED_STEP_IDS.map((stepId) => [
          stepId,
          {
            stepId,
            dimension:
              FOUNDER_ALIGNMENT_WORKBOOK_STEPS.find((step) => step.id === stepId)?.reportDimensions[0] ??
              stepId,
            markerClass: "stable_base",
          },
        ])
      ),
    [stepMarkersByStep]
  );
  const [advisorInviteMessage, setAdvisorInviteMessage] = useState<string | null>(null);
  const [advisorInviteLink, setAdvisorInviteLink] = useState<string | null>(null);
  const [isAdvisorActionPending, startAdvisorActionTransition] = useTransition();
  const currentStepRef = useRef<HTMLElement | null>(null);
  const discussionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  const founderAvatarByAuthor = useMemo(
    () => ({
      founderA: {
        displayName: founderALabel,
        avatarId: founderAAvatarId,
        imageUrl: founderAAvatarUrl,
      },
      founderB: {
        displayName: founderBLabel,
        avatarId: founderBAvatarId,
        imageUrl: founderBAvatarUrl,
      },
    }),
    [
      founderALabel,
      founderAAvatarId,
      founderAAvatarUrl,
      founderBLabel,
      founderBAvatarId,
      founderBAvatarUrl,
    ]
  );
  const advisorLabel =
    workbook.advisorName?.trim() ||
    advisorInviteState.advisorName?.trim() ||
    advisorEntriesState[0]?.advisorName?.trim() ||
    "Advisor";
  const currentVisualTone = workbookStepVisualTone(currentStep.id);
  const currentToneMeta = workbookToneMeta(currentVisualTone);
  const currentStepIsPrioritized = highlights.prioritizedStepIds.includes(currentStep.id);
  const currentStepIsPremiumPilot = isPremiumWorkbookV2StepId(currentStep.id);
  const currentPremiumV2StepId: PremiumWorkbookV2StepId | null = currentStepIsPremiumPilot
    ? (currentStep.id as PremiumWorkbookV2StepId)
    : null;
  const currentPremiumV2Config =
    currentPremiumV2StepId != null ? PREMIUM_WORKBOOK_V2_CONFIG[currentPremiumV2StepId] : null;
  const currentPremiumV2IsLight =
    currentPremiumV2StepId != null && LIGHT_PREMIUM_WORKBOOK_V2_STEP_IDS.includes(currentPremiumV2StepId);
  const currentPremiumV2SignalOptions =
    currentPremiumV2Config?.signalOptions ?? DISCUSSION_SIGNAL_OPTIONS;
  const isAdvisorViewer = currentUserRole === "advisor";
  const currentPremiumV2InsightCopy = {
    sharedTitle: currentPremiumV2Config?.sharedInsightTitle ?? "Gemeinsam getragen",
    sharedText: currentPremiumV2Config?.sharedInsightText ?? "Punkte, die fuer euch beide klar passen.",
    pendingTitle: currentPremiumV2Config?.pendingInsightTitle ?? "Einseitig wichtig",
    pendingText: currentPremiumV2Config?.pendingInsightText ?? "Punkte, die vor allem einer Person wichtig sind.",
    criticalTitle: currentPremiumV2Config?.criticalInsightTitle ?? "Offen oder kritisch",
    criticalText: currentPremiumV2Config?.criticalInsightText ?? "Punkte, bei denen ihr bewusst klaeren muesst.",
  };
  const showAdvisorInviteCard =
    currentUserRole === "founderA" ||
    currentUserRole === "founderB" ||
    advisorEntriesState.length > 0 ||
    advisorInviteState.founderAApproved ||
    advisorInviteState.founderBApproved ||
    advisorInviteState.advisorLinked;
  const progress = ((Math.max(currentIndex, 0) + 1) / visibleSteps.length) * 100;
  const currentStepContent = WORKBOOK_STEP_CONTENT[currentStep.id];
  const currentStepIsAdvisorClosing = currentStep.id === "advisor_closing";
  const advisorClosingHasAdvisorInput =
    workbook.advisorClosing.observations.trim().length > 0 ||
    workbook.advisorClosing.questions.trim().length > 0 ||
    workbook.advisorClosing.nextSteps.trim().length > 0;
  const advisorClosingHasCoreInput =
    workbook.advisorClosing.observations.trim().length > 0 &&
    workbook.advisorClosing.nextSteps.trim().length > 0;
  const advisorClosingAdvisorStatusLabel = advisorClosingHasCoreInput
    ? "Advisor-Impuls liegt vor"
    : advisorClosingHasAdvisorInput
      ? "Advisor-Impuls in Arbeit"
      : "Advisor-Impuls offen";
  const advisorClosingAdvisorStatusClassName = advisorClosingHasCoreInput
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : advisorClosingHasAdvisorInput
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-white text-slate-500";
  const advisorClosingHasFounderReaction =
    workbook.founderReaction.status !== null || workbook.founderReaction.comment.trim().length > 0;
  const advisorClosingFounderReactionLabel =
    workbook.founderReaction.status != null
      ? founderReactionStatusLabel(workbook.founderReaction.status)
      : "Noch keine Team-Reaktion";
  const founderAAdvisorApproved = advisorInviteState.founderAApproved;
  const founderBAdvisorApproved = advisorInviteState.founderBApproved;
  const advisorApprovalCount =
    Number(founderAAdvisorApproved) + Number(founderBAdvisorApproved);
  const advisorBothFoundersApproved = founderAAdvisorApproved && founderBAdvisorApproved;
  const viewerFounderApproved =
    currentUserRole === "founderA"
      ? founderAAdvisorApproved
      : currentUserRole === "founderB"
        ? founderBAdvisorApproved
        : false;
  const otherFounderAdvisorLabel =
    currentUserRole === "founderA"
      ? founderBLabel
      : currentUserRole === "founderB"
        ? founderALabel
        : "die andere Person";
  const advisorAccessState =
    advisorInviteState.advisorLinked && !advisorBothFoundersApproved
      ? "paused"
      : advisorInviteState.advisorLinked
        ? "active"
        : advisorBothFoundersApproved
          ? "ready"
          : advisorApprovalCount > 0
            ? "waiting"
            : "idle";
  const advisorAccessMeta =
    advisorAccessState === "active"
      ? {
          badge: "Advisor freigegeben",
          badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
          title: `${advisorLabel} kann jetzt mitlesen und eigene Hinweise ergänzen`,
          description:
            "Beide Founder haben freigegeben. Der Advisor sieht das Workbook und den zugehörigen Report, bearbeitet aber nur die vorgesehenen Advisor-Bereiche.",
        }
      : advisorAccessState === "ready"
        ? {
            badge: "Freigabe liegt vor",
            badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
            title: "Beide Founder haben zugestimmt",
            description:
              "Der Zugriff wird aktiv, sobald der Advisor den Einladungslink nutzt. Bis dahin bleibt der Arbeitsraum unverändert.",
          }
        : advisorAccessState === "waiting"
          ? {
              badge: "Wartet auf zweite Zustimmung",
              badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
              title: "Eine Zustimmung allein reicht noch nicht",
              description: `Der Advisor bleibt blockiert, bis ${otherFounderAdvisorLabel} ebenfalls freigibt.`,
            }
          : advisorAccessState === "paused"
            ? {
                badge: "Zugriff pausiert",
                badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
                title: "Der Advisor bleibt verknüpft, hat aber aktuell keinen Zugriff",
                description:
                  "Mindestens eine Freigabe ist nicht mehr aktiv. Der Advisor kann erst wieder arbeiten, wenn beide Founder erneut freigegeben haben.",
              }
            : {
                badge: "Noch nicht freigegeben",
                badgeClassName: "border-slate-200 bg-white text-slate-600",
                title: "Optional eine externe Begleitung freigeben",
                description:
                  "Wenn ihr eine dritte Perspektive einbinden wollt, gebt den Zugriff bewusst gemeinsam frei. Vorher bleibt der Advisor vollständig blockiert.",
              };
  const advisorActionLabel =
    advisorAccessState === "ready"
      ? "Einladungslink erstellen"
      : advisorAccessState === "paused" && !viewerFounderApproved
        ? "Freigabe erneut erteilen"
        : advisorAccessState === "idle"
          ? "Freigabe starten"
          : "Freigabe erteilen";
  const showAdvisorApprovalButton =
    (currentUserRole === "founderA" || currentUserRole === "founderB") &&
    (
      advisorAccessState === "idle" ||
      advisorAccessState === "ready" ||
      (!viewerFounderApproved && (advisorAccessState === "waiting" || advisorAccessState === "paused"))
    );
  const currentStepHasStructuredOutputs = isWorkbookStructuredStepId(currentStep.id);
  const currentStructuredStepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing"> | null =
    currentStepHasStructuredOutputs
      ? (currentStep.id as Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">)
      : null;
  const currentStepMarker =
    currentStructuredStepId != null ? effectiveStepMarkersByStep[currentStructuredStepId] ?? null : null;
  const currentStepImpulseContent = useMemo(
    () =>
      currentPremiumV2StepId
        ? buildWorkbookStepImpulseContent(
            currentPremiumV2StepId,
            currentStepMarker?.markerClass ?? null
          )
        : null,
    [currentPremiumV2StepId, currentStepMarker?.markerClass]
  );
  const currentStepEntry = workbook.steps[currentStep.id];
  const currentStepStructuredOutputs = getWorkbookStepStructuredOutputs(currentStepEntry, currentStep.id);
  const currentStepMissingStructuredKeys =
    currentStructuredStepId != null && currentStepMarker
      ? getMissingWorkbookStructuredOutputKeys(
          currentStructuredStepId,
          currentStepStructuredOutputs,
          currentStepMarker.markerClass
        )
      : [];
  const currentStepStructuredRequiredKeys =
    currentStructuredStepId != null && currentStepMarker
      ? getWorkbookRequiredStructuredOutputKeys(currentStructuredStepId, currentStepMarker.markerClass)
      : [];
  const currentStepStructuredReady = currentStepMissingStructuredKeys.length === 0;
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
  const decisionRulesWorkspace = useMemo(
    () =>
      currentStepIsPremiumPilot
        ? resolveDecisionRulesWorkspace(currentStepEntry)
        : null,
    [currentStepEntry, currentStepIsPremiumPilot]
  );
  const shouldHydrateLegacyDecisionRulesWorkspace =
    currentStepIsPremiumPilot &&
    !currentStepEntry.workspaceV2 &&
    (currentStepEntry.founderA.trim().length > 0 || currentStepEntry.founderB.trim().length > 0);
  const currentDiscussionDraft = discussionDraftByStep[currentStep.id] ?? "";
  const currentDiscussionDraftSourceEntryId =
    discussionDraftSourceEntryIdByStep[currentStep.id] ?? null;
  const currentDiscussionDraftSourceEntry =
    currentDiscussionDraftSourceEntryId && decisionRulesWorkspace
      ? decisionRulesWorkspace.entries.find((entry) => entry.id === currentDiscussionDraftSourceEntryId) ?? null
      : null;
  const hasDecisionRulesFounderAPerspective = decisionRulesWorkspace
    ? hasDecisionRulesPerspective(decisionRulesWorkspace, "founderA")
    : false;
  const hasDecisionRulesFounderBPerspective = decisionRulesWorkspace
    ? hasDecisionRulesPerspective(decisionRulesWorkspace, "founderB")
    : false;
  const hasDecisionRulesBothPerspectives =
    hasDecisionRulesFounderAPerspective && hasDecisionRulesFounderBPerspective;
  const decisionRulesSuggestion = useMemo(
    () =>
      decisionRulesWorkspace && currentPremiumV2StepId
        ? buildWorkbookV2Suggestion({
            stepId: currentPremiumV2StepId,
            workspace: decisionRulesWorkspace,
            founderALabel,
            founderBLabel,
          })
        : null,
    [decisionRulesWorkspace, currentPremiumV2StepId, founderALabel, founderBLabel]
  );
  const decisionRulesThreadGroups = useMemo(
    () => (decisionRulesWorkspace ? buildDiscussionThreadGroups(decisionRulesWorkspace) : []),
    [decisionRulesWorkspace]
  );
  const decisionRulesMatchingHint =
    currentPremiumV2StepId != null
      ? buildWorkbookV2MatchingHint(currentPremiumV2StepId, currentStepMarker?.markerClass ?? null)
      : "";
  const decisionRulesEscalationValue =
    currentStepStructuredOutputs?.escalationRule?.trim() ?? "";
  const decisionRulesReviewTriggerValue =
    currentStepStructuredOutputs?.reviewTrigger?.trim() ?? "";
  const decisionRulesHasEntries = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.length > 0
    : false;
  const decisionRulesFounderAWeightingComplete = decisionRulesWorkspace
    ? hasDecisionRulesWeightingForAllEntries(decisionRulesWorkspace, "founderA")
    : false;
  const decisionRulesFounderBWeightingComplete = decisionRulesWorkspace
    ? hasDecisionRulesWeightingForAllEntries(decisionRulesWorkspace, "founderB")
    : false;
  const decisionRulesWeightingReady =
    decisionRulesHasEntries &&
    hasDecisionRulesBothPerspectives &&
    decisionRulesFounderAWeightingComplete &&
    decisionRulesFounderBWeightingComplete;
  const decisionRulesRuleReady =
    decisionRulesWeightingReady &&
    currentStepEntry.agreement.trim().length > 0 &&
    decisionRulesEscalationValue.trim().length > 0 &&
    (!currentPremiumV2Config?.requireReviewForApproval ||
      decisionRulesReviewTriggerValue.trim().length > 0) &&
    hasDecisionRulesBothPerspectives;
  const currentDecisionRulesPhase: WorkbookV2Phase =
    !hasDecisionRulesBothPerspectives
      ? "collect"
      : !decisionRulesWeightingReady
        ? "weight"
        : !decisionRulesRuleReady
          ? "rule"
          : "approval";
  const requestedWorkbookV2Phase = workbookV2OpenPhaseByStep[activeStepId] ?? null;
  const canShowRequestedWorkbookV2Phase =
    requestedWorkbookV2Phase === "collect" ||
    (requestedWorkbookV2Phase === "weight" && hasDecisionRulesBothPerspectives) ||
    (requestedWorkbookV2Phase === "rule" && decisionRulesWeightingReady) ||
    (requestedWorkbookV2Phase === "approval" && decisionRulesRuleReady);
  const visibleWorkbookV2Phase =
    requestedWorkbookV2Phase && canShowRequestedWorkbookV2Phase
      ? requestedWorkbookV2Phase
      : currentDecisionRulesPhase;
  const currentDiscussionDraftSourceRootEntryId =
    currentDiscussionDraftSourceEntryId && decisionRulesWorkspace
      ? resolveDiscussionRootEntryId(decisionRulesWorkspace, currentDiscussionDraftSourceEntryId)
      : null;
  const defaultDiscussionOpenThreadId = currentDiscussionDraftSourceRootEntryId
    ?? (
      visibleWorkbookV2Phase === "weight"
        ? decisionRulesThreadGroups.find((group) => {
            const threadEntries = [group.rootEntry, ...group.childEntries];
            return threadEntries.some((entry) => {
              const reactionA = getDecisionRulesReaction(decisionRulesWorkspace!, entry.id, "founderA");
              const reactionB = getDecisionRulesReaction(decisionRulesWorkspace!, entry.id, "founderB");
              return reactionA === null || reactionB === null;
            });
          })?.rootEntry.id ?? null
        : null
    )
    ?? (decisionRulesThreadGroups.length === 1 ? decisionRulesThreadGroups[0]?.rootEntry.id ?? null : null);
  const requestedDiscussionOpenThreadId = discussionOpenThreadByStep[currentStep.id] ?? null;
  const visibleDiscussionOpenThreadId =
    requestedDiscussionOpenThreadId &&
    decisionRulesThreadGroups.some((group) => group.rootEntry.id === requestedDiscussionOpenThreadId)
      ? requestedDiscussionOpenThreadId
      : defaultDiscussionOpenThreadId;
  const showWorkbookV2WeightPreview =
    visibleWorkbookV2Phase === "rule" || visibleWorkbookV2Phase === "approval";
  const showWorkbookV2RulePreview = visibleWorkbookV2Phase === "approval";
  const workbookV2SharedSpaceHint =
    currentUserRole === "founderA" || currentUserRole === "founderB"
      ? isCollaborativeMode
        ? "Ihr arbeitet im selben Raum. Eigene Punkte bleiben editierbar, fremde Punkte koennt ihr einordnen, ergaenzen oder als Basis fuer einen eigenen Punkt nutzen."
        : "Du startest mit deinem ersten Stand im gemeinsamen Raum. Die andere Person sieht ihn hier, ordnet ihn spaeter ein und ergaenzt eigene Punkte mit eigener Autorenschaft."
      : "Beide Founder arbeiten hier im selben Raum. Punkte bleiben pro Person sichtbar und werden gemeinsam zur Vereinbarung verdichtet.";
  const workbookV2WeightingHint =
    currentUserRole === "founderA" || currentUserRole === "founderB"
      ? "Ordnet jeden Punkt klar ein. Fremde Punkte bleiben unveraendert; wenn ihr darauf aufbauen wollt, macht daraus einen eigenen Punkt."
      : "Hier wird sichtbar, welche Punkte beide tragen, was nur eine Person stark sieht und wo noch Klaerung noetig ist.";
  const decisionRulesSharedCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return (
          reactionA !== "critical" &&
          reactionB !== "critical" &&
          Boolean(reactionA) &&
          Boolean(reactionB)
        );
      }).length
    : 0;
  const decisionRulesCriticalCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return reactionA === "critical" || reactionB === "critical";
      }).length
    : 0;
  const decisionRulesImportantSinglesCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return (
          (reactionA === "important" || reactionA === "agree" || reactionA === "critical") !==
          (reactionB === "important" || reactionB === "agree" || reactionB === "critical")
        );
      }).length
    : 0;
  const decisionRulesFounderAOpenWeightingCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter(
        (entry) => getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA") === null
      ).length
    : 0;
  const decisionRulesFounderBOpenWeightingCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter(
        (entry) => getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB") === null
      ).length
    : 0;
  const decisionRulesPendingWeightingCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return reactionA === null || reactionB === null;
      }).length
    : 0;
  const workbookV2PriorityCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return reactionA === "important" && reactionB === "important";
      }).length
    : 0;
  const workbookV2DeferredCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return reactionA === "agree" && reactionB === "agree";
      }).length
    : 0;
  const workbookV2GuardrailTragbarCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return reactionA === "agree" && reactionB === "agree";
      }).length
    : 0;
  const workbookV2GuardrailCaseCount = decisionRulesWorkspace
    ? decisionRulesWorkspace.entries.filter((entry) => {
        const reactionA = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderA");
        const reactionB = getDecisionRulesReaction(decisionRulesWorkspace, entry.id, "founderB");
        return (
          reactionA !== "critical" &&
          reactionB !== "critical" &&
          (reactionA === "important" || reactionB === "important")
        );
      }).length
    : 0;
  const workbookV2SharedInsightCount =
    currentPremiumV2Config?.insightCountMode === "alignment"
      ? workbookV2PriorityCount
      : currentPremiumV2Config?.insightCountMode === "guardrails"
        ? workbookV2GuardrailTragbarCount
      : decisionRulesSharedCount;
  const workbookV2PendingInsightCount =
    currentPremiumV2Config?.insightCountMode === "alignment"
      ? workbookV2DeferredCount
      : currentPremiumV2Config?.insightCountMode === "guardrails"
        ? workbookV2GuardrailCaseCount
      : currentPremiumV2Config?.pendingInsightTitle
        ? decisionRulesPendingWeightingCount
        : decisionRulesImportantSinglesCount;
  const currentStepStatus = deriveWorkbookStepStatus(
    currentStep.id,
    currentStepEntry,
    currentStepMarker?.markerClass ?? null
  );
  const currentAgreementDraft = useMemo(() => {
    if (currentStepIsAdvisorClosing || !hasAnyPerspectiveInput) {
      return null;
    }

    return buildAgreementDraft({
      stepId: currentStep.id,
      founderAResponse: currentStepEntry.founderA,
      founderBResponse: currentStepEntry.founderB,
      sourceMode: hasBothPerspectives ? "joint" : "solo",
      structuredOutputs: currentStepStructuredOutputs,
      teamContext,
      markerClass: currentStepMarker?.markerClass ?? null,
    });
  }, [
    currentStep.id,
    currentStepIsAdvisorClosing,
    hasAnyPerspectiveInput,
    hasBothPerspectives,
    currentStepEntry,
    currentStepMarker?.markerClass,
    currentStepStructuredOutputs,
    teamContext,
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
          const structuredStepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing"> | null =
            isWorkbookStructuredStepId(step.id)
              ? (step.id as Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">)
              : null;
          const stepMarker = structuredStepId != null ? effectiveStepMarkersByStep[structuredStepId] : null;
          const status = deriveWorkbookStepStatus(step.id, stepEntry, stepMarker?.markerClass ?? null);
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
          const hasAdvisorClosingCoreContent =
            step.id === "advisor_closing"
              ? workbook.advisorClosing.observations.trim().length > 0 &&
                workbook.advisorClosing.nextSteps.trim().length > 0
              : false;
          const completed = step.id === "advisor_closing" ? hasAdvisorClosingCoreContent : status === "finalized";
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
      effectiveStepMarkersByStep,
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
    advisorInviteState.advisorLinked ||
    currentUserRole === "advisor" ||
    workbook.steps[currentStep.id].advisorNotes.trim().length > 0;
  const workbookSummaryItems = useMemo(
    () =>
      visibleSteps.map((step) => {
        return {
          id: step.id,
          title: step.title,
          agreement: workbook.steps[step.id].agreement.trim(),
          structuredOutputs: isWorkbookStructuredStepId(step.id)
            ? getWorkbookStepStructuredOutputs(workbook.steps[step.id], step.id)
            : null,
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
    if (!shouldHydrateLegacyDecisionRulesWorkspace || !decisionRulesWorkspace) {
      return;
    }

    setWorkbook((current) => {
      if (!currentPremiumV2StepId) {
        return current;
      }

      const stepEntry = current.steps[currentPremiumV2StepId];
      if (stepEntry.workspaceV2) {
        return current;
      }

      return {
        ...current,
        steps: {
          ...current.steps,
          [currentPremiumV2StepId]: {
            ...stepEntry,
            workspaceV2: decisionRulesWorkspace,
          },
        },
      };
    });

    setSaveState((current) => ({
      ...current,
      kind: canSave ? "dirty" : current.kind,
      message: canSave ? t("Aenderungen werden gleich gesichert") : current.message,
    }));
  }, [canSave, currentPremiumV2StepId, decisionRulesWorkspace, shouldHydrateLegacyDecisionRulesWorkspace]);

  useEffect(() => {
    if (!shouldScrollToStepRef.current) return;

    shouldScrollToStepRef.current = false;
    const target = currentStepRef.current;
    if (!target) return;

    const frameId = window.requestAnimationFrame(() => {
      const top = window.scrollY + target.getBoundingClientRect().top - 104;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
      target.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
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
      return currentUserRole === "founderA";
    }

    if (field === "founderB") {
      return currentUserRole === "founderB";
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

  function updateWorkspaceV2(
    workspace: FounderAlignmentWorkbookStepWorkspaceV2 | undefined
  ) {
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
          workspaceV2: workspace,
          founderAApproved: false,
          founderBApproved: false,
        },
      },
    }));
  }

  function setDiscussionDraft(value: string) {
    setDiscussionDraftByStep((current) => ({
      ...current,
      [activeStepId]: value,
    }));
    if (value.trim().length === 0) {
      setDiscussionDraftSourceEntryIdByStep((current) => ({
        ...current,
        [activeStepId]: null,
      }));
    }
  }

  function openWorkbookV2Phase(phase: WorkbookV2Phase) {
    setWorkbookV2OpenPhaseByStep((current) => ({
      ...current,
      [activeStepId]: phase,
    }));
  }

  function setDiscussionOpenThread(rootEntryId: string | null) {
    setDiscussionOpenThreadByStep((current) => ({
      ...current,
      [activeStepId]: rootEntryId,
    }));
  }

  function toggleDiscussionOpenThread(rootEntryId: string) {
    setDiscussionOpenThreadByStep((current) => ({
      ...current,
      [activeStepId]: current[activeStepId] === rootEntryId ? null : rootEntryId,
    }));
  }

  function useDecisionRulesDiscussionEntryAsDraft(entry: FounderAlignmentWorkbookDiscussionEntry) {
    if (
      !isPremiumWorkbookV2StepId(activeStepId) ||
      (currentUserRole !== "founderA" && currentUserRole !== "founderB") ||
      entry.createdBy === currentUserRole
    ) {
      return;
    }

    const baseContent = entry.content.trim();
    if (!baseContent) {
      return;
    }

    setDiscussionDraft(baseContent);
    setDiscussionDraftSourceEntryIdByStep((current) => ({
      ...current,
      [activeStepId]: entry.id,
    }));
    if (decisionRulesWorkspace) {
      setDiscussionOpenThread(resolveDiscussionRootEntryId(decisionRulesWorkspace, entry.id));
    }
    openWorkbookV2Phase("collect");
  }

  function focusDiscussionDraftField() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!discussionTextareaRef.current) return;
        discussionTextareaRef.current.focus();
        const valueLength = discussionTextareaRef.current.value.length;
        discussionTextareaRef.current.setSelectionRange(valueLength, valueLength);
        discussionTextareaRef.current.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      });
    });
  }

  function useWorkbookImpulseAsDraft(prompt: string) {
    if (
      !isPremiumWorkbookV2StepId(activeStepId) ||
      (currentUserRole !== "founderA" && currentUserRole !== "founderB")
    ) {
      return;
    }

    const nextPrompt = prompt.trim();
    if (!nextPrompt) {
      return;
    }

    const nextDraft = currentDiscussionDraft.trim().length
      ? currentDiscussionDraft.includes(nextPrompt)
        ? currentDiscussionDraft
        : `${currentDiscussionDraft.trim()}\n\n${nextPrompt}`
      : nextPrompt;

    setDiscussionDraft(nextDraft);
    setDiscussionDraftSourceEntryIdByStep((current) => ({
      ...current,
      [activeStepId]: null,
    }));
    setDiscussionOpenThread(null);
    setHelperOpenByStep((current) => ({
      ...current,
      [activeStepId]: false,
    }));
    openWorkbookV2Phase("collect");
    focusDiscussionDraftField();
  }

  function addDecisionRulesDiscussionEntry() {
    if (
      !isPremiumWorkbookV2StepId(activeStepId) ||
      !decisionRulesWorkspace ||
      (currentUserRole !== "founderA" && currentUserRole !== "founderB")
    ) {
      return;
    }

    const content = currentDiscussionDraft.trim();
    if (!content) {
      return;
    }

    const nextEntryId = createDiscussionEntryId();
    const sourceEntryId =
      currentDiscussionDraftSourceEntryId &&
      decisionRulesWorkspace.entries.some((entry) => entry.id === currentDiscussionDraftSourceEntryId)
        ? currentDiscussionDraftSourceEntryId
        : null;
    const nextOpenThreadId = sourceEntryId
      ? resolveDiscussionRootEntryId(decisionRulesWorkspace, sourceEntryId)
      : nextEntryId;

    updateWorkspaceV2({
      ...decisionRulesWorkspace,
      entries: [
        ...decisionRulesWorkspace.entries,
        {
          id: nextEntryId,
          content,
          createdBy: currentUserRole,
          createdAt: new Date().toISOString(),
          sourceEntryId,
          updatedAt: null,
          updatedBy: null,
        },
      ],
    });
    setDiscussionOpenThread(nextOpenThreadId);
    setDiscussionDraft("");
    setDiscussionDraftSourceEntryIdByStep((current) => ({
      ...current,
      [activeStepId]: null,
    }));
  }

  function updateDecisionRulesDiscussionEntry(entryId: string, content: string) {
    if (
      !isPremiumWorkbookV2StepId(activeStepId) ||
      !decisionRulesWorkspace ||
      (currentUserRole !== "founderA" && currentUserRole !== "founderB")
    ) {
      return;
    }

    setDiscussionOpenThread(resolveDiscussionRootEntryId(decisionRulesWorkspace, entryId));

    updateWorkspaceV2({
      ...decisionRulesWorkspace,
      entries: decisionRulesWorkspace.entries.map((entry) =>
        entry.id === entryId && entry.createdBy === currentUserRole
          ? {
              ...entry,
              content,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUserRole,
            }
          : entry
      ),
      reactions: decisionRulesWorkspace.reactions.filter((reaction) => reaction.entryId !== entryId),
    });
  }

  function removeDecisionRulesDiscussionEntry(entryId: string) {
    if (
      !isPremiumWorkbookV2StepId(activeStepId) ||
      !decisionRulesWorkspace ||
      (currentUserRole !== "founderA" && currentUserRole !== "founderB")
    ) {
      return;
    }

    const entry = decisionRulesWorkspace.entries.find((item) => item.id === entryId);
    if (!entry || entry.createdBy !== currentUserRole) {
      return;
    }

    const removedRootId = resolveDiscussionRootEntryId(decisionRulesWorkspace, entryId);

    updateWorkspaceV2({
      ...decisionRulesWorkspace,
      entries: decisionRulesWorkspace.entries.filter((item) => item.id !== entryId),
      reactions: decisionRulesWorkspace.reactions.filter((reaction) => reaction.entryId !== entryId),
    });
    setDiscussionOpenThreadByStep((current) =>
      current[activeStepId] === removedRootId
        ? {
            ...current,
            [activeStepId]: null,
          }
        : current
    );
  }

  function updateDecisionRulesReaction(
    entryId: string,
    signal: FounderAlignmentWorkbookDiscussionSignal
  ) {
    if (
      !isPremiumWorkbookV2StepId(activeStepId) ||
      !decisionRulesWorkspace ||
      (currentUserRole !== "founderA" && currentUserRole !== "founderB")
    ) {
      return;
    }

    const existingReaction = decisionRulesWorkspace.reactions.find(
      (reaction) => reaction.entryId === entryId && reaction.userId === currentUserRole
    );
    const nextReactions = decisionRulesWorkspace.reactions.filter(
      (reaction) => !(reaction.entryId === entryId && reaction.userId === currentUserRole)
    );
    setDiscussionOpenThread(resolveDiscussionRootEntryId(decisionRulesWorkspace, entryId));

    updateWorkspaceV2({
      ...decisionRulesWorkspace,
      reactions:
        existingReaction?.signal === signal
          ? nextReactions
          : [
              ...nextReactions,
              {
                entryId,
                userId: currentUserRole,
                signal,
                updatedAt: new Date().toISOString(),
              },
            ],
    });
  }

  function updateDecisionRulesAgreement(value: string) {
    const nextStructuredOutputs = sanitizeWorkbookStructuredOutputsByStep(activeStepId, {
      ...(currentStepEntry.structuredOutputs ?? {}),
      [activeStepId]: {
        ...(getWorkbookStepStructuredOutputs(currentStepEntry, activeStepId) ?? {}),
        operatingRule: value,
      },
    });

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
          agreement: value,
          structuredOutputs: nextStructuredOutputs,
          founderAApproved: false,
          founderBApproved: false,
        },
      },
    }));
  }

  function applyDecisionRulesSuggestion() {
    if (!decisionRulesSuggestion) {
      return;
    }

    const nextStructuredOutputs = sanitizeWorkbookStructuredOutputsByStep(activeStepId, {
      ...(currentStepEntry.structuredOutputs ?? {}),
      [activeStepId]: {
        ...(getWorkbookStepStructuredOutputs(currentStepEntry, activeStepId) ?? {}),
        operatingRule: decisionRulesSuggestion.agreement,
        escalationRule: decisionRulesSuggestion.escalationRule,
        reviewTrigger: decisionRulesSuggestion.reviewTrigger,
      },
    });

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
          agreement: decisionRulesSuggestion.agreement,
          structuredOutputs: nextStructuredOutputs,
          founderAApproved: false,
          founderBApproved: false,
        },
      },
    }));
  }

  function canEditStructuredOutputs() {
    return currentUserRole === "founderA" || currentUserRole === "founderB";
  }

  function updateStructuredOutput(field: string, value: string) {
    if (!currentStepHasStructuredOutputs || !canEditStructuredOutputs()) {
      return;
    }

    const nextStructuredOutputs = sanitizeWorkbookStructuredOutputsByStep(activeStepId, {
      ...(currentStepEntry.structuredOutputs ?? {}),
      [activeStepId]: {
        ...(getWorkbookStepStructuredOutputs(currentStepEntry, activeStepId) ?? {}),
        [field]: value,
      },
    });

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
          structuredOutputs: nextStructuredOutputs,
          founderAApproved: false,
          founderBApproved: false,
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
          ? t("Deine Freigabe ist erfasst. Zugriff entsteht erst, wenn Founder B ebenfalls zustimmt.")
          : t("Deine Freigabe ist erfasst. Zugriff entsteht erst, wenn Founder A ebenfalls zustimmt.")
      );
      return;
    }

    if (result.status === "advisor_linked") {
      setAdvisorInviteLink(null);
      setAdvisorInviteMessage(
        t(`Advisor aktiv: ${result.advisorName ?? "Advisor"}. Der Zugriff auf die Advisor-Bereiche ist jetzt freigegeben.`)
      );
      return;
    }

    if (typeof window !== "undefined") {
      const absoluteInviteUrl = toPublicAppUrl(result.inviteUrl, window.location.origin);
      setAdvisorInviteLink(absoluteInviteUrl);
      try {
        await navigator.clipboard.writeText(absoluteInviteUrl);
        setAdvisorInviteMessage(
          t("Beide Founder haben freigegeben. Der Einladungslink wurde erstellt und in die Zwischenablage kopiert.")
        );
      } catch {
        setAdvisorInviteMessage(
          t("Beide Founder haben freigegeben. Der Einladungslink wurde erstellt und kann jetzt weitergegeben werden.")
        );
      }
      return;
    }

    setAdvisorInviteLink(result.inviteUrl);
  }

  function syncAdvisorAggregate(nextEntries: FounderAlignmentWorkbookAdvisorEntry[]) {
    setAdvisorEntriesState(nextEntries);
    setAdvisorInviteState({
      founderAApproved: nextEntries.some((entry) => entry.founderAApproved),
      founderBApproved: nextEntries.some((entry) => entry.founderBApproved),
      advisorLinked: nextEntries.some((entry) => entry.status === "linked"),
      advisorName:
        nextEntries.find((entry) => entry.status === "linked")?.advisorName ??
        nextEntries[0]?.advisorName ??
        null,
    });
  }

  function upsertAdvisorEntry(nextEntry: FounderAlignmentWorkbookAdvisorEntry) {
    const nextEntries = [nextEntry, ...advisorEntriesState.filter((entry) => entry.id !== nextEntry.id)]
      .sort((left, right) => {
        const statusOrder: Record<FounderAlignmentWorkbookAdvisorEntry["status"], number> = {
          pending: 0,
          approved: 1,
          invited: 2,
          linked: 3,
          revoked: 4,
        };
        const statusDiff = statusOrder[left.status] - statusOrder[right.status];
        if (statusDiff !== 0) return statusDiff;
        return (left.advisorName ?? left.advisorEmail ?? "").localeCompare(
          right.advisorName ?? right.advisorEmail ?? "",
          "de"
        );
      });
    syncAdvisorAggregate(nextEntries);
  }

  function statusMetaForAdvisorEntry(entry: FounderAlignmentWorkbookAdvisorEntry) {
    if (entry.status === "linked") {
      return {
        label: "Aktiv",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        description: "Advisor ist verknüpft und kann im freigegebenen Kontext arbeiten.",
      };
    }
    if (entry.status === "invited") {
      return {
        label: "Eingeladen",
        className: "border-sky-200 bg-sky-50 text-sky-700",
        description: "Die Einladung wurde versendet. Der Advisor kann den Zugang jetzt über den Link öffnen.",
      };
    }
    if (entry.status === "approved") {
      return {
        label: "Freigegeben",
        className: "border-sky-200 bg-sky-50 text-sky-700",
        description: "Beide Founder haben zugestimmt. Der Eintrag ist bereit für den nächsten Invite-Schritt.",
      };
    }
    if (entry.status === "revoked") {
      return {
        label: "Pausiert",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        description: "Die Freigabe wurde pausiert oder widerrufen.",
      };
    }
    return {
      label: "Wartet auf Zustimmung",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      description: "Eine zweite Founder-Zustimmung fehlt noch.",
    };
  }

  function currentFounderApprovedEntry(entry: FounderAlignmentWorkbookAdvisorEntry) {
    return currentUserRole === "founderA"
      ? entry.founderAApproved
      : currentUserRole === "founderB"
        ? entry.founderBApproved
        : false;
  }

  function missingOtherFounderLabel(entry: FounderAlignmentWorkbookAdvisorEntry) {
    if (!entry.founderAApproved) return founderALabel;
    if (!entry.founderBApproved) return founderBLabel;
    return null;
  }

  function advisorSuggestedByDisplayLabel(entry: FounderAlignmentWorkbookAdvisorEntry) {
    if (entry.suggestedByRole === "founderA") return founderALabel;
    if (entry.suggestedByRole === "founderB") return founderBLabel;
    return entry.suggestedByLabel;
  }

  function handleProposeAdvisor() {
    if (!invitationId || (currentUserRole !== "founderA" && currentUserRole !== "founderB")) {
      return;
    }

    startAdvisorActionTransition(async () => {
      const result = await proposeFounderAlignmentAdvisor({
        invitationId,
        advisorName: advisorProposalName,
        advisorEmail: advisorProposalEmail,
      });

      if (!result.ok) {
        setAdvisorInviteLink(null);
        setAdvisorInviteMessage(
          result.reason === "invalid_email"
            ? t("Bitte gib eine gültige Advisor-E-Mail-Adresse ein.")
            : t("Der Advisor-Vorschlag konnte gerade nicht gespeichert werden.")
        );
        return;
      }

      upsertAdvisorEntry(result.entry);
      setAdvisorProposalName("");
      setAdvisorProposalEmail("");
      setAdvisorInviteLink(null);
      setAdvisorInviteMessage(
        currentUserRole === "founderA"
          ? t("Advisor vorgeschlagen. Jetzt kann Founder B zustimmen.")
          : t("Advisor vorgeschlagen. Jetzt kann Founder A zustimmen.")
      );
    });
  }

  function handleApproveAdvisorEntry(entryId: string) {
    if (!invitationId || (currentUserRole !== "founderA" && currentUserRole !== "founderB")) {
      return;
    }

    startAdvisorActionTransition(async () => {
      const result = await approveFounderAlignmentAdvisorProposal({
        invitationId,
        advisorEntryId: entryId,
      });

      if (!result.ok) {
        setAdvisorInviteLink(null);
        setAdvisorInviteMessage(t("Die Zustimmung konnte gerade nicht gespeichert werden."));
        return;
      }

      upsertAdvisorEntry(result.entry);
      setAdvisorInviteLink(null);
      setAdvisorInviteMessage(
        result.entry.status === "approved"
          ? t("Beide Founder haben zugestimmt. Der Advisor ist jetzt freigegeben.")
          : t("Die Zustimmung wurde gespeichert.")
      );
    });
  }

  function handleSendAdvisorInvite(entry: FounderAlignmentWorkbookAdvisorEntry) {
    if (!invitationId || (currentUserRole !== "founderA" && currentUserRole !== "founderB")) {
      return;
    }

    startAdvisorActionTransition(async () => {
      const result = await sendFounderAlignmentAdvisorInvite({
        invitationId,
        advisorEntryId: entry.id,
        teamContext,
      });

      if (!result.ok) {
        setAdvisorInviteLink(null);
        setAdvisorInviteMessage(
          result.reason === "missing_email"
            ? t("Für diesen Advisor fehlt noch eine E-Mail-Adresse.")
            : result.reason === "not_ready"
              ? t("Dieser Advisor-Eintrag ist noch nicht bereit für den Versand.")
              : t(
                  "Die Einladung wurde noch nicht versendet. Der Advisor-Eintrag bleibt erhalten und kann bei Bedarf manuell geteilt werden."
                )
        );
        return;
      }

      upsertAdvisorEntry(result.entry);
      setAdvisorInviteLink(result.inviteUrl);
      setAdvisorInviteMessage(
        t(
          `Einladung gesendet an ${result.entry.advisorEmail ?? "die hinterlegte Adresse"}.`
        )
      );
    });
  }

  function handleCopyAdvisorInviteLink(entry: FounderAlignmentWorkbookAdvisorEntry) {
    if (!invitationId || (currentUserRole !== "founderA" && currentUserRole !== "founderB")) {
      return;
    }

    startAdvisorActionTransition(async () => {
      const result = await copyFounderAlignmentAdvisorInviteLink({
        invitationId,
        advisorEntryId: entry.id,
      });

      if (!result.ok) {
        setAdvisorInviteLink(null);
        setAdvisorInviteMessage(
          t("Der Einladungslink konnte gerade nicht vorbereitet werden.")
        );
        return;
      }

      upsertAdvisorEntry(result.entry);
      setAdvisorInviteLink(result.inviteUrl);

      if (typeof window !== "undefined") {
        try {
          await navigator.clipboard.writeText(result.inviteUrl);
          setAdvisorInviteMessage(t("Einladungslink kopiert. Du kannst ihn jetzt manuell teilen."));
          return;
        } catch {
          setAdvisorInviteMessage(t("Einladungslink erstellt. Du kannst ihn jetzt manuell teilen."));
          return;
        }
      }

      setAdvisorInviteMessage(t("Einladungslink erstellt."));
    });
  }

  return (
    <div className="print-document-root min-h-screen bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.08),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ffffff_24%,#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8 print:min-h-0 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-7xl print:max-w-none">
        {showSummaryView ? (
          <section className="rounded-[32px] border border-slate-200/80 bg-white/98 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:p-0 print:shadow-none">
            <div className="grid gap-8 border-b border-slate-200/80 pb-10 print:gap-6 print:pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <object
                  type="image/svg+xml"
                  data="/cofoundery-align-logo.svg"
                  className="h-9 w-auto max-w-[190px] print:h-7"
                  aria-label="CoFoundery Align Logo"
                />
                <p className="mt-7 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  CoFoundery Align
                </p>
                <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.035em] text-slate-950">
                  Eure gemeinsame Vereinbarung
                </h1>
                <p className="mt-3 text-[15px] leading-7 text-slate-600">
                  {t("Basierend auf eurem Alignment-Workbook")}
                </p>
                <p className="mt-5 text-base leading-7 text-slate-700">
                  {founderALabel} x {founderBLabel}
                </p>
                <p className="mt-4 max-w-3xl text-[16px] leading-8 text-slate-700">
                  {t("Das ist die Arbeitsbasis, auf die ihr euch aktuell einigt.")}
                </p>
              </div>

              {formattedUpdatedAt ? (
                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/65 px-4 py-3 text-sm text-slate-600 print:min-w-[170px]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {t("Stand")}
                  </p>
                  <p className="mt-2 font-medium text-slate-700">{formattedUpdatedAt}</p>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="rounded-[36px] border border-slate-200/70 bg-white/96 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.055)] sm:p-8">
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

              <div className="flex min-w-[260px] flex-col items-start gap-3 rounded-[30px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.96))] p-5 lg:items-end">
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

            {((!currentStepIsAdvisorClosing && !currentStepIsPremiumPilot) || showAdvisorInviteCard) && (
              <div
                className={`mt-6 grid gap-4 ${
                  showAdvisorInviteCard
                    ? "xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]"
                    : ""
                }`}
              >
                {!currentStepIsAdvisorClosing && !currentStepIsPremiumPilot && !isAdvisorViewer ? (
                  <section className="rounded-[28px] border border-[color:var(--brand-primary)]/18 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.035)] sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                          {t("Arbeitsweise")}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-950">
                          {t("Wie wollt ihr starten?")}
                        </h2>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {t("Das steuert nur eure Startform. Bearbeitungsrechte, Autorenschaft und Zustimmung bleiben sauber getrennt.")}
                        </p>
                      </div>
                      <span className="rounded-full border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
                        {t(`Schritt ${currentIndex + 1}`)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                      {WORKBOOK_MODE_OPTIONS.map((option) => {
                        const isActive = currentStepMode === option.value;
                        const disabled = currentUserRole === "unknown";
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
                    {isAdvisorViewer ? (
                      <details className="group" open={false}>
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                          <div className="max-w-md">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {t("Advisor-Kontext")}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${advisorAccessMeta.badgeClassName}`}
                              >
                                {t(advisorAccessMeta.badge)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {t("Freigabe und Rollenhinweise")}
                              </span>
                            </div>
                            <h3 className="mt-3 text-base font-semibold text-slate-950">
                              {t("Advisor-Zugriff")}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {t("Nur bei Bedarf öffnen: Hier siehst du Freigabestatus und den Rahmen deiner Rolle.")}
                            </p>
                          </div>
                          <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 transition group-open:bg-slate-100">
                            {t("Details")}
                          </span>
                        </summary>

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
                          <p className="mt-4 text-sm leading-6 text-slate-600">
                            {t(
                              "Du arbeitest nur im freigegebenen Workbook- und Report-Kontext. Founder-Beiträge und Zustimmungen bleiben unverändert."
                            )}
                          </p>
                        </div>
                      </details>
                    ) : (
                      <>
                        <div className="max-w-md">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            {t("Advisor-Begleitung")}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${advisorAccessMeta.badgeClassName}`}
                            >
                              {t(advisorAccessMeta.badge)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {t(
                                advisorEntriesState.length > 0
                                  ? `${advisorEntriesState.length} Advisor-Eintraege`
                                  : "Noch kein Advisor vorgeschlagen"
                              )}
                            </span>
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-slate-950">
                            {t("Mehrere Advisors pro Team vorbereiten")}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {t(
                              "Schlagt konkrete Personen vor, haltet die zweite Founder-Zustimmung fest und bereitet so einen sauberen Advisor-Kontext pro Person vor."
                            )}
                          </p>
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/80 bg-white/92 p-3">
                          <div className="space-y-3">
                            {advisorEntriesState.length > 0 ? (
                              <div className="space-y-3">
                                {advisorEntriesState.map((entry) => {
                                  const statusMeta = statusMetaForAdvisorEntry(entry);
                                  const invitedAtLabel = formatAdvisorInviteTimestamp(entry.invitedAt);
                                  const canApproveCurrentFounder =
                                    (currentUserRole === "founderA" || currentUserRole === "founderB") &&
                                    entry.status === "pending" &&
                                    !currentFounderApprovedEntry(entry);
                                  const canSendInvite =
                                    (currentUserRole === "founderA" || currentUserRole === "founderB") &&
                                    entry.status === "approved";
                                  const canResendInvite =
                                    (currentUserRole === "founderA" || currentUserRole === "founderB") &&
                                    entry.status === "invited";
                                  const canCopyInviteLink =
                                    (currentUserRole === "founderA" || currentUserRole === "founderB") &&
                                    (entry.status === "approved" || entry.status === "invited");
                                  const missingLabel = missingOtherFounderLabel(entry);
                                  return (
                                    <div
                                      key={entry.id}
                                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-slate-900">
                                            {t(entry.advisorName?.trim() || entry.advisorEmail || "Advisor")}
                                          </p>
                                          {entry.advisorEmail ? (
                                            <p className="mt-1 text-xs text-slate-600">{entry.advisorEmail}</p>
                                          ) : null}
                                          <p className="mt-2 text-xs text-slate-500">
                                            {t(`Vorgeschlagen von ${advisorSuggestedByDisplayLabel(entry)}`)}
                                          </p>
                                        </div>
                                        <span
                                          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusMeta.className}`}
                                        >
                                          {t(statusMeta.label)}
                                        </span>
                                      </div>

                                      <p className="mt-3 text-sm leading-6 text-slate-600">
                                        {t(statusMeta.description)}
                                      </p>

                                      {entry.status === "invited" && invitedAtLabel ? (
                                        <p className="mt-2 text-xs leading-6 text-slate-500">
                                          {t(`Gesendet am ${invitedAtLabel}${entry.advisorEmail ? ` an ${entry.advisorEmail}` : ""}.`)}
                                        </p>
                                      ) : null}

                                      <div className="mt-3 grid gap-2 text-sm text-slate-700">
                                        <AdvisorApprovalRow
                                          label={founderALabel}
                                          approved={entry.founderAApproved}
                                        />
                                        <AdvisorApprovalRow
                                          label={founderBLabel}
                                          approved={entry.founderBApproved}
                                        />
                                      </div>

                                      {canApproveCurrentFounder ? (
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                          <ReportActionButton
                                            type="button"
                                            onClick={() => handleApproveAdvisorEntry(entry.id)}
                                            className="justify-center"
                                          >
                                            {t("Zustimmen")}
                                          </ReportActionButton>
                                          <p className="text-xs leading-6 text-slate-600">
                                            {t(
                                              missingLabel
                                                ? `Danach fehlt noch ${missingLabel}, falls die zweite Zustimmung noch offen ist.`
                                                : "Damit wird dieser Advisor-Eintrag weiter freigegeben."
                                            )}
                                          </p>
                                        </div>
                                      ) : currentFounderApprovedEntry(entry) && entry.status === "pending" ? (
                                        <p className="mt-3 text-xs leading-6 text-slate-600">
                                          {t(
                                            `Deine Zustimmung liegt vor. Jetzt fehlt noch ${missingLabel ?? "die zweite Founder-Zustimmung"}.`
                                          )}
                                        </p>
                                      ) : null}

                                      {canSendInvite || canResendInvite || canCopyInviteLink ? (
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                          {canSendInvite ? (
                                            <ReportActionButton
                                              type="button"
                                              onClick={() => handleSendAdvisorInvite(entry)}
                                              disabled={isAdvisorActionPending}
                                              className="justify-center"
                                            >
                                              {t(
                                                isAdvisorActionPending
                                                  ? "Versendet..."
                                                  : "Einladung senden"
                                              )}
                                            </ReportActionButton>
                                          ) : null}
                                          {canResendInvite ? (
                                            <button
                                              type="button"
                                              onClick={() => handleSendAdvisorInvite(entry)}
                                              disabled={isAdvisorActionPending}
                                              className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
                                            >
                                              {t("Erneut senden")}
                                            </button>
                                          ) : null}
                                          {canCopyInviteLink ? (
                                            <button
                                              type="button"
                                              onClick={() => handleCopyAdvisorInviteLink(entry)}
                                              disabled={isAdvisorActionPending}
                                              className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
                                            >
                                              {t("Einladungslink kopieren")}
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                                <p className="text-sm font-medium text-slate-900">
                                  {t("Noch kein Advisor vorgeschlagen")}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {t(
                                    "Schlagt bei Bedarf eine konkrete Person vor. Der Vorschlag bleibt sichtbar, bis die zweite Founder-Zustimmung vorliegt."
                                  )}
                                </p>
                              </div>
                            )}

                            {currentUserRole === "founderA" || currentUserRole === "founderB" ? (
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                  {t("Advisor vorschlagen")}
                                </p>
                                <div className="mt-3 grid gap-3">
                                  <input
                                    type="text"
                                    value={advisorProposalName}
                                    onChange={(event) => setAdvisorProposalName(event.target.value)}
                                    placeholder={t("Advisor-Name (optional)")}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  />
                                  <input
                                    type="email"
                                    value={advisorProposalEmail}
                                    onChange={(event) => setAdvisorProposalEmail(event.target.value)}
                                    placeholder={t("advisor@example.com")}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                  />
                                  <div className="flex flex-wrap items-center gap-3">
                                    <ReportActionButton
                                      type="button"
                                      onClick={handleProposeAdvisor}
                                      disabled={isAdvisorActionPending}
                                      className="justify-center"
                                    >
                                      {t(
                                        isAdvisorActionPending
                                          ? "Speichert..."
                                          : "Advisor vorschlagen"
                                      )}
                                    </ReportActionButton>
                                    <p className="text-xs leading-6 text-slate-600">
                                      {t("E-Mail ist Pflicht. Dein Vorschlag bleibt sichtbar, auch wenn die zweite Zustimmung noch fehlt.")}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                {t("Was der Advisor später darf")}
                              </p>
                              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">
                                <li>{t("Sieht den freigegebenen Report und das Workbook.")}</li>
                                <li>{t("Ergänzt nur Advisor-Hinweise und den Advisor-Abschluss.")}</li>
                                <li>{t("Ändert keine Founder-Beiträge, Regeln oder Zustimmungen.")}</li>
                              </ul>
                            </div>

                            {advisorImpulses.length > 0 ? (
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                                  {t("Impulse aus der Advisor-Begleitung")}
                                </p>
                                <div className="mt-3 space-y-3">
                                  {advisorImpulses.map((impulse) => {
                                    const sectionMeta = ADVISOR_IMPULSE_SECTION_META[impulse.sectionKey];
                                    return (
                                      <div
                                        key={impulse.id}
                                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                                      >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                              {t(sectionMeta.title)}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                              {t(
                                                `${impulse.advisorName ?? "Advisor"} · ${formatAdvisorImpulseTimestamp(
                                                  impulse.updatedAt
                                                )}`
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-slate-700">
                                          {t(impulse.text)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}

                            {advisorInviteMessage ? (
                              <p className="text-xs leading-6 text-slate-600">{advisorInviteMessage}</p>
                            ) : null}
                          </div>
                        </div>
                      </>
                    )}
                  </aside>
                ) : null}
              </div>
            )}

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
                invitationId={invitationId}
                teamContext={teamContext}
              />
            </section>
          </div>
        ) : (
        <div className="mt-8 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            id="sessionverlauf"
            className="order-2 self-start rounded-[30px] border border-slate-200/70 bg-white/96 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.045)] xl:order-1 xl:sticky xl:top-24"
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
                const stepToneMeta = workbookToneMeta(workbookStepVisualTone(step.id));
                const progressMeta = stepProgressMeta[step.id];
                const statusLabel = progressMeta?.completed
                  ? t("Bereit")
                  : progressMeta?.started
                    ? t("In Arbeit")
                    : t("Offen");
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
                          ? `${stepToneMeta.sidebarActive} ring-1 ring-slate-900/8 shadow-[0_14px_34px_rgba(15,23,42,0.08)]`
                          : progressMeta?.completed
                              ? "border-emerald-200/70 bg-emerald-50/25 text-slate-800 hover:border-emerald-300"
                            : progressMeta?.started
                              ? "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                              : "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                            Schritt {index + 1}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium">{step.title}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {isPrioritized ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                stepToneMeta.sidebarFocus
                              }`}
                            >
                              {t("Fokus")}
                            </span>
                          ) : null}
                          {progressMeta?.started ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                progressMeta?.completed
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-900 text-white"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          ) : null}
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
            tabIndex={-1}
            className="order-1 rounded-[36px] border border-slate-200/70 bg-white/96 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.05)] focus:outline-none sm:p-8 xl:order-2"
          >
            {currentStepIsPremiumPilot ? (
              <div className={`rounded-[28px] px-5 py-5 ${currentToneMeta.headerSurface}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-3xl">
                    <p className={`text-[11px] uppercase tracking-[0.22em] ${currentToneMeta.headerKicker}`}>
                      Schritt {currentIndex + 1} von {visibleSteps.length}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">{currentStep.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                      {t("Erst legt ihr die Punkte auf den Tisch. Danach haltet ihr fest, was künftig klar gelten soll.")}
                    </p>
                    {currentStepIsPrioritized ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${currentToneMeta.focusPill}`}>
                          {t("Fokus")}
                        </span>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        {t("Arbeitsweise")}
                      </span>
                      <div className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 p-1">
                        {WORKBOOK_MODE_OPTIONS.map((option) => {
                          const isActive = currentStepMode === option.value;
                          const disabled = currentUserRole === "advisor" || currentUserRole === "unknown";
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateStepMode(option.value)}
                              disabled={disabled}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                isActive
                                  ? "bg-slate-900 text-white"
                                  : disabled
                                    ? "cursor-not-allowed text-slate-400"
                                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                              }`}
                            >
                              {t(WORKBOOK_MODE_SHORT_LABELS[option.value])}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs leading-6 text-slate-500">
                        {t(WORKBOOK_MODE_V2_HINTS[currentStepMode])}
                      </p>
                    </div>
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
            ) : (
              <>
                <div className={`rounded-3xl p-5 ${currentToneMeta.headerSurface}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className={`text-[11px] uppercase tracking-[0.22em] ${currentToneMeta.headerKicker}`}>
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
                {currentStepIsPrioritized ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${currentToneMeta.focusPill}`}>
                      {t("Fokus")}
                    </span>
                  </div>
                ) : null}
                <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-700">
                  {currentStep.subtitle}
                </p>
              </>
            )}

            {!currentStepIsPremiumPilot ? (
              <>
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
              </>
            ) : null}

            {currentStepIsAdvisorClosing ? (
              <StepSection
                title="Advisor-Abschluss"
                className="mt-8 border-[color:var(--brand-accent)]/14 bg-[linear-gradient(135deg,rgba(15,23,42,0.035),rgba(255,255,255,0.98))]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {t("Externe Perspektive")}
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-8 text-slate-950 sm:text-xl">
                      {t("Was sollte dieses Team nach der Session nicht uebersehen?")}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {t(
                        "Dieser Schritt buendelt den Aussenblick des Advisors. Er ersetzt keine Founder-Vereinbarung, sondern markiert Beobachtungen, offene Rueckfragen und den sinnvollsten naechsten Schritt."
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${advisorClosingAdvisorStatusClassName}`}>
                      {t(advisorClosingAdvisorStatusLabel)}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                      {t(advisorFollowUpLabel(workbook.advisorFollowUp))}
                    </span>
                    <span className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      advisorClosingHasFounderReaction
                        ? "border-[color:var(--brand-primary)]/35 bg-[color:var(--brand-primary)]/12 text-slate-900"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}>
                      {t(advisorClosingFounderReactionLabel)}
                    </span>
                  </div>
                </div>

                <div className="mt-7 rounded-[30px] border border-white/80 bg-white/92 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.05)] sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t("Advisor-Impuls")}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {t(
                          "Wenige klare Punkte reichen. Der Wert liegt nicht in Laenge, sondern in der Verdichtung."
                        )}
                      </p>
                    </div>
                    {!canEditAdvisorClosing() ? (
                      <p className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                        {t(`Bearbeitung durch ${advisorLabel}`)}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 grid gap-5">
                    <WorkbookField
                      title={t("1. Was auffaellt")}
                      value={workbook.advisorClosing.observations}
                      onChange={(value) => updateAdvisorClosing("observations", value)}
                      placeholder={t("Welche zwei oder drei Muster, Staerken oder Spannungen sollte das Team nach der Session bewusst sehen?")}
                      readOnly={!canEditAdvisorClosing()}
                      helperText={
                        canEditAdvisorClosing()
                          ? t("Kurz, konkret, beobachtbar. Keine zweite Analyse schreiben.")
                          : t(`Dieses Feld wird von ${advisorLabel} ausgefuellt.`)
                      }
                      rows={5}
                      minHeightClassName="min-h-[150px]"
                    />
                    <WorkbookField
                      title={t("2. Was offen bleibt")}
                      value={workbook.advisorClosing.questions}
                      onChange={(value) => updateAdvisorClosing("questions", value)}
                      placeholder={t("Welche Rueckfragen sollten die Founder nicht liegen lassen, bevor sie enger zusammenarbeiten?")}
                      readOnly={!canEditAdvisorClosing()}
                      helperText={
                        canEditAdvisorClosing()
                          ? t("Nur Fragen notieren, die wirklich weitere Klaerung ausloesen.")
                          : t(`Dieses Feld wird von ${advisorLabel} ausgefuellt.`)
                      }
                      rows={4}
                      minHeightClassName="min-h-[132px]"
                    />
                    <WorkbookField
                      title={t("3. Naechster sinnvoller Schritt")}
                      value={workbook.advisorClosing.nextSteps}
                      onChange={(value) => updateAdvisorClosing("nextSteps", value)}
                      placeholder={t("Was sollte das Team als Naechstes konkret tun, pruefen oder terminieren?")}
                      readOnly={!canEditAdvisorClosing()}
                      helperText={
                        canEditAdvisorClosing()
                          ? t("Ein klarer naechster Schritt ist besser als eine lange Empfehlungsliste.")
                          : t(`Dieses Feld wird von ${advisorLabel} ausgefuellt.`)
                      }
                      rows={4}
                      minHeightClassName="min-h-[132px]"
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="rounded-[26px] border border-slate-200/80 bg-white/88 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {t("Follow-up")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {t("Setzt nur dann einen Check-in, wenn er dem Team wirklich beim Dranbleiben hilft.")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ADVISOR_FOLLOW_UP_OPTIONS.map((option) => {
                        const isActive = workbook.advisorFollowUp === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateAdvisorFollowUp(option.value)}
                            disabled={!canEditAdvisorClosing()}
                            className={`rounded-full border px-3.5 py-2 text-sm transition ${
                              isActive
                                ? "border-slate-900 bg-slate-900 text-white"
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

                  <div className="rounded-[26px] border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/8 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-600">
                      {t("Antwort des Teams")}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {t(
                        "Die Founder reagieren knapp: Was nehmt ihr mit, was bleibt offen, worauf kommt ihr zurueck?"
                      )}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
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
                            className={`rounded-full border px-3.5 py-2 text-sm transition ${
                              isActive
                                ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-slate-900"
                                : canEditFounderReaction()
                                  ? "border-white bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
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
                        {t("Dieser Bereich wird von den Foundern gepflegt.")}
                      </p>
                    ) : null}

                    <div className="mt-5">
                      <WorkbookField
                        title={t("Kurze Antwort")}
                        value={workbook.founderReaction.comment}
                        onChange={(value) => updateFounderReaction("comment", value)}
                        placeholder={t("Zum Beispiel: Nehmen wir auf. Offene Frage bleibt ... Naechster Check ist ...")}
                        readOnly={!canEditFounderReaction()}
                        helperText={
                          canEditFounderReaction()
                            ? t("Kurz halten. Das ist eine Antwort, kein neuer Diskursraum.")
                            : t("Dieses Feld wird von den Foundern ausgefuellt.")
                        }
                        rows={4}
                        minHeightClassName="min-h-[132px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-white/70 px-5 py-4">
                  <p className="text-sm font-medium text-slate-900">
                    {t(
                      advisorClosingHasCoreInput
                        ? "Der Advisor-Abschluss ist fachlich gefuellt."
                        : "Der Advisor-Abschluss braucht mindestens Beobachtung und naechsten Schritt."
                    )}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {t(
                      !advisorClosingHasCoreInput
                        ? "Die Team-Antwort ist nachgelagert. Fuer den Abschluss zaehlt zuerst ein belastbarer Advisor-Impuls."
                        : advisorClosingHasFounderReaction
                        ? "Das Team hat eine Antwort hinterlegt. Damit ist der Sondermodus sauber nachgelagert."
                        : "Die Founder koennen danach kurz markieren, was sie aufnehmen, offenlassen oder weiter klaeren."
                    )}
                  </p>
                </div>
              </StepSection>
            ) : currentStepIsPremiumPilot && decisionRulesWorkspace && currentPremiumV2Config ? (
              <>
                <section className={`mt-8 rounded-[28px] px-5 py-5 sm:px-6 ${currentToneMeta.headerSurface}`}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {t("Leitfrage")}
                      </p>
                      <p className="mt-2 text-lg font-semibold leading-8 text-slate-950 sm:text-xl">
                        {t(
                          currentPremiumV2Config.question ??
                            currentStep.prompts[0] ??
                            "Wie regelt ihr Entscheidungen so, dass sie auch unter Druck klar bleiben?"
                        )}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {t(decisionRulesMatchingHint)}
                      </p>
                      {currentStepImpulseContent ? (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() =>
                              setHelperOpenByStep((current) => ({
                                ...current,
                                [currentStep.id]: !current[currentStep.id],
                              }))
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
                            aria-expanded={helperOpenByStep[currentStep.id]}
                            aria-controls={`workbook-impulses-${currentStep.id}`}
                          >
                            <span>{t("Fragen & Impulse")}</span>
                            <span className="text-slate-400">
                              {helperOpenByStep[currentStep.id] ? t("ausblenden") : t("oeffnen")}
                            </span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <WorkbookV2PhasePill
                        label={t(currentPremiumV2Config.collectPhaseLabel ?? "Sammeln")}
                        tone={currentVisualTone}
                        state={
                          visibleWorkbookV2Phase === "collect"
                            ? "active"
                            : hasDecisionRulesBothPerspectives
                              ? "done"
                              : "upcoming"
                        }
                      />
                      <WorkbookV2PhasePill
                        label={t(currentPremiumV2Config.weightingPhaseLabel ?? "Schaerfen")}
                        tone={currentVisualTone}
                        state={
                          visibleWorkbookV2Phase === "weight"
                            ? "active"
                            : decisionRulesWeightingReady
                              ? "done"
                              : "upcoming"
                        }
                      />
                      <WorkbookV2PhasePill
                        label={t(currentPremiumV2Config.rulePhaseLabel ?? "Regel")}
                        tone={currentVisualTone}
                        state={
                          visibleWorkbookV2Phase === "rule"
                            ? "active"
                            : decisionRulesRuleReady
                              ? "done"
                              : "upcoming"
                        }
                      />
                      <WorkbookV2PhasePill
                        label={t("Bestaetigen")}
                        tone={currentVisualTone}
                        state={
                          visibleWorkbookV2Phase === "approval"
                            ? "active"
                            : currentStepIsApprovedByBoth
                              ? "done"
                              : "upcoming"
                        }
                      />
                    </div>
                  </div>
                </section>

                {currentStepImpulseContent && helperOpenByStep[currentStep.id] ? (
                  <WorkbookStepImpulsePanel
                    id={`workbook-impulses-${currentStep.id}`}
                    questions={currentStepImpulseContent.questions}
                    matchingImpulses={currentStepImpulseContent.matchingImpulses}
                    canUse={currentUserRole === "founderA" || currentUserRole === "founderB"}
                    onUseItem={useWorkbookImpulseAsDraft}
                    className="mt-4"
                  />
                ) : null}

                {visibleWorkbookV2Phase === "collect" ? (
                  <section className="mt-8 rounded-[30px] border border-slate-200/80 bg-white p-6 sm:p-7">
                    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
                      <div className="max-w-3xl">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {t(currentPremiumV2Config.collectTitle ?? "1. Denkraum")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {t(currentPremiumV2Config.collectIntro)}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          {t(workbookV2SharedSpaceHint)}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${currentToneMeta.focusPill}`}>
                          {t("Gemeinsamer Raum")}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          {t(
                            currentUserRole === "founderA"
                              ? `Du schreibst als ${founderALabel}`
                              : currentUserRole === "founderB"
                                ? `Du schreibst als ${founderBLabel}`
                                : "Nur lesbar"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      {currentDiscussionDraftSourceEntry ? (
                        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                          <span className="font-medium text-slate-700">
                            {t("Basis fuer deinen Punkt")}
                          </span>
                          <span>
                            {t(
                              `Beitrag von ${
                                currentDiscussionDraftSourceEntry.createdBy === "founderA"
                                  ? founderALabel
                                  : founderBLabel
                              }`
                            )}
                          </span>
                        </div>
                      ) : null}
                      <textarea
                        ref={discussionTextareaRef}
                        value={currentDiscussionDraft}
                        onChange={(event) => setDiscussionDraft(event.target.value)}
                        placeholder={t(currentPremiumV2Config.collectPlaceholder)}
                        readOnly={currentUserRole !== "founderA" && currentUserRole !== "founderB"}
                        rows={3}
                        className={`w-full rounded-2xl border px-4 py-3 text-sm leading-7 outline-none transition ${
                          currentUserRole === "founderA" || currentUserRole === "founderB"
                            ? "border-slate-200/80 bg-slate-50/50 text-slate-700 focus:border-slate-400 focus:ring-2 focus:ring-[color:var(--brand-primary)]/16"
                            : "cursor-not-allowed border-slate-200/70 bg-slate-100/90 text-slate-500"
                        }`}
                      />
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs leading-6 text-slate-500">
                          {t(currentPremiumV2Config.collectHelper)}
                        </p>
                        <ReportActionButton
                          type="button"
                          onClick={addDecisionRulesDiscussionEntry}
                          disabled={currentUserRole !== "founderA" && currentUserRole !== "founderB"}
                        >
                          {t("Eigenen Punkt hinzufuegen")}
                        </ReportActionButton>
                      </div>
                    </div>

                    <div className="mt-5">
                      {decisionRulesWorkspace.entries.length === 0 ? (
                        <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50/70 px-5 py-5 text-sm leading-7 text-slate-600">
                          {t("Noch keine Punkte im gemeinsamen Raum. Der Einstieg wird leicht, sobald der erste konkrete Satz da ist.")}
                        </div>
                      ) : (
                        <WorkbookV2DiscussionThreadList
                          groups={decisionRulesThreadGroups}
                          workspace={decisionRulesWorkspace}
                          currentUserRole={currentUserRole}
                          founderALabel={founderALabel}
                          founderBLabel={founderBLabel}
                          founderAvatarByAuthor={founderAvatarByAuthor}
                          signalOptions={currentPremiumV2SignalOptions}
                          mode="collect"
                          openThreadId={visibleDiscussionOpenThreadId}
                          onToggleThread={toggleDiscussionOpenThread}
                          onUseAsDraft={useDecisionRulesDiscussionEntryAsDraft}
                          onUpdateEntry={updateDecisionRulesDiscussionEntry}
                          onRemoveEntry={removeDecisionRulesDiscussionEntry}
                          onUpdateReaction={updateDecisionRulesReaction}
                          entryOwnClassName={currentToneMeta.entryOwn}
                          entrySharedClassName={currentToneMeta.entryShared}
                          sourceBadgeClassName={currentToneMeta.sourceBadge}
                        />
                      )}
                    </div>

                    <div className="mt-5 text-sm leading-7 text-slate-600">
                      {hasDecisionRulesBothPerspectives
                        ? t(currentPremiumV2Config.collectReadyText)
                        : t(
                            currentPremiumV2Config.missingPerspectiveText(
                              hasDecisionRulesFounderAPerspective ? founderBLabel : founderALabel
                            )
                          )}
                    </div>
                  </section>
                ) : (
                  <WorkbookV2PhasePreview
                    title={t(currentPremiumV2Config.collectTitle ?? "1. Denkraum")}
                    summary={t(`${decisionRulesWorkspace.entries.length} Punkte liegen auf dem Tisch.`)}
                    detail={
                      hasDecisionRulesBothPerspectives
                        ? t("Beide Perspektiven sind sichtbar.")
                        : t("Es fehlt noch mindestens ein eigener Punkt der zweiten Person.")
                    }
                    actionLabel={t(currentPremiumV2Config.collectActionLabel ?? "Denkraum bearbeiten")}
                    onAction={() => openWorkbookV2Phase("collect")}
                    tone={currentVisualTone}
                    className="mt-8"
                  />
                )}

                {visibleWorkbookV2Phase === "weight" ? (
                  <section className={`mt-6 rounded-[30px] border p-6 sm:p-7 ${currentToneMeta.weightSurface}`}>
                    <div className="max-w-3xl">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t(currentPremiumV2Config.weightingTitle ?? "2. Gewichtung")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {t(currentPremiumV2Config.weightingIntro)}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        {t(workbookV2WeightingHint)}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <WorkbookV2InsightCard
                        title={t(currentPremiumV2InsightCopy.sharedTitle)}
                        count={workbookV2SharedInsightCount}
                        text={t(currentPremiumV2InsightCopy.sharedText)}
                        tone="shared"
                        visualTone={currentVisualTone}
                      />
                      <WorkbookV2InsightCard
                        title={t(currentPremiumV2InsightCopy.pendingTitle)}
                        count={workbookV2PendingInsightCount}
                        text={t(currentPremiumV2InsightCopy.pendingText)}
                        tone="focus"
                        visualTone={currentVisualTone}
                      />
                      <WorkbookV2InsightCard
                        title={t(currentPremiumV2InsightCopy.criticalTitle)}
                        count={decisionRulesCriticalCount}
                        text={t(currentPremiumV2InsightCopy.criticalText)}
                        tone="critical"
                        visualTone={currentVisualTone}
                      />
                    </div>

                    <div className="mt-5">
                      <WorkbookV2DiscussionThreadList
                        groups={decisionRulesThreadGroups}
                        workspace={decisionRulesWorkspace}
                        currentUserRole={currentUserRole}
                        founderALabel={founderALabel}
                        founderBLabel={founderBLabel}
                        founderAvatarByAuthor={founderAvatarByAuthor}
                        signalOptions={currentPremiumV2SignalOptions}
                        mode="weight"
                        openThreadId={visibleDiscussionOpenThreadId}
                        onToggleThread={toggleDiscussionOpenThread}
                        onUseAsDraft={useDecisionRulesDiscussionEntryAsDraft}
                        onUpdateEntry={updateDecisionRulesDiscussionEntry}
                        onRemoveEntry={removeDecisionRulesDiscussionEntry}
                        onUpdateReaction={updateDecisionRulesReaction}
                        entryOwnClassName={currentToneMeta.entryOwn}
                        entrySharedClassName={currentToneMeta.entryShared}
                        sourceBadgeClassName={currentToneMeta.sourceBadge}
                      />
                    </div>
                  </section>
                ) : showWorkbookV2WeightPreview ? (
                  <WorkbookV2PhasePreview
                    title={t(currentPremiumV2Config.weightingTitle ?? "2. Gewichtung")}
                    summary={
                      decisionRulesWeightingReady
                        ? t(
                            currentPremiumV2StepId === "ownership_risk"
                              ? `${decisionRulesSharedCount} tragbare Punkte, ${decisionRulesCriticalCount} Punkte fuer gemeinsamen Eingriff.`
                              : currentPremiumV2StepId === "alignment_90_days"
                                ? `${workbookV2PriorityCount} Fokus-Punkte, ${workbookV2DeferredCount} bewusst geparkt.`
                                : currentPremiumV2StepId === "values_guardrails"
                                  ? `${workbookV2GuardrailTragbarCount} tragbare Faelle, ${workbookV2GuardrailCaseCount} Grenzfaelle, ${decisionRulesCriticalCount} rote Linien.`
                              : `${decisionRulesSharedCount} gemeinsame Punkte, ${decisionRulesCriticalCount} offene Unterschiede.`
                          )
                        : t("Die Gewichtung ist erst fertig, wenn beide alle vorhandenen Punkte eingeordnet haben.")
                    }
                    detail={
                      decisionRulesWeightingReady
                        ? t(
                            currentPremiumV2StepId === "ownership_risk"
                              ? "Jetzt ist sichtbar, was allein gefuehrt werden kann und was gemeinsame Absicherung braucht."
                              : currentPremiumV2StepId === "alignment_90_days"
                                ? "Jetzt ist sichtbar, was Vorrang hat, was wartet und was nur bewusst freigegeben wird."
                                : currentPremiumV2StepId === "values_guardrails"
                                  ? "Jetzt ist sichtbar, was tragbar ist, was bewusste Freigabe braucht und was nicht euer Weg ist."
                              : "Die wichtigen Unterschiede sind sichtbar."
                          )
                        : t(
                            decisionRulesFounderAOpenWeightingCount > 0 || decisionRulesFounderBOpenWeightingCount > 0
                              ? `${founderALabel}: ${decisionRulesFounderAOpenWeightingCount} offen · ${founderBLabel}: ${decisionRulesFounderBOpenWeightingCount} offen.`
                              : "Danach geht ihr direkt in die gemeinsame Regel."
                          )
                    }
                    actionLabel={
                      hasDecisionRulesBothPerspectives
                        ? t(currentPremiumV2Config.weightingActionLabel ?? "Gewichtung bearbeiten")
                        : undefined
                    }
                    onAction={
                      hasDecisionRulesBothPerspectives ? () => openWorkbookV2Phase("weight") : undefined
                    }
                    tone={currentVisualTone}
                    className="mt-6"
                  />
                ) : null}

                {visibleWorkbookV2Phase === "rule" || visibleWorkbookV2Phase === "approval" ? (
                  <section className={`mt-6 border ${currentToneMeta.ruleSurface}`}>
                    <div className="max-w-3xl">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t(currentPremiumV2Config.ruleTitle ?? "3. Gemeinsame Regel")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {t(currentPremiumV2Config.ruleIntro)}
                      </p>
                    </div>

                    {decisionRulesSuggestion && decisionRulesWorkspace.entries.length > 0 ? (
                      <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-white/78 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="max-w-3xl">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                              {t("Vorschlag aus euren Punkten")}
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-700">
                              {t(decisionRulesSuggestion.agreement)}
                            </p>
                          </div>
                          <ReportActionButton
                            type="button"
                            onClick={applyDecisionRulesSuggestion}
                            disabled={decisionRulesWorkspace.entries.length === 0}
                            className="shrink-0"
                          >
                            {t("Als Startpunkt nutzen")}
                          </ReportActionButton>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-xs leading-6 text-slate-500">
                          {t("Jetzt verdichtet ihr die sichtbaren Punkte zu einer Fassung, nach der ihr im Alltag wirklich arbeiten wollt.")}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-5 rounded-[28px] border bg-white p-5 ${
                        currentPremiumV2IsLight
                          ? currentToneMeta.ruleCard
                          : currentToneMeta.ruleCard
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t(currentPremiumV2Config.agreementTitle)}
                      </p>
                      <textarea
                        value={currentStepEntry.agreement}
                        onChange={(event) => updateDecisionRulesAgreement(event.target.value)}
                        placeholder={t(currentPremiumV2Config.agreementPlaceholder)}
                        rows={currentPremiumV2IsLight ? 3 : 4}
                        readOnly={!canEditField("agreement")}
                        className={`mt-4 w-full rounded-2xl border px-4 py-4 text-sm leading-7 outline-none transition ${
                          currentPremiumV2IsLight ? "min-h-[124px]" : "min-h-[152px]"
                        } ${
                          canEditField("agreement")
                            ? "border-[color:var(--brand-primary)]/24 bg-white text-slate-700 focus:border-[color:var(--brand-primary)]/40 focus:ring-2 focus:ring-[color:var(--brand-primary)]/16"
                            : "cursor-not-allowed border-slate-200/70 bg-slate-100/90 text-slate-500"
                        }`}
                      />
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
                      <WorkbookField
                        title={t(currentPremiumV2Config.escalationTitle)}
                        value={decisionRulesEscalationValue}
                        onChange={(value) => updateStructuredOutput("escalationRule", value)}
                        placeholder={t(currentPremiumV2Config.escalationPlaceholder)}
                        highlight
                        readOnly={!canEditStructuredOutputs()}
                        helperText={t(currentPremiumV2Config.escalationHelper)}
                        rows={currentPremiumV2IsLight ? 3 : 4}
                        minHeightClassName={currentPremiumV2IsLight ? "min-h-[112px]" : "min-h-[132px]"}
                      />
                      <details className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4">
                        <summary className="cursor-pointer text-sm font-medium text-slate-900">
                          {t(currentPremiumV2Config.reviewSummary)}
                        </summary>
                        <div className="mt-4">
                          <WorkbookField
                            title={t(currentPremiumV2Config.reviewTitle)}
                            value={decisionRulesReviewTriggerValue}
                            onChange={(value) => updateStructuredOutput("reviewTrigger", value)}
                            placeholder={t(currentPremiumV2Config.reviewPlaceholder)}
                            readOnly={!canEditStructuredOutputs()}
                            helperText={t(currentPremiumV2Config.reviewHelper)}
                            rows={currentPremiumV2IsLight ? 3 : 4}
                            minHeightClassName={currentPremiumV2IsLight ? "min-h-[112px]" : "min-h-[132px]"}
                          />
                        </div>
                      </details>
                    </div>
                  </section>
                ) : showWorkbookV2RulePreview ? (
                  <WorkbookV2PhasePreview
                    title={t(currentPremiumV2Config.ruleTitle ?? "3. Gemeinsame Regel")}
                    summary={t(currentPremiumV2Config.rulePreviewSummary)}
                    detail={t(currentPremiumV2Config.rulePreviewDetail)}
                    className="mt-6"
                  />
                ) : null}

                {visibleWorkbookV2Phase === "approval" ? (
                  <section className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          {t(currentPremiumV2Config.approvalTitle ?? "4. Zustimmung")}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {t(
                            currentPremiumV2Config.approvalIntro ??
                              "Bestaetigt diese Fassung erst dann, wenn sie fuer euch beide im Alltag wirklich traegt. Relevante Aenderungen setzen die Zustimmung automatisch zurueck."
                          )}
                        </p>
                      </div>
                      {viewerFounderField ? (
                        <button
                          type="button"
                          onClick={() => updateApproval(!currentUserApproved)}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            currentUserApproved
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {currentUserApproved ? t("Zustimmung zuruecknehmen") : t("Regel bestaetigen")}
                        </button>
                      ) : null}
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
                  </section>
                ) : visibleWorkbookV2Phase === "rule" ? (
                  <WorkbookV2PhasePreview
                    title={t("4. Zustimmung")}
                    summary={t("Die Zustimmung kommt erst ganz zum Schluss.")}
                    detail={t("So bleibt der Fokus zuerst auf Klarheit und nicht auf Status.")}
                    className="mt-6"
                  />
                ) : null}
              </>
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
                        imageUrl={founderAAvatarUrl}
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
                        imageUrl={founderBAvatarUrl}
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
                          imageUrl={
                            viewerFounderField === "founderA"
                              ? founderAAvatarUrl
                              : founderBAvatarUrl
                          }
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

                {currentStepHasStructuredOutputs && currentStepContent.outputFields?.length ? (
                  <StepSection
                    title="3. Arbeitsregel festhalten"
                    className="mt-8 border-[color:var(--brand-primary)]/16 bg-[linear-gradient(180deg,rgba(103,232,249,0.06),rgba(255,255,255,0.98))]"
                  >
                    <div className="max-w-3xl">
                      <p className="text-sm leading-7 text-slate-700">
                        {t(
                          currentStructuredStepId
                            ? buildStructuredSectionIntro(
                                currentStructuredStepId,
                                teamContext,
                                currentStepMarker?.markerClass ?? null
                              )
                            : ""
                        )}
                      </p>
                      {currentStepMarker ? (
                        <p className="mt-3 text-xs leading-6 text-slate-500">
                          {t(`Report-Marker fuer diesen Schritt: ${pilotMarkerLabel(currentStepMarker.markerClass, teamContext)}.`)}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      {currentStepContent.outputFields.map((field) => {
                        const required =
                          currentStepHasStructuredOutputs &&
                          currentStepMarker != null &&
                          currentStepStructuredRequiredKeys.includes(field.key);
                        const fieldValue = readStructuredOutputValue(currentStepStructuredOutputs, field.key);

                        return (
                          <WorkbookField
                            key={field.key}
                            title={
                              required
                                ? `${structuredOutputLabel(field.outputType, teamContext)} *`
                                : structuredOutputLabel(field.outputType, teamContext)
                            }
                            value={fieldValue}
                            onChange={(value) => updateStructuredOutput(field.key, value)}
                            placeholder={field.placeholder}
                            highlight={field.highlight || required}
                            readOnly={!canEditStructuredOutputs()}
                            helperText={buildStructuredFieldHelperText(
                              field.helperText,
                              required,
                              teamContext,
                              field.outputType,
                              field.block ?? null
                            )}
                            rows={4}
                            minHeightClassName="min-h-[132px]"
                          />
                        );
                      })}
                    </div>

                    {currentStepMissingStructuredKeys.length > 0 ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/75 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
                          {t("Vor der Finalisierung noch offen")}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {t(
                            currentStructuredStepId
                              ? buildMissingStructuredOutputsText(
                                  currentStructuredStepId,
                                  currentStepMissingStructuredKeys,
                                  teamContext
                                )
                              : ""
                          )}
                        </p>
                      </div>
                    ) : null}
                  </StepSection>
                ) : null}

                <StepSection
                  title={
                    isCollaborativeMode
                      ? currentStepHasStructuredOutputs
                        ? "4. Gemeinsamer Vorschlag"
                        : "3. Gemeinsamer Vorschlag"
                      : currentStepHasStructuredOutputs
                        ? "4. Vorlaeufiger Vorschlag"
                        : "3. Vorlaeufiger Vorschlag"
                  }
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
                  title={currentStepHasStructuredOutputs ? "5. Finale Absprache" : "4. Finale Absprache"}
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
                          disabled={
                            !currentStepHasAgreement ||
                            !hasBothPerspectives ||
                            (currentStepHasStructuredOutputs && !currentStepStructuredReady)
                          }
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            !currentStepHasAgreement ||
                            !hasBothPerspectives ||
                            (currentStepHasStructuredOutputs && !currentStepStructuredReady)
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
                          : currentStepHasStructuredOutputs && !currentStepStructuredReady
                            ? t("Vor der Finalisierung muessen die Pflichtfelder fuer diese Arbeitsregel ausgefuellt sein.")
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
                      {t("Advisor-Hinweis anzeigen")}
                    </summary>
                    <div className="mt-4">
                      <p className="text-sm leading-7 text-slate-700">
                        {t(
                          "Hier steht die externe Beobachtung zum Schritt. Eure gemeinsame Absprache bleibt davon getrennt und wird dadurch nicht überschrieben."
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

function readStructuredOutputValue(
  outputs: WorkbookStructuredOutputValue | null,
  key: WorkbookStructuredOutputType
) {
  if (!outputs || !(key in outputs)) {
    return "";
  }

  const value = outputs[key as keyof WorkbookStructuredOutputValue];
  return typeof value === "string" ? value : "";
}

function pilotMarkerLabel(markerClass: FounderMatchingMarkerClass, teamContext: TeamContext) {
  switch (markerClass) {
    case "stable_base":
      return teamContext === "existing_team" ? "Stabile Arbeitsbasis" : "Tragende Basis vor dem Start";
    case "conditional_complement":
      return teamContext === "existing_team"
        ? "Produktiv, wenn ihr es aktiv führt"
        : "Produktiv, wenn ihr es vorher klärt";
    case "high_rule_need":
      return teamContext === "existing_team" ? "Hoher Regelbedarf im Alltag" : "Vor dem Start klar regeln";
    case "critical_clarification_point":
      return teamContext === "existing_team" ? "Kritischer Eskalationspunkt" : "Kritischer Klärungspunkt";
  }
}

function buildStructuredSectionIntro(
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">,
  teamContext: TeamContext,
  markerClass: FounderMatchingMarkerClass | null
) {
  const modeSentence =
    teamContext === "existing_team"
      ? "Haltet hier fest, was im Alltag ab jetzt anders geregelt werden soll."
      : "Haltet hier fest, was ihr vor dem Start nicht implizit lassen wollt.";

  const severitySentence =
    markerClass === "critical_clarification_point"
      ? "Dieser Schritt braucht nicht nur eine Position, sondern eine belastbare Regel mit Eskalationspfad."
      : markerClass === "high_rule_need"
        ? "Gerade hier reicht gute Absicht nicht. Ihr braucht eine klare Arbeitsregel, die unter Druck trägt."
        : markerClass === "conditional_complement"
          ? "Gerade hier hilft Unterschied nur, wenn klar ist, unter welchen Bedingungen er produktiv bleibt."
          : "Auch wenn dieses Feld eher stabil wirkt, solltet ihr mindestens eine explizite Arbeitsregel festhalten.";

  const stepSentence =
    stepId === "vision_direction"
      ? "Schreibt auf, woran ihr Chancen, Fokus und Richtungswechsel im Zweifel wirklich messt."
      : stepId === "commitment_load"
        ? "Schreibt auf, was bei Verfügbarkeit, Belastung und Entlastung konkret gilt."
        : stepId === "decision_rules"
          ? "Schreibt auf, wer entscheidet, wann beide reinmuessen und was bei Deadlock gilt."
          : "Schreibt fuer diesen Bereich auf, was grundsaetzlich gilt, was im Alltag laeuft und was unter Druck nicht offen bleiben darf.";

  return `${modeSentence} ${severitySentence} ${stepSentence}`;
}

function buildStructuredFieldHelperText(
  baseHelperText: string,
  required: boolean,
  teamContext: TeamContext,
  outputType: WorkbookStructuredOutputType,
  block: "core_rule" | "escalation_rule" | "trigger" | null
) {
  const contextSuffix =
    teamContext === "existing_team"
      ? outputType === "boundaryRule"
        ? "Beschreibt die Grenze, die im laufenden Alltag nicht weiter verschoben wird."
        : block === "trigger"
        ? "Formuliert ein Signal, das euch im laufenden Alltag rechtzeitig stoppt."
        : block === "escalation_rule"
          ? "Beschreibt, was ab jetzt konkret passiert, wenn es hakt."
          : "Schreibt auf, was im Alltag ab jetzt konkret gelten soll."
      : outputType === "boundaryRule"
        ? "Beschreibt die Grenze, die ihr vor engerer Zusammenarbeit nicht implizit lassen wollt."
        : block === "trigger"
        ? "Formuliert ein Signal, das euch vor dem Start oder frueh danach zum Nachschärfen zwingt."
        : block === "escalation_rule"
          ? "Beschreibt, was gilt, bevor ihr enger voneinander abhängt."
          : "Schreibt auf, was ihr vor dem Start ausdrücklich festlegen wollt.";

  return required ? `${baseHelperText} ${contextSuffix}` : `${baseHelperText} ${contextSuffix}`;
}

function buildMissingStructuredOutputsText(
  stepId: Exclude<FounderAlignmentWorkbookStepId, "advisor_closing">,
  missingKeys: WorkbookStructuredOutputType[],
  teamContext: TeamContext
) {
  const fieldLabels = missingKeys.map((key) => structuredOutputLabel(key, teamContext));
  const intro =
    teamContext === "existing_team"
      ? "Bevor ihr diesen Schritt finalisiert, fehlt noch:"
      : "Bevor ihr diesen Schritt als tragfähige Vorabklärung finalisiert, fehlt noch:";

  return `${intro} ${joinWithComma(fieldLabels)}.`;
}

function structuredOutputLabel(
  outputType: WorkbookStructuredOutputType,
  teamContext: TeamContext
) {
  const preFounderLabels: Record<WorkbookStructuredOutputType, string> = {
    principle: "Was gilt grundsätzlich?",
    operatingRule: "Was macht ihr im Normalfall?",
    escalationRule: "Was passiert bei Uneinigkeit oder Druck?",
    boundaryRule: "Wo ist eure Grenze?",
    reviewTrigger: "Woran merkt ihr, dass es nicht mehr passt?",
  };

  const existingTeamLabels: Record<WorkbookStructuredOutputType, string> = {
    principle: "Was gilt ab jetzt grundsätzlich?",
    operatingRule: "Was macht ihr im Alltag konkret?",
    escalationRule: "Was passiert bei Reibung oder Druck?",
    boundaryRule: "Wo zieht ihr ab jetzt die Grenze?",
    reviewTrigger: "Woran merkt ihr, dass die Regel nicht mehr trägt?",
  };

  return teamContext === "existing_team"
    ? existingTeamLabels[outputType]
    : preFounderLabels[outputType];
}

function joinWithComma(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} und ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} und ${values[values.length - 1]}`;
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

function WorkbookStepImpulsePanel({
  id,
  questions,
  matchingImpulses,
  canUse,
  onUseItem,
  className = "",
}: {
  id: string;
  questions: string[];
  matchingImpulses: string[];
  canUse: boolean;
  onUseItem: (value: string) => void;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-[26px] border border-slate-200/80 bg-white/94 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6 ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("Fragen & Impulse")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {t(
              "Nutzt die Fragen als klugen Einstieg. Ein Klick setzt den Text direkt als editierbaren Startpunkt in euren Denkraum."
            )}
          </p>
        </div>
        <span className="text-xs leading-6 text-slate-500">
          {canUse
            ? t("Direkt uebernehmbar und frei anpassbar")
            : t("Nur lesbar in dieser Rolle")}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("Gute Fragen")}</p>
          <div className="mt-3 grid gap-2.5">
            {questions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onUseItem(question)}
                disabled={!canUse}
                className={`w-full rounded-[20px] border px-4 py-3 text-left text-sm leading-6 transition ${
                  canUse
                    ? "border-slate-200/80 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white"
                    : "cursor-not-allowed border-slate-200/70 bg-slate-100/80 text-slate-500"
                }`}
              >
                {t(question)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t("Impuls aus eurem Matching")}
            </p>
            <span className="rounded-full border border-slate-200/80 bg-slate-50/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
              {t("Kontextbezogen")}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {t("Diese Denkstoesse greifen die Dynamik auf, die fuer diesen Schritt bei euch gerade besonders relevant ist.")}
          </p>
          <div className="mt-3 grid gap-2.5">
            {matchingImpulses.map((impulse) => (
              <button
                key={impulse}
                type="button"
                onClick={() => onUseItem(impulse)}
                disabled={!canUse}
                className={`w-full rounded-[20px] border px-4 py-3 text-left text-sm leading-6 transition ${
                  canUse
                    ? "border-[color:var(--brand-primary)]/14 bg-[linear-gradient(180deg,rgba(103,232,249,0.08),rgba(248,250,252,0.98))] text-slate-700 hover:border-[color:var(--brand-primary)]/24 hover:bg-white"
                    : "cursor-not-allowed border-slate-200/70 bg-slate-100/80 text-slate-500"
                }`}
              >
                {t(impulse)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkbookFounderAvatar({
  displayName,
  avatarId = null,
  imageUrl = null,
  size = "md",
}: {
  displayName: string;
  avatarId?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-7 w-7 text-[11px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  return (
    <ProfileAvatar
      displayName={displayName}
      avatarId={avatarId}
      imageUrl={imageUrl}
      className={`${sizeClass} shrink-0 rounded-full border border-slate-200/80 object-cover shadow-[0_8px_16px_rgba(15,23,42,0.05)]`}
      fallbackClassName={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-slate-100 text-center font-semibold text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.04)]`}
    />
  );
}

function WorkbookV2DiscussionThreadList({
  groups,
  workspace,
  currentUserRole,
  founderALabel,
  founderBLabel,
  founderAvatarByAuthor,
  signalOptions,
  mode,
  openThreadId,
  onToggleThread,
  onUseAsDraft,
  onUpdateEntry,
  onRemoveEntry,
  onUpdateReaction,
  entryOwnClassName,
  entrySharedClassName,
  sourceBadgeClassName,
}: {
  groups: WorkbookDiscussionThreadGroup[];
  workspace: FounderAlignmentWorkbookStepWorkspaceV2;
  currentUserRole: FounderAlignmentWorkbookViewerRole;
  founderALabel: string;
  founderBLabel: string;
  founderAvatarByAuthor: Record<
    FounderAlignmentWorkbookDiscussionAuthor,
    { avatarId: string | null; imageUrl: string | null }
  >;
  signalOptions: DiscussionSignalOption[];
  mode: "collect" | "weight";
  openThreadId: string | null;
  onToggleThread: (rootEntryId: string) => void;
  onUseAsDraft: (entry: FounderAlignmentWorkbookDiscussionEntry) => void;
  onUpdateEntry: (entryId: string, content: string) => void;
  onRemoveEntry: (entryId: string) => void;
  onUpdateReaction: (entryId: string, signal: FounderAlignmentWorkbookDiscussionSignal) => void;
  entryOwnClassName: string;
  entrySharedClassName: string;
  sourceBadgeClassName: string;
}) {
  const viewerFounderRole =
    currentUserRole === "founderA" || currentUserRole === "founderB" ? currentUserRole : null;

  function authorLabelFor(author: FounderAlignmentWorkbookDiscussionAuthor) {
    return author === "founderA" ? founderALabel : founderBLabel;
  }

  function renderSignals(entry: FounderAlignmentWorkbookDiscussionEntry, compact: boolean) {
    const signalA = getDecisionRulesReaction(workspace, entry.id, "founderA");
    const signalB = getDecisionRulesReaction(workspace, entry.id, "founderB");

    if (compact) {
      return (
        <div className="flex flex-wrap gap-2">
          <WorkbookV2SignalBadge
            label={founderALabel}
            signal={signalA}
            signalLabel={getDiscussionSignalShortLabel(signalOptions, signalA)}
          />
          <WorkbookV2SignalBadge
            label={founderBLabel}
            signal={signalB}
            signalLabel={getDiscussionSignalShortLabel(signalOptions, signalB)}
          />
        </div>
      );
    }

    return (
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {signalOptions.map((option) => {
            const isActive =
              viewerFounderRole != null &&
              getDecisionRulesReaction(workspace, entry.id, viewerFounderRole) === option.value;

            return (
              <button
                key={`${entry.id}-${option.value}`}
                type="button"
                disabled={viewerFounderRole == null}
                onClick={() => onUpdateReaction(entry.id, option.value)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                  isActive
                    ? option.value === "critical"
                      ? "border-rose-200/80 bg-rose-50/80 text-rose-700"
                      : option.value === "important"
                        ? "border-amber-200/80 bg-amber-50/80 text-amber-700"
                        : "border-emerald-200/80 bg-emerald-50/80 text-emerald-700"
                    : viewerFounderRole != null
                      ? "border-slate-200/90 bg-white/92 text-slate-700 hover:border-slate-300 hover:bg-white"
                      : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                {t(option.shortLabel)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <WorkbookV2SignalBadge
            label={founderALabel}
            signal={signalA}
            signalLabel={getDiscussionSignalShortLabel(signalOptions, signalA)}
          />
          <WorkbookV2SignalBadge
            label={founderBLabel}
            signal={signalB}
            signalLabel={getDiscussionSignalShortLabel(signalOptions, signalB)}
          />
        </div>
      </div>
    );
  }

  function renderEntry(
    entry: FounderAlignmentWorkbookDiscussionEntry,
    options: {
      isChild: boolean;
      open: boolean;
    }
  ) {
    const isOwnEntry = viewerFounderRole != null && entry.createdBy === viewerFounderRole;
    const authorLabel = authorLabelFor(entry.createdBy);
    const sourceEntry = entry.sourceEntryId
      ? workspace.entries.find((candidate) => candidate.id === entry.sourceEntryId) ?? null
      : null;
    const reactionCount = countDiscussionEntryReactions(workspace, entry.id);
    const compactPreview = truncateDiscussionPreview(entry.content, options.isChild ? 120 : 180);
    const attachmentLabel = options.isChild
      ? sourceEntry
        ? `Greift den Punkt von ${authorLabelFor(sourceEntry.createdBy)} auf`
        : "Baut auf einem frueheren Punkt auf"
      : null;

    return (
      <div
        className={`rounded-[20px] border px-4 py-4 ${
          isOwnEntry ? entryOwnClassName : entrySharedClassName
        } ${options.isChild ? "bg-white/88 shadow-none" : "shadow-[0_8px_24px_rgba(15,23,42,0.03)]"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <WorkbookFounderAvatar
              displayName={authorLabel}
              avatarId={founderAvatarByAuthor[entry.createdBy].avatarId}
              imageUrl={founderAvatarByAuthor[entry.createdBy].imageUrl}
              size={options.isChild ? "sm" : "md"}
            />
            <div>
              <p className="text-sm font-medium text-slate-900">{authorLabel}</p>
              <p className="text-xs text-slate-500">
                {formatDiscussionTimestamp(entry.updatedAt ?? entry.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {attachmentLabel ? (
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${sourceBadgeClassName}`}
              >
                {t(attachmentLabel)}
              </span>
            ) : null}
            <span className="text-xs text-slate-500">
              {t(
                reactionCount > 0
                  ? `${reactionCount} Einordnungen`
                  : options.isChild
                    ? "Noch nicht eingeordnet"
                    : "Noch offen"
              )}
            </span>
          </div>
        </div>

        {options.open ? (
          <>
            {isOwnEntry ? (
              <>
                <textarea
                  value={entry.content}
                  onChange={(event) => onUpdateEntry(entry.id, event.target.value)}
                  rows={options.isChild ? 2 : 3}
                  className="mt-3 w-full rounded-2xl border border-slate-200/80 bg-slate-50/40 px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-[color:var(--brand-primary)]/16"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs leading-5 text-slate-500">
                    {t("Aenderungen halten den Punkt aktuell und setzen seine Einordnung neu offen.")}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemoveEntry(entry.id)}
                    className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-rose-600 hover:underline"
                  >
                    {t(options.isChild ? "Anschluss entfernen" : "Punkt entfernen")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-7 text-slate-700">{t(entry.content)}</p>
                {viewerFounderRole ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onUseAsDraft(entry)}
                      className="text-xs font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                    >
                      {t("Als Basis fuer eigenen Punkt nutzen")}
                    </button>
                    <span className="text-xs leading-5 text-slate-500">
                      {t("Der Ursprungspunkt bleibt unveraendert.")}
                    </span>
                  </div>
                ) : null}
              </>
            )}

            {mode === "weight" ? renderSignals(entry, false) : null}
          </>
        ) : (
          <div className="mt-3">
            <p className="text-sm leading-7 text-slate-700">{t(compactPreview)}</p>
            {mode === "weight" ? <div className="mt-3">{renderSignals(entry, true)}</div> : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = openThreadId === group.rootEntry.id;
        const threadEntryCount = group.childEntries.length;
        const unresolvedCount =
          mode === "weight"
            ? [group.rootEntry, ...group.childEntries].filter((entry) => {
                const reactionA = getDecisionRulesReaction(workspace, entry.id, "founderA");
                const reactionB = getDecisionRulesReaction(workspace, entry.id, "founderB");
                return reactionA === null || reactionB === null;
              }).length
            : 0;

        return (
          <article
            key={group.rootEntry.id}
            className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.035)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  {t(threadEntryCount > 0 ? "Gedanke mit Anschluss" : "Gedanke")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">
                  {threadEntryCount > 0 ? t(`${threadEntryCount} Anschlussbeitraege`) : t("Kein Anschluss")}
                </span>
                {mode === "weight" && unresolvedCount > 0 ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700">
                    {t(`${unresolvedCount} offen`)}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onToggleThread(group.rootEntry.id)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t(isOpen ? "Schliessen" : "Oeffnen")}
                </button>
              </div>
            </div>

            <div className="mt-3">
              {renderEntry(group.rootEntry, {
                isChild: false,
                open: isOpen,
              })}
            </div>

            {isOpen && group.childEntries.length > 0 ? (
              <div className="mt-4 border-l border-slate-200/90 pl-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    {t("Anschluesse")}
                  </span>
                  <span className="text-xs text-slate-400">{t("eine leichte zweite Ebene")}</span>
                </div>
                <div className="space-y-3">
                  {group.childEntries.map((entry) =>
                    renderEntry(entry, {
                      isChild: true,
                      open: true,
                    })
                  )}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function WorkbookField({
  title,
  avatarId = null,
  imageUrl = null,
  showAvatar = false,
  value,
  onChange,
  placeholder,
  highlight = false,
  readOnly = false,
  helperText = null,
  focusSignal = 0,
  rows = 10,
  minHeightClassName = "min-h-[220px]",
}: {
  title: string;
  avatarId?: string | null;
  imageUrl?: string | null;
  showAvatar?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  highlight?: boolean;
  readOnly?: boolean;
  helperText?: string | null;
  focusSignal?: number;
  rows?: number;
  minHeightClassName?: string;
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
            <WorkbookFounderAvatar
              displayName={title}
              avatarId={avatarId}
              imageUrl={imageUrl}
              size="lg"
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
        rows={rows}
        readOnly={readOnly}
        className={`mt-4 ${minHeightClassName} w-full rounded-2xl border px-4 py-3 text-sm leading-7 outline-none transition-all duration-300 ease-out ${
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

function WorkbookV2PhasePill({
  label,
  state,
  tone = "default",
}: {
  label: string;
  state: "active" | "done" | "upcoming";
  tone?: WorkbookVisualTone;
}) {
  const toneMeta = workbookToneMeta(tone);
  const className =
    state === "active"
      ? toneMeta.phaseActive
      : state === "done"
        ? toneMeta.phaseDone
        : "border-slate-200 bg-white/88 text-slate-500";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {label}
    </span>
  );
}

function WorkbookV2PhasePreview({
  title,
  summary,
  detail,
  actionLabel,
  onAction,
  className = "",
  tone = "default",
}: {
  title: string;
  summary: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  tone?: WorkbookVisualTone;
}) {
  const toneMeta = workbookToneMeta(tone);
  return (
    <section className={`${className} rounded-[24px] border px-5 py-4 ${toneMeta.preview}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{summary}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">{detail}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="w-fit rounded-full border border-slate-200 bg-white/92 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function WorkbookV2SignalBadge({
  label,
  signal,
  signalLabel,
}: {
  label: string;
  signal: FounderAlignmentWorkbookDiscussionSignal | null;
  signalLabel?: string | null;
}) {
  const toneClass =
    signal === "critical"
      ? "border-rose-200 bg-rose-50/80 text-rose-700"
      : signal === "important"
        ? "border-amber-200 bg-amber-50/80 text-amber-700"
        : signal === "agree"
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
          : "border-slate-200 bg-white text-slate-500";

  const text =
    signalLabel ??
    (signal === "critical"
      ? "kritisch"
      : signal === "important"
        ? "wichtig"
        : signal === "agree"
          ? "traegt mit"
          : "offen");

  return (
    <div className={`rounded-full border px-3 py-1.5 text-[11px] ${toneClass}`}>
      <span className="font-medium">{label}</span>
      <span className="mx-1 opacity-50">·</span>
      <span>{t(text)}</span>
    </div>
  );
}

function WorkbookV2InsightCard({
  title,
  count,
  text,
  tone,
  visualTone = "default",
}: {
  title: string;
  count: number;
  text: string;
  tone: "shared" | "focus" | "critical";
  visualTone?: WorkbookVisualTone;
}) {
  const toneMeta = workbookToneMeta(visualTone);
  const toneClass =
    tone === "critical"
      ? toneMeta.insightCritical
      : tone === "focus"
        ? toneMeta.insightFocus
        : toneMeta.insightShared;

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-slate-950">{count}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{text}</p>
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
  invitationId,
  teamContext,
}: {
  items: Array<{
    id: FounderAlignmentWorkbookStepId;
    title: string;
    agreement: string;
    structuredOutputs: WorkbookStructuredStepOutputs | null;
    advisorNotes: string;
    advisorClosing: FounderAlignmentWorkbookAdvisorClosing | null;
    advisorFollowUp: FounderAlignmentWorkbookAdvisorFollowUp | null;
    founderReaction: { status: FounderAlignmentWorkbookFounderReactionStatus; comment: string } | null;
  }>;
  onBack: () => void;
  invitationId: string | null;
  teamContext: TeamContext;
}) {
  return (
    <>
      <div className="mt-10 space-y-8 print:mt-6 print:space-y-6">
        {items.map((item) => {
          const primaryAgreement = item.agreement || item.structuredOutputs?.operatingRule?.trim() || "";
          const structuredSummaryItems = buildWorkbookSummaryStructuredItems(
            item.id,
            item.structuredOutputs,
            teamContext
          );

          return (
            <section
              key={item.id}
              className="rounded-[30px] border border-slate-200/75 bg-white px-7 py-8 shadow-[0_12px_34px_rgba(15,23,42,0.035)] print:break-inside-avoid print:rounded-none print:border-x-0 print:border-t-0 print:px-0 print:py-7 print:shadow-none"
            >
              <div className="w-full">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t(item.title)}</p>

                {item.id === "advisor_closing" ? (
                  <div className="mt-5 space-y-5">
                    <SummaryInsightBlock
                      title={t("Aussenblick")}
                      text={item.advisorClosing?.observations || "Noch kein Aussenblick festgehalten."}
                    />
                    <SummaryInsightBlock
                      title={t("Offene Rueckfragen")}
                      text={item.advisorClosing?.questions || "Noch keine Rueckfragen festgehalten."}
                    />
                    <SummaryInsightBlock
                      title={t("Naechster sinnvoller Schritt")}
                      text={item.advisorClosing?.nextSteps || "Noch kein naechster Schritt festgehalten."}
                    />
                    <SummaryInsightBlock
                      title={t("Antwort des Teams")}
                      text={
                        item.founderReaction?.comment
                          ? `${
                              item.founderReaction?.status
                                ? founderReactionStatusLabel(item.founderReaction.status)
                                : "Noch kein Reaktionsstatus festgehalten."
                            }\n\n${item.founderReaction.comment}`
                          : item.founderReaction?.status
                            ? founderReactionStatusLabel(item.founderReaction.status)
                            : "Noch kein Reaktionsstatus festgehalten."
                      }
                    />
                    <SummaryInsightBlock
                      title={t("Naechster Check-in")}
                      text={advisorFollowUpLabel(item.advisorFollowUp)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-5 border-l-2 border-slate-200 pl-5">
                      <p className="text-[17px] leading-8 text-slate-900">
                        {t(primaryAgreement || "Zu diesem Schritt liegt aktuell noch keine klare Regel vor.")}
                      </p>
                    </div>
                    {structuredSummaryItems.length > 0 ? (
                      <div className="mt-7 grid gap-4 lg:grid-cols-2">
                        {structuredSummaryItems.map((summaryItem) => (
                          <SummaryInsightBlock
                            key={`${item.id}-${summaryItem.title}`}
                            title={summaryItem.title}
                            text={summaryItem.text}
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                )}

                {item.advisorNotes ? (
                  <div className="mt-6 border-t border-slate-200/80 pt-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {t("Hinweis aus der Begleitung")}
                    </p>
                    <p className="mt-3 text-[15px] leading-8 text-slate-700">{t(item.advisorNotes)}</p>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-12 border-t border-slate-200/80 pt-8 print:mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[15px] leading-8 text-slate-700">
              {t("Diese Vereinbarung ist eure aktuelle Arbeitsgrundlage.")}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              {t("Ihr könnt das jederzeit anpassen – entscheidend ist, dass ihr bewusst danach arbeitet.")}
            </p>
            <p className="mt-3 text-xs leading-6 text-slate-400">
              {t("Kein rechtlicher Vertrag – aber eure gemeinsame Grundlage.")}
            </p>
          </div>
          <ReportActionButton type="button" onClick={() => window.print()} className="shrink-0 print:hidden">
            {t("Als PDF exportieren")}
          </ReportActionButton>
        </div>
      </div>

      <ProductFeedbackEntry
        source="workbook"
        invitationId={invitationId}
        variant="workbook"
      />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ReportActionButton variant="utility" onClick={onBack}>
          {t("Zurueck zum letzten Schritt")}
        </ReportActionButton>
      </div>
    </>
  );
}

function buildWorkbookSummaryStructuredItems(
  stepId: FounderAlignmentWorkbookStepId,
  outputs: WorkbookStructuredStepOutputs | null,
  teamContext: TeamContext
) {
  if (!outputs || !isWorkbookStructuredStepId(stepId)) {
    return [];
  }

  const config = isPremiumWorkbookV2StepId(stepId) ? PREMIUM_WORKBOOK_V2_CONFIG[stepId] : null;
  const labelByType: Partial<Record<WorkbookStructuredOutputType, string>> = {
    principle: structuredOutputLabel("principle", teamContext),
    escalationRule: config?.escalationTitle ?? structuredOutputLabel("escalationRule", teamContext),
    boundaryRule: structuredOutputLabel("boundaryRule", teamContext),
    reviewTrigger: config?.reviewTitle ?? structuredOutputLabel("reviewTrigger", teamContext),
  };
  const summaryOrder: WorkbookStructuredOutputType[] = [
    "escalationRule",
    "boundaryRule",
    "reviewTrigger",
    "principle",
  ];

  return summaryOrder
    .map((key) => {
      const text = outputs[key]?.trim();
      if (!text) {
        return null;
      }

      return {
        title: labelByType[key] ?? structuredOutputLabel(key, teamContext),
        text,
      };
    })
    .filter((item): item is { title: string; text: string } => Boolean(item));
}

function SummaryInsightBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] bg-slate-50/60 px-5 py-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t(title)}</p>
      <div className="mt-3 space-y-3">
        {t(text)
          .split("\n\n")
          .filter((part) => part.trim().length > 0)
          .map((part) => (
            <p key={`${title}-${part}`} className="text-[15px] leading-8 text-slate-700">
              {part}
            </p>
          ))}
      </div>
    </div>
  );
}

function founderReactionStatusLabel(status: Exclude<FounderAlignmentWorkbookFounderReactionStatus, null>) {
  switch (status) {
    case "understood":
      return t("Aufgenommen");
    case "open":
      return t("Bleibt offen");
    case "in_clarification":
      return t("Weiter klaeren");
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

function workbookStepVisualTone(stepId: FounderAlignmentWorkbookStepId): WorkbookVisualTone {
  switch (stepId) {
    case "decision_rules":
    case "collaboration_conflict":
    case "ownership_risk":
      return "core";
    case "vision_direction":
    case "roles_responsibility":
    case "commitment_load":
      return "light";
    case "alignment_90_days":
      return "closing";
    case "values_guardrails":
      return "guardrails";
    case "advisor_closing":
      return "advisor";
    default:
      return "default";
  }
}

function workbookToneMeta(tone: WorkbookVisualTone) {
  switch (tone) {
    case "core":
      return {
        headerSurface:
          "border border-[color:var(--brand-primary)]/16 bg-[linear-gradient(180deg,rgba(103,232,249,0.09),rgba(255,255,255,0.98))] shadow-[0_14px_30px_rgba(15,23,42,0.03)]",
        headerKicker: "text-[color:var(--brand-primary)]",
        focusPill:
          "border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/8 text-slate-700",
        phaseActive: "border-slate-900 bg-slate-900 text-white",
        phaseDone:
          "border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/10 text-slate-800",
        preview:
          "border-[color:var(--brand-primary)]/12 bg-[linear-gradient(180deg,rgba(103,232,249,0.04),rgba(248,250,252,0.7))]",
        insightShared: "border-emerald-200/80 bg-emerald-50/80",
        insightFocus: "border-amber-200/80 bg-amber-50/80",
        insightCritical: "border-rose-200/80 bg-rose-50/80",
        weightSurface:
          "border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))]",
        ruleSurface:
          "rounded-[32px] border-[color:var(--brand-primary)]/18 bg-[linear-gradient(180deg,rgba(103,232,249,0.11),rgba(255,255,255,0.99))] p-6 sm:p-7",
        ruleCard: "border-white/90 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:p-6",
        entryOwn:
          "border-[color:var(--brand-primary)]/18 bg-[linear-gradient(180deg,rgba(103,232,249,0.05),rgba(255,255,255,1))]",
        entryShared: "border-slate-200/80 bg-white",
        sourceBadge:
          "border-[color:var(--brand-primary)]/14 bg-[color:var(--brand-primary)]/5 text-slate-600",
        sidebarActive:
          "border-[color:var(--brand-primary)]/24 bg-[linear-gradient(180deg,rgba(103,232,249,0.14),rgba(255,255,255,0.98))] text-slate-900 shadow-[0_12px_24px_rgba(103,232,249,0.10)]",
        sidebarFocus:
          "border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/8 text-slate-700",
        sidebarDot: "bg-[color:var(--brand-primary)]/70",
      };
    case "light":
      return {
        headerSurface:
          "border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] shadow-[0_12px_26px_rgba(15,23,42,0.025)]",
        headerKicker: "text-slate-500",
        focusPill: "border-sky-200/80 bg-sky-50/80 text-sky-700",
        phaseActive: "border-slate-900 bg-white text-slate-900 shadow-[0_8px_18px_rgba(15,23,42,0.04)]",
        phaseDone: "border-sky-200/80 bg-sky-50/70 text-sky-700",
        preview: "border-slate-200/75 bg-slate-50/55",
        insightShared: "border-emerald-200/75 bg-emerald-50/70",
        insightFocus: "border-sky-200/75 bg-sky-50/70",
        insightCritical: "border-amber-200/75 bg-amber-50/65",
        weightSurface: "border-slate-200/80 bg-white",
        ruleSurface:
          "rounded-[28px] border-sky-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))] p-5 sm:p-6",
        ruleCard: "border-slate-200/80 sm:p-5",
        entryOwn: "border-sky-200/70 bg-sky-50/55",
        entryShared: "border-slate-200/80 bg-white",
        sourceBadge: "border-sky-200/70 bg-sky-50/70 text-sky-700",
        sidebarActive:
          "border-sky-200/80 bg-sky-50/70 text-slate-900 shadow-[0_10px_22px_rgba(125,211,252,0.08)]",
        sidebarFocus: "border-sky-200/80 bg-sky-50 text-sky-700",
        sidebarDot: "bg-sky-400",
      };
    case "closing":
      return {
        headerSurface:
          "border border-amber-200/70 bg-[linear-gradient(180deg,rgba(254,243,199,0.35),rgba(255,255,255,0.98))] shadow-[0_12px_26px_rgba(120,53,15,0.03)]",
        headerKicker: "text-amber-700",
        focusPill: "border-amber-200/80 bg-amber-50/80 text-amber-700",
        phaseActive: "border-slate-900 bg-slate-900 text-white",
        phaseDone: "border-amber-200/80 bg-amber-50/80 text-amber-700",
        preview: "border-amber-200/65 bg-amber-50/55",
        insightShared: "border-emerald-200/75 bg-emerald-50/70",
        insightFocus: "border-amber-200/80 bg-amber-50/80",
        insightCritical: "border-slate-200/80 bg-slate-50/80",
        weightSurface:
          "border-amber-200/65 bg-[linear-gradient(180deg,rgba(255,251,235,0.75),rgba(255,255,255,1))]",
        ruleSurface:
          "rounded-[32px] border-amber-200/80 bg-[linear-gradient(180deg,rgba(254,243,199,0.45),rgba(255,255,255,0.99))] p-6 sm:p-7",
        ruleCard: "border-white/90 shadow-[0_16px_36px_rgba(120,53,15,0.05)] sm:p-6",
        entryOwn: "border-amber-200/70 bg-amber-50/60",
        entryShared: "border-slate-200/80 bg-white",
        sourceBadge: "border-amber-200/70 bg-amber-50/70 text-amber-700",
        sidebarActive:
          "border-amber-200/80 bg-amber-50/80 text-slate-900 shadow-[0_10px_24px_rgba(245,158,11,0.08)]",
        sidebarFocus: "border-amber-200/80 bg-amber-50 text-amber-700",
        sidebarDot: "bg-amber-400",
      };
    case "guardrails":
      return {
        headerSurface:
          "border border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.05),rgba(255,255,255,0.99))] shadow-[0_12px_26px_rgba(76,29,149,0.03)]",
        headerKicker: "text-[color:var(--brand-accent)]",
        focusPill:
          "border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/8 text-slate-700",
        phaseActive: "border-slate-900 bg-slate-900 text-white",
        phaseDone:
          "border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/8 text-slate-800",
        preview:
          "border-[color:var(--brand-accent)]/12 bg-[linear-gradient(180deg,rgba(124,58,237,0.03),rgba(248,250,252,0.75))]",
        insightShared: "border-emerald-200/75 bg-emerald-50/70",
        insightFocus: "border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/7",
        insightCritical: "border-rose-200/75 bg-rose-50/75",
        weightSurface:
          "border-[color:var(--brand-accent)]/12 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,1))]",
        ruleSurface:
          "rounded-[30px] border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.06),rgba(255,255,255,0.99))] p-6 sm:p-7",
        ruleCard: "border-white/90 shadow-[0_16px_34px_rgba(76,29,149,0.04)] sm:p-6",
        entryOwn: "border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/5",
        entryShared: "border-slate-200/80 bg-white",
        sourceBadge:
          "border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/6 text-slate-700",
        sidebarActive:
          "border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.07),rgba(255,255,255,0.98))] text-slate-900 shadow-[0_10px_24px_rgba(124,58,237,0.07)]",
        sidebarFocus:
          "border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/8 text-slate-700",
        sidebarDot: "bg-[color:var(--brand-accent)]/75",
      };
    case "advisor":
      return {
        headerSurface:
          "border border-slate-200/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.03),rgba(255,255,255,0.98))]",
        headerKicker: "text-slate-500",
        focusPill: "border-slate-200 bg-slate-50 text-slate-600",
        phaseActive: "border-slate-900 bg-slate-900 text-white",
        phaseDone: "border-slate-200 bg-slate-50 text-slate-700",
        preview: "border-slate-200/75 bg-slate-50/60",
        insightShared: "border-slate-200/75 bg-slate-50/70",
        insightFocus: "border-slate-200/75 bg-slate-50/70",
        insightCritical: "border-slate-200/75 bg-slate-50/70",
        weightSurface: "border-slate-200/80 bg-white",
        ruleSurface: "rounded-[28px] border-slate-200/80 bg-white p-6 sm:p-7",
        ruleCard: "border-slate-200/80 sm:p-6",
        entryOwn: "border-slate-200/80 bg-slate-50/50",
        entryShared: "border-slate-200/80 bg-white",
        sourceBadge: "border-slate-200/80 bg-slate-50 text-slate-600",
        sidebarActive: "border-slate-200/90 bg-slate-50/90 text-slate-900",
        sidebarFocus: "border-slate-200 bg-slate-50 text-slate-600",
        sidebarDot: "bg-slate-400",
      };
    default:
      return {
        headerSurface: "border border-slate-200/80 bg-slate-50/70",
        headerKicker: "text-slate-500",
        focusPill: "border-slate-200 bg-slate-50 text-slate-600",
        phaseActive: "border-slate-900 bg-slate-900 text-white",
        phaseDone: "border-slate-200 bg-slate-50 text-slate-700",
        preview: "border-slate-200/75 bg-slate-50/60",
        insightShared: "border-emerald-200/75 bg-emerald-50/70",
        insightFocus: "border-amber-200/75 bg-amber-50/70",
        insightCritical: "border-rose-200/75 bg-rose-50/70",
        weightSurface: "border-slate-200/80 bg-white",
        ruleSurface: "rounded-[28px] border-slate-200/80 bg-slate-50/60 p-5 sm:p-6",
        ruleCard: "border-slate-200/80 sm:p-5",
        entryOwn: "border-slate-200/80 bg-slate-50/60",
        entryShared: "border-slate-200/80 bg-white",
        sourceBadge: "border-slate-200/80 bg-slate-50 text-slate-600",
        sidebarActive: "border-slate-200/90 bg-white text-slate-900",
        sidebarFocus: "border-slate-200 bg-slate-50 text-slate-600",
        sidebarDot: "bg-slate-400",
      };
  }
}

function discussionEntryVersion(entry: FounderAlignmentWorkbookDiscussionEntry) {
  return entry.updatedAt ?? entry.createdAt;
}

function buildWorkspaceV2Patches(
  stepId: FounderAlignmentWorkbookStepId,
  previousWorkspace: FounderAlignmentWorkbookStepWorkspaceV2 | undefined,
  nextWorkspace: FounderAlignmentWorkbookStepWorkspaceV2 | undefined
): FounderAlignmentWorkbookPatch[] {
  const previous = previousWorkspace ?? { entries: [], reactions: [] };
  const next = nextWorkspace ?? { entries: [], reactions: [] };
  const patches: FounderAlignmentWorkbookPatch[] = [];
  const previousEntries = new Map(previous.entries.map((entry) => [entry.id, entry]));
  const nextEntries = new Map(next.entries.map((entry) => [entry.id, entry]));
  const previousReactions = new Map(
    previous.reactions.map((reaction) => [`${reaction.entryId}:${reaction.userId}`, reaction])
  );
  const nextReactions = new Map(
    next.reactions.map((reaction) => [`${reaction.entryId}:${reaction.userId}`, reaction])
  );

  for (const entry of next.entries) {
    const previousEntry = previousEntries.get(entry.id);
    if (!previousEntry) {
      patches.push({
        scope: "step",
        stepId,
        field: "workspaceEntryCreate",
        value: entry,
      });
      continue;
    }

    if (
      previousEntry.content !== entry.content ||
      previousEntry.updatedAt !== entry.updatedAt ||
      previousEntry.updatedBy !== entry.updatedBy
    ) {
      patches.push({
        scope: "step",
        stepId,
        field: "workspaceEntryUpdate",
        value: {
          id: entry.id,
          content: entry.content,
          expectedUpdatedAt: discussionEntryVersion(previousEntry),
          updatedAt: entry.updatedAt,
          updatedBy: entry.updatedBy,
        },
      });
    }
  }

  for (const entry of previous.entries) {
    if (!nextEntries.has(entry.id)) {
      patches.push({
        scope: "step",
        stepId,
        field: "workspaceEntryDelete",
        value: {
          id: entry.id,
          expectedUpdatedAt: discussionEntryVersion(entry),
        },
      });
    }
  }

  for (const reaction of next.reactions) {
    const key = `${reaction.entryId}:${reaction.userId}`;
    const previousReaction = previousReactions.get(key);
    if (
      !previousReaction ||
      previousReaction.signal !== reaction.signal ||
      previousReaction.updatedAt !== reaction.updatedAt
    ) {
      patches.push({
        scope: "step",
        stepId,
        field: "workspaceReactionUpsert",
        value: reaction,
      });
    }
  }

  for (const reaction of previous.reactions) {
    const key = `${reaction.entryId}:${reaction.userId}`;
    if (!nextReactions.has(key)) {
      patches.push({
        scope: "step",
        stepId,
        field: "workspaceReactionDelete",
        value: {
          entryId: reaction.entryId,
          userId: reaction.userId,
        },
      });
    }
  }

  return patches;
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
    if (
      JSON.stringify(previousStep.structuredOutputs ?? null) !==
      JSON.stringify(nextStep.structuredOutputs ?? null)
    ) {
      patches.push({
        scope: "step",
        stepId,
        field: "structuredOutputs",
        value: nextStep.structuredOutputs ?? null,
      });
    }
    patches.push(...buildWorkspaceV2Patches(stepId, previousStep.workspaceV2, nextStep.workspaceV2));
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
  structuredOutputs,
  teamContext,
  markerClass,
}: {
  stepId: FounderAlignmentWorkbookStepId;
  founderAResponse: string;
  founderBResponse: string;
  sourceMode: "solo" | "joint";
  structuredOutputs?: WorkbookStructuredOutputValue | null;
  teamContext: TeamContext;
  markerClass: FounderMatchingMarkerClass | null;
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

  const structuredDraft =
    isWorkbookStructuredStepId(stepId)
      ? buildPilotAgreementDraftFromStructuredOutputs({
          stepId,
          structuredOutputs: structuredOutputs ?? null,
          teamContext,
          markerClass,
        })
      : null;

  return {
    draft:
      structuredDraft && structuredDraft.trim().length > 0
        ? structuredDraft
        : buildStepSpecificAgreementDraft({
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
  stepId: FounderAlignmentWorkbookStepId,
  entry: FounderAlignmentWorkbookPayload["steps"][FounderAlignmentWorkbookStepId],
  markerClass: FounderMatchingMarkerClass | null
): FounderAlignmentWorkbookStepStatus {
  const structuredReady =
    isWorkbookStructuredStepId(stepId)
      ? getMissingWorkbookStructuredOutputKeys(
          stepId,
          getWorkbookStepStructuredOutputs(entry, stepId),
          markerClass ?? "stable_base"
        ).length === 0
      : true;
  const workspace = isPremiumWorkbookV2StepId(stepId) ? resolveDecisionRulesWorkspace(entry) : null;
  const hasBothInputs = workspace
    ? hasDecisionRulesPerspective(workspace, "founderA") &&
      hasDecisionRulesPerspective(workspace, "founderB")
    : entry.founderA.trim().length > 0 && entry.founderB.trim().length > 0;
  const weightingReady = workspace
    ? hasBothInputs &&
      hasDecisionRulesWeightingForAllEntries(workspace, "founderA") &&
      hasDecisionRulesWeightingForAllEntries(workspace, "founderB")
    : true;
  const hasAgreement = entry.agreement.trim().length > 0;
  const bothApproved = entry.founderAApproved && entry.founderBApproved;

  if (hasAgreement && weightingReady && structuredReady && bothApproved) {
    return "finalized";
  }

  if (hasAgreement && hasBothInputs && weightingReady && structuredReady) {
    return "awaiting_approval";
  }

  if (hasAgreement && hasBothInputs && weightingReady) {
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
      return "In Arbeit";
  }
}

function workbookStepStatusClassName(status: FounderAlignmentWorkbookStepStatus) {
  switch (status) {
    case "draft_ready":
      return "bg-amber-100 text-amber-700";
    case "awaiting_approval":
      return "bg-sky-100 text-sky-700";
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
