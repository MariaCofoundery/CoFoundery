"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { upsertResponse } from "@/features/questionnaire/actions";

type ValueQuestion = {
  id: string;
  prompt: string;
  sort_order: number;
};

type Choice = {
  id: string;
  question_id: string;
  label: string;
  value: string;
  sort_order: number;
};

type ResponseRow = {
  question_id: string;
  choice_value: string;
};

type Props = {
  sessionId: string;
  participantId: string;
  onSaveResponse?: (
    sessionId: string,
    questionId: string,
    choiceValue: string
  ) => Promise<{ ok: boolean }>;
};

const defaultScaleChoices: Choice[] = [
  { id: "scale-1", question_id: "", label: "1", value: "1", sort_order: 1 },
  { id: "scale-2", question_id: "", label: "2", value: "2", sort_order: 2 },
  { id: "scale-3", question_id: "", label: "3", value: "3", sort_order: 3 },
  { id: "scale-4", question_id: "", label: "4", value: "4", sort_order: 4 },
  { id: "scale-5", question_id: "", label: "5", value: "5", sort_order: 5 },
  { id: "scale-6", question_id: "", label: "6", value: "6", sort_order: 6 },
];

export function ValuesQuestionnaire({ sessionId, participantId, onSaveResponse }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [questions, setQuestions] = useState<ValueQuestion[]>([]);
  const [choicesByQuestion, setChoicesByQuestion] = useState<Map<string, Choice[]>>(new Map());
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: questionsData, error: questionError } = await supabase
        .from("questions")
        .select("id, prompt, sort_order")
        .eq("category", "values")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(10);

      if (!active) return;

      if (questionError || !questionsData) {
        setError(questionError?.message ?? "Values-Fragen konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      const normalizedQuestions = (questionsData as ValueQuestion[]).slice(0, 10);
      setQuestions(normalizedQuestions);

      if (normalizedQuestions.length === 0) {
        setLoading(false);
        return;
      }

      const ids = normalizedQuestions.map((q) => q.id);
      const [{ data: choicesData }, { data: responsesData }] = await Promise.all([
        supabase
          .from("choices")
          .select("id, question_id, label, value, sort_order")
          .in("question_id", ids)
          .order("sort_order", { ascending: true }),
        supabase
          .from("responses")
          .select("question_id, choice_value")
          .eq("session_id", sessionId)
          .eq("participant_id", participantId)
          .in("question_id", ids),
      ]);

      if (!active) return;

      const choiceMap = new Map<string, Choice[]>();
      (choicesData ?? []).forEach((choice) => {
        const list = choiceMap.get(choice.question_id) ?? [];
        list.push(choice as Choice);
        choiceMap.set(choice.question_id, list);
      });
      choiceMap.forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order));
      setChoicesByQuestion(choiceMap);

      const answerMap = new Map<string, string>();
      (responsesData as ResponseRow[] | null)?.forEach((row) => {
        answerMap.set(row.question_id, row.choice_value);
      });
      setAnswers(answerMap);

      if (answerMap.size >= normalizedQuestions.length && normalizedQuestions.length > 0) {
        router.replace("/dashboard?valuesStatus=completed");
        return;
      }

      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [participantId, router, sessionId, supabase]);

  const total = questions.length;
  const totalTarget = 10;
  const current = questions[index];
  const currentPosition = total > 0 ? index + 1 : 0;
  const isLastQuestion = index === total - 1;
  const currentOptions = current
    ? choicesByQuestion.get(current.id) ?? defaultScaleChoices
    : [];

  const handleBack = () => {
    if (saving || finishing) return;
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

    const result = onSaveResponse
      ? await onSaveResponse(sessionId, current.id, value)
      : await upsertResponse(sessionId, current.id, value);

    if (!result.ok) {
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
    router.push("/dashboard?valuesStatus=completed");
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <p className="text-sm text-slate-600">Lade Werte-Fragen...</p>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Werte-Fragebogen</h3>
        <p className="mt-4 text-sm text-slate-600">Keine Values-Zusatzfragen gefunden.</p>
      </section>
    );
  }

  const selectedValue = answers.get(current.id);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <p className="text-xs tracking-[0.16em] text-slate-500">Werte-Fragebogen</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-900">Werte-Vertiefung</h3>
      <p className="mt-2 text-sm text-slate-600">
        Frage {currentPosition} von {totalTarget}
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{ width: `${totalTarget > 0 ? (currentPosition / totalTarget) * 100 : 0}%` }}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/80 p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
          Frage {currentPosition} von {totalTarget}
        </p>
        <p className="mt-2 text-base leading-8 text-slate-900">{current.prompt}</p>

        <div className="mt-5 grid gap-3">
          {currentOptions.map((option) => {
            const active = selectedValue === option.value;
            return (
              <button
                key={`${current.id}-${option.value}`}
                type="button"
                onClick={() => void handleSelect(option.value)}
                disabled={saving || finishing}
                className={`rounded-xl border bg-white/80 px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border-slate-800 text-slate-900"
                    : "border-slate-200 text-slate-700 hover:border-slate-400"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {finishing ? <p className="mt-4 text-sm text-slate-600">Werte-Profil wird abgeschlossen...</p> : null}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={index === 0 || saving || finishing}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 disabled:opacity-50"
        >
          Zurück
        </button>
      </div>
    </section>
  );
}
