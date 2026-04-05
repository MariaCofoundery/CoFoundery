"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAssessment, upsertAssessmentAnswer } from "@/features/assessments/actions";
import { ForcedChoiceQuestion } from "@/features/questionnaire/ForcedChoiceQuestion";
import {
  type QuestionnaireQuestion,
  type QuestionnaireQuestionType,
} from "@/features/questionnaire/questionnaireShared";
import {
  buildResearchClientProperties,
  getOrCreateResearchFlowId,
  trackResearchEvent,
} from "@/features/research/client";

export type QuestionnaireChoice = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
};

export type QuestionnaireResponse = {
  question_id: string;
  choice_value: string;
};

export type QuestionnaireAnswerState = {
  question_id: string;
  choice_id: string;
  value: string;
};

type Props = {
  assessmentId: string;
  title: string;
  subtitle: string;
  questions: QuestionnaireQuestion[];
  choices: QuestionnaireChoice[];
  responses: QuestionnaireResponse[];
  completeRedirect: string;
  allowDefaultScaleFallback?: boolean;
  missingChoicesMessage?: string;
  onSaveAnswer?: (
    assessmentId: string,
    answer: QuestionnaireAnswerState
  ) => Promise<{ ok: boolean; error?: string }>;
  onSubmitAssessment?: (
    assessmentId: string
  ) => Promise<{ ok: boolean; submittedAt?: string; error?: string }>;
  trackingContext?: {
    module: "base" | "values";
    instrumentVersion?: string | null;
    invitationId?: string | null;
    teamContext?: "pre_founder" | "existing_team" | null;
  };
  disableTracking?: boolean;
};

function normalizeQuestionType(type: string | null | undefined): QuestionnaireQuestionType | "unknown" {
  if (type === "likert" || type === "scenario" || type === "forced_choice") {
    return type;
  }
  return "unknown";
}

function buildFallbackChoices(
  type: QuestionnaireQuestionType | "unknown",
  enabled: boolean
): QuestionnaireChoice[] {
  if (!enabled || (type !== "likert" && type !== "forced_choice")) {
    return [];
  }

  return ["1", "2", "3", "4", "5"].map((value, index) => ({
    id: `fallback-${type}-${value}`,
    question_id: "",
    label: value,
    value,
    sort_order: index,
  }));
}

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return 0;
}

function normalizeForcedChoiceStatement(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getForcedChoicePrompt(question: QuestionnaireQuestion | null | undefined) {
  const source = String(question?.prompt ?? "").trim();
  if (!source) {
    return "Welche Aussage passt eher zu dir?";
  }

  const lineParts = source
    .split(/\r?\n+/)
    .map((part) => normalizeForcedChoiceStatement(part))
    .filter(Boolean);

  const firstLine = lineParts[0];
  if (!firstLine || /^(?:aussage\s*a|a)\s*[:)\-]/i.test(firstLine)) {
    return "Welche Aussage passt eher zu dir?";
  }

  return firstLine;
}

function parseForcedChoiceStatements(question: QuestionnaireQuestion | null | undefined) {
  const explicitA =
    typeof question?.optionA === "string" && question.optionA.trim().length > 0
      ? normalizeForcedChoiceStatement(question.optionA)
      : typeof question?.option_a === "string" && question.option_a.trim().length > 0
        ? normalizeForcedChoiceStatement(question.option_a)
        : null;
  const explicitB =
    typeof question?.optionB === "string" && question.optionB.trim().length > 0
      ? normalizeForcedChoiceStatement(question.optionB)
      : typeof question?.option_b === "string" && question.option_b.trim().length > 0
        ? normalizeForcedChoiceStatement(question.option_b)
        : null;

  if (explicitA && explicitB) {
    return { statementA: explicitA, statementB: explicitB };
  }

  const source = String(question?.prompt ?? "").trim();
  if (!source) {
    return { statementA: null, statementB: null };
  }

  const labelledMatch = source.match(
    /(?:^|\s)(?:aussage\s*a|a)\s*[:)\-]\s*(.+?)\s+(?:aussage\s*b|b)\s*[:)\-]\s*(.+)$/i
  );
  if (labelledMatch) {
    return {
      statementA: normalizeForcedChoiceStatement(labelledMatch[1] ?? ""),
      statementB: normalizeForcedChoiceStatement(labelledMatch[2] ?? ""),
    };
  }

  const separatedVariants = ["||", " | ", " <> ", " <-> ", " ↔ "];
  for (const separator of separatedVariants) {
    if (!source.includes(separator)) continue;
    const parts = source
      .split(separator)
      .map((part) => normalizeForcedChoiceStatement(part))
      .filter(Boolean);
    if (parts.length >= 2) {
      return {
        statementA: parts[0],
        statementB: parts[1],
      };
    }
  }

  const lineParts = source
    .split(/\r?\n+/)
    .map((part) => normalizeForcedChoiceStatement(part))
    .filter(Boolean);
  const filteredLineParts = lineParts.filter(
    (part) => !/^welche aussage passt eher zu dir\??$/i.test(part)
  );
  if (filteredLineParts.length >= 2) {
    return {
      statementA: filteredLineParts[0],
      statementB: filteredLineParts[1],
    };
  }
  if (lineParts.length >= 2) {
    return {
      statementA: lineParts[0],
      statementB: lineParts[1],
    };
  }

  return {
    statementA: null,
    statementB: null,
  };
}

export function QuestionnaireClient({
  assessmentId,
  title,
  subtitle,
  questions,
  choices,
  responses,
  completeRedirect,
  allowDefaultScaleFallback = false,
  missingChoicesMessage = "Antwortoptionen konnten nicht geladen werden. Bitte neu laden.",
  onSaveAnswer,
  onSubmitAssessment,
  trackingContext,
  disableTracking = false,
}: Props) {
  const router = useRouter();

  const questionIds = useMemo(() => new Set(questions.map((question) => question.id)), [questions]);

  const choicesByQuestionId = useMemo(() => {
    const map = new Map<string, QuestionnaireChoice[]>();
    [...choices]
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((choice) => {
        const existing = map.get(choice.question_id);
        if (existing) {
          existing.push(choice);
          return;
        }
        map.set(choice.question_id, [choice]);
      });
    return map;
  }, [choices]);

  const initialAnswers = useMemo(() => {
    const map = new Map<string, QuestionnaireAnswerState>();
    responses.forEach((row) => {
      if (!questionIds.has(row.question_id)) {
        return;
      }

      const matchedChoice = (choicesByQuestionId.get(row.question_id) ?? []).find(
        (choice) => choice.value === row.choice_value
      );

      map.set(row.question_id, {
        question_id: row.question_id,
        choice_id: matchedChoice?.id ?? "",
        value: matchedChoice?.value ?? row.choice_value,
      });
    });
    return map;
  }, [choicesByQuestionId, questionIds, responses]);

  const initialIndex = useMemo(() => {
    const firstOpen = questions.findIndex((question) => !initialAnswers.has(question.id));
    if (firstOpen >= 0) return firstOpen;
    return Math.max(0, questions.length - 1);
  }, [initialAnswers, questions]);

  const [answers, setAnswers] = useState<Map<string, QuestionnaireAnswerState>>(initialAnswers);
  const [index, setIndex] = useState(initialIndex);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flowIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const questionShownAtRef = useRef<number>(0);
  const hiddenAtRef = useRef<number | null>(null);
  const accumulatedPauseMsRef = useRef<number>(0);
  const answersCountRef = useRef<number>(initialAnswers.size);

  const total = questions.length;
  const current = questions[index];
  const currentPosition = total > 0 ? index + 1 : 0;
  const isLastQuestion = index === total - 1;
  const initialCompletionRatio = total > 0 ? Math.min(1, initialAnswers.size / total) : null;
  const currentType = normalizeQuestionType(current?.type);

  const flowScope = useMemo(() => {
    const invitationPart = trackingContext?.invitationId?.trim() || "self";
    return `invite_journey:${invitationPart}`;
  }, [trackingContext?.invitationId]);

  useEffect(() => {
    answersCountRef.current = answers.size;
  }, [answers]);

  useEffect(() => {
    if (disableTracking) {
      flowIdRef.current = null;
      startedAtRef.current = nowMs();
      questionShownAtRef.current = startedAtRef.current;
      hiddenAtRef.current = null;
      accumulatedPauseMsRef.current = 0;
      return;
    }

    const startedAt = nowMs();
    flowIdRef.current = getOrCreateResearchFlowId(flowScope);
    startedAtRef.current = startedAt;
    questionShownAtRef.current = startedAt;
    hiddenAtRef.current = null;
    accumulatedPauseMsRef.current = 0;

    trackResearchEvent({
      eventName: "questionnaire_started",
      assessmentId,
      instrumentVersion: trackingContext?.instrumentVersion ?? null,
      invitationId: trackingContext?.invitationId ?? null,
      teamContext: trackingContext?.teamContext ?? null,
      module: trackingContext?.module ?? null,
      flowId: flowIdRef.current,
      completionRatio: initialCompletionRatio,
      properties: buildResearchClientProperties({
        assessmentId,
        totalQuestions: total,
      }),
    });
  }, [
    assessmentId,
    disableTracking,
    flowScope,
    initialCompletionRatio,
    total,
    trackingContext?.invitationId,
    trackingContext?.instrumentVersion,
    trackingContext?.module,
    trackingContext?.teamContext,
  ]);

  useEffect(() => {
    if (disableTracking) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = nowMs();
        return;
      }

      if (hiddenAtRef.current) {
        accumulatedPauseMsRef.current += Math.max(0, nowMs() - hiddenAtRef.current);
        hiddenAtRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [disableTracking]);

  useEffect(() => {
    if (disableTracking || !current) return;
    const viewedAt = nowMs();
    questionShownAtRef.current = viewedAt;
    trackResearchEvent({
      eventName: "question_viewed",
      assessmentId,
      instrumentVersion: trackingContext?.instrumentVersion ?? null,
      invitationId: trackingContext?.invitationId ?? null,
      teamContext: trackingContext?.teamContext ?? null,
      module: trackingContext?.module ?? null,
      flowId: flowIdRef.current,
      questionId: current.id,
      questionIndex: currentPosition,
      questionType: currentType,
      dimension: current.dimension,
      elapsedMs: Math.max(0, viewedAt - startedAtRef.current),
      pauseMs: accumulatedPauseMsRef.current,
      completionRatio: total > 0 ? Math.min(1, answersCountRef.current / total) : null,
      properties: buildResearchClientProperties({
        assessmentId,
      }),
    });
  }, [
    assessmentId,
    current,
    currentType,
    currentPosition,
    total,
    trackingContext?.invitationId,
    trackingContext?.instrumentVersion,
    trackingContext?.module,
    trackingContext?.teamContext,
    disableTracking,
  ]);

  const currentOptions = useMemo(() => {
    if (!current) {
      return [] as QuestionnaireChoice[];
    }

    const filtered = choicesByQuestionId.get(current.id) ?? [];

    if (filtered.length > 0) {
      return filtered;
    }

    return buildFallbackChoices(normalizeQuestionType(current.type), allowDefaultScaleFallback);
  }, [allowDefaultScaleFallback, choicesByQuestionId, current]);

  const forcedChoiceStatements = useMemo(
    () => parseForcedChoiceStatements(current),
    [current]
  );
  const forcedChoicePrompt = useMemo(() => getForcedChoicePrompt(current), [current]);

  const handleBack = () => {
    if (saving || finishing) {
      return;
    }
    setError(null);
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSelect = async (choice: QuestionnaireChoice) => {
    if (!current || saving || finishing) {
      return;
    }

    setSaving(true);
    setError(null);
    const previous = answers.get(current.id);
    const selectedAt = nowMs();
    const nextAnswer: QuestionnaireAnswerState = {
      question_id: current.id,
      choice_id: choice.id,
      value: choice.value,
    };

    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(current.id, nextAnswer);
      return next;
    });

    const saveResult = onSaveAnswer
      ? await onSaveAnswer(assessmentId, nextAnswer)
      : await upsertAssessmentAnswer(assessmentId, current.id, nextAnswer.value);

    if (!saveResult.ok) {
      setAnswers((prev) => {
        const next = new Map(prev);
        if (previous) {
          next.set(current.id, previous);
        } else {
          next.delete(current.id);
        }
        return next;
      });
      setSaving(false);
      setError("Antwort konnte nicht gespeichert werden.");
      return;
    }

    const answeredCountAfter = previous ? answers.size : answers.size + 1;
    if (!disableTracking) {
      trackResearchEvent({
        eventName: "answer_saved",
        assessmentId,
        instrumentVersion: trackingContext?.instrumentVersion ?? null,
        invitationId: trackingContext?.invitationId ?? null,
        teamContext: trackingContext?.teamContext ?? null,
        module: trackingContext?.module ?? null,
        flowId: flowIdRef.current,
        questionId: current.id,
        questionIndex: currentPosition,
        questionType: currentType,
        dimension: current.dimension,
        durationMs: Math.max(0, selectedAt - questionShownAtRef.current),
        elapsedMs: Math.max(0, selectedAt - startedAtRef.current),
        pauseMs: accumulatedPauseMsRef.current,
        answerChanged: previous
          ? previous.choice_id !== nextAnswer.choice_id || previous.value !== nextAnswer.value
          : false,
        completionRatio: total > 0 ? Math.min(1, answeredCountAfter / total) : null,
        choiceValue: nextAnswer.value,
        properties: buildResearchClientProperties({
          assessmentId,
        }),
      });
    }

    if (!isLastQuestion) {
      setSaving(false);
      setIndex((prev) => Math.min(prev + 1, total - 1));
      return;
    }

    setSaving(false);
    setFinishing(true);

    const submitResult = onSubmitAssessment
      ? await onSubmitAssessment(assessmentId)
      : await submitAssessment(assessmentId);

    if (!submitResult.ok) {
      setFinishing(false);
      setError("Fragebogen konnte nicht abgeschlossen werden.");
      return;
    }

    const submittedAt = nowMs();
    if (!disableTracking) {
      trackResearchEvent({
        eventName: "questionnaire_submitted",
        assessmentId,
        instrumentVersion: trackingContext?.instrumentVersion ?? null,
        invitationId: trackingContext?.invitationId ?? null,
        teamContext: trackingContext?.teamContext ?? null,
        module: trackingContext?.module ?? null,
        flowId: flowIdRef.current,
        elapsedMs: Math.max(0, submittedAt - startedAtRef.current),
        pauseMs: accumulatedPauseMsRef.current,
        completionRatio: 1,
        properties: buildResearchClientProperties({
          assessmentId,
          totalQuestions: total,
        }),
      });
    }

    router.push(completeRedirect);
  };

  if (!current) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{title}</h3>
        <p className="mt-4 text-sm text-slate-600">Keine Fragen gefunden.</p>
      </section>
    );
  }

  const selectedAnswer = answers.get(current.id);
  const unknownType = currentType === "unknown" ? current.type?.trim() || "unbekannt" : null;

  const renderChoiceButton = (choice: QuestionnaireChoice, variant: "likert" | "scenario" | "default") => {
    const active = selectedAnswer?.choice_id
      ? selectedAnswer.choice_id === choice.id
      : selectedAnswer?.value === choice.value;

    const inactiveState =
      "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/70 hover:shadow-[0_8px_22px_rgba(124,58,237,0.08)]";
    const activeState = "border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]";

    const className =
      variant === "likert"
        ? `rounded-lg border px-4 py-3 text-center text-sm transition-all duration-200 ${
            active ? activeState : inactiveState
          } disabled:opacity-60`
        : variant === "scenario"
          ? `rounded-xl border px-4 py-4 text-left text-sm leading-6 transition-all duration-200 ${
              active ? activeState : inactiveState
            } disabled:opacity-60`
          : `rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 ${
              active ? activeState : inactiveState
            } disabled:opacity-60`;

    return (
      <button
        key={choice.id}
        type="button"
        onClick={() => {
          void handleSelect(choice);
        }}
        disabled={saving || finishing}
        className={className}
      >
        {variant === "scenario" ? (
          <span className="flex items-start gap-3">
            <span
              className={`mt-1 h-3.5 w-3.5 rounded-full border ${
                active ? "border-white bg-white" : "border-slate-300"
              }`}
              aria-hidden="true"
            />
            <span>{choice.label}</span>
          </span>
        ) : (
          choice.label
        )}
      </button>
    );
  };

  const renderChoices = () => {
    if (currentOptions.length === 0) {
      return (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {missingChoicesMessage}
        </p>
      );
    }

    if (currentType === "likert") {
      return (
        <div className="grid gap-3 sm:grid-cols-5">
          {currentOptions.map((choice) => renderChoiceButton(choice, "likert"))}
        </div>
      );
    }

    if (currentType === "scenario") {
      return <div className="grid gap-3">{currentOptions.map((choice) => renderChoiceButton(choice, "scenario"))}</div>;
    }

    if (currentType === "forced_choice") {
      return (
        <ForcedChoiceQuestion
          options={currentOptions}
          statementA={forcedChoiceStatements.statementA}
          statementB={forcedChoiceStatements.statementB}
          selectedChoiceId={selectedAnswer?.choice_id}
          selectedValue={selectedAnswer?.value}
          disabled={saving || finishing}
          missingChoicesMessage={missingChoicesMessage}
          onSelect={(choice) => {
            void handleSelect(choice);
          }}
        />
      );
    }

    return <div className="grid gap-3">{currentOptions.map((choice) => renderChoiceButton(choice, "default"))}</div>;
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <p className="text-xs tracking-[0.16em] text-slate-500">{title}</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-900">{subtitle}</h3>
      <p className="mt-2 text-sm text-slate-600">
        Frage {currentPosition} von {total}
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{ width: `${total > 0 ? (currentPosition / total) * 100 : 0}%` }}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/80 p-5">
        {currentType === "forced_choice" ? (
          <p className="text-base font-medium text-slate-900">{forcedChoicePrompt}</p>
        ) : (
          <p className="text-base leading-8 text-slate-900">{current.prompt}</p>
        )}

        {unknownType ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Unbekannter Fragetyp &quot;{unknownType}&quot;. Die Antwortoptionen werden als Standardliste
            angezeigt.
          </p>
        ) : null}

        <div className="mt-5">{renderChoices()}</div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={saving || finishing || index === 0}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 disabled:opacity-50"
        >
          Zurück
        </button>
        {saving || finishing ? <p className="text-xs text-slate-500">Speichere...</p> : null}
      </div>

      {error ? <p className="mt-4 text-xs text-red-700">{error}</p> : null}
    </section>
  );
}
