"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAssessment, upsertAssessmentAnswer } from "@/features/assessments/actions";

export type QuestionnaireQuestion = {
  id: string;
  dimension: string;
  type: string | null;
  prompt: string;
  sort_order: number;
};

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
    questionId: string,
    choiceValue: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onSubmitAssessment?: (
    assessmentId: string
  ) => Promise<{ ok: boolean; submittedAt?: string; error?: string }>;
};

type Option = {
  value: string;
  label: string;
};

const defaultScaleOptions: Option[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
];

export function QuestionnaireClient({
  assessmentId,
  title,
  subtitle,
  questions,
  choices,
  responses,
  completeRedirect,
  allowDefaultScaleFallback = true,
  missingChoicesMessage = "Antwortoptionen konnten nicht geladen werden. Bitte neu laden.",
  onSaveAnswer,
  onSubmitAssessment,
}: Props) {
  const router = useRouter();

  const initialAnswers = useMemo(() => {
    const map = new Map<string, string>();
    responses.forEach((row) => map.set(row.question_id, row.choice_value));
    return map;
  }, [responses]);

  const initialIndex = useMemo(() => {
    const firstOpen = questions.findIndex((question) => !initialAnswers.has(question.id));
    if (firstOpen >= 0) return firstOpen;
    return Math.max(0, questions.length - 1);
  }, [initialAnswers, questions]);

  const [answers, setAnswers] = useState<Map<string, string>>(initialAnswers);
  const [index, setIndex] = useState(initialIndex);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = questions.length;
  const current = questions[index];
  const currentPosition = total > 0 ? index + 1 : 0;
  const isLastQuestion = index === total - 1;

  const currentOptions = useMemo(() => {
    if (!current) {
      return [] as Option[];
    }

    const filtered = choices
      .filter((choice) => choice.question_id === current.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((choice) => ({ value: choice.value, label: choice.label }));

    if (filtered.length > 0) {
      return filtered;
    }

    return allowDefaultScaleFallback ? defaultScaleOptions : [];
  }, [allowDefaultScaleFallback, choices, current]);

  const handleBack = () => {
    if (saving || finishing) {
      return;
    }
    setError(null);
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSelect = async (value: string) => {
    if (!current || saving || finishing) {
      return;
    }

    setSaving(true);
    setError(null);
    const previous = answers.get(current.id);

    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(current.id, value);
      return next;
    });

    const saveResult = onSaveAnswer
      ? await onSaveAnswer(assessmentId, current.id, value)
      : await upsertAssessmentAnswer(assessmentId, current.id, value);

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

  const selectedValue = answers.get(current.id);

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
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
          Frage {currentPosition} von {total}
        </p>
        <p className="mt-2 text-base leading-8 text-slate-900">{current.prompt}</p>

        <div className="mt-5 grid gap-3">
          {currentOptions.length === 0 ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {missingChoicesMessage}
            </p>
          ) : (
            currentOptions.map((option) => {
              const active = selectedValue === option.value;
              return (
                <button
                  key={`${current.id}-${option.value}`}
                  type="button"
                  onClick={() => {
                    void handleSelect(option.value);
                  }}
                  disabled={saving || finishing}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  } disabled:opacity-60`}
                >
                  {option.label}
                </button>
              );
            })
          )}
        </div>
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
