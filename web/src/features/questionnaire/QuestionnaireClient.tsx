"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  completeParticipantA,
  upsertResponse,
} from "@/features/questionnaire/actions";

type QuestionType = "scale" | "scenario" | "tradeoff";

type Question = {
  id: string;
  dimension: string;
  type: QuestionType | null;
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

type Option = {
  value: string;
  label: string;
};

type Props = {
  sessionId: string;
  displayName: string;
  questions: Question[];
  choices: Choice[];
  responses: ResponseRow[];
  freeText: string | null;
  completedAt: string | null;
  onSaveResponse?: (sessionId: string, questionId: string, choiceValue: string) => Promise<{ ok: boolean }>;
  onSaveFreeText?: (sessionId: string, text: string) => Promise<{ ok: boolean }>;
  onComplete?: (
    sessionId: string
  ) => Promise<{ ok: boolean; status?: "waiting" | "match_ready"; requiresValues?: boolean }>;
};

const slideVariants = {
  enter: { x: 28, opacity: 0, filter: "blur(2px)" },
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: { x: -28, opacity: 0, filter: "blur(2px)" },
};

const defaultScaleOptions: Option[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
];

export function QuestionnaireClient(props: Props) {
  const {
    sessionId,
    displayName,
    questions,
    choices,
    responses,
    completedAt,
    onSaveResponse,
    onComplete,
  } = props;

  const router = useRouter();

  const initialAnswers = useMemo(() => {
    const map = new Map<string, string>();
    responses.forEach((row) => map.set(row.question_id, row.choice_value));
    return map;
  }, [responses]);

  const [answers, setAnswers] = useState<Map<string, string>>(initialAnswers);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(Boolean(completedAt));

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

    if (current.type === "tradeoff") {
      const [left, right] = extractTradeoffLabels(current.prompt);
      return [
        { value: "1", label: `${left} (1)` },
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
        { value: "5", label: "5" },
        { value: "6", label: `${right} (6)` },
      ];
    }

    return defaultScaleOptions;
  }, [choices, current]);

  const handleBack = () => {
    if (saving) {
      return;
    }
    setError(null);
    setIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSelect = async (value: string) => {
    if (!current || saving || completed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saveResult = onSaveResponse
        ? await onSaveResponse(sessionId, current.id, value)
        : await upsertResponse(sessionId, current.id, value);

      if (!saveResult.ok) {
        console.error("Save response failed", {
          sessionId,
          questionId: current.id,
          value,
        });
        setError("Antwort konnte nicht gespeichert werden. Bitte erneut klicken.");
        return;
      }

      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(current.id, value);
        return next;
      });

      if (index < total - 1) {
        setIndex((prev) => Math.min(prev + 1, total - 1));
        return;
      }

      const participantResult = onComplete
        ? await onComplete(sessionId)
        : await completeParticipantA(sessionId);

      if (!participantResult.ok) {
        console.error("Complete participant failed", { sessionId });
        setError("Abschluss fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }

      setCompleted(true);
      if (onComplete && participantResult.requiresValues) {
        router.push(`/session/${sessionId}/values`);
        return;
      }
      router.push("/dashboard");
    } catch (caught) {
      console.error("Unexpected questionnaire save error", caught);
      setError("Unerwarteter Fehler beim Speichern. Bitte erneut klicken.");
    } finally {
      setSaving(false);
    }
  };

  if (!current) {
    return (
      <div className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
        Keine Fragen gefunden.
      </div>
    );
  }

  const answer = answers.get(current.id);
  const promptText = stripTradeoffLabelsFromPrompt(current.prompt);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <p className="text-xs tracking-[0.16em] text-[color:var(--ink-soft)]">Fragebogen</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{displayName}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Fortschritt: {currentPosition}/{total}
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[color:var(--surface-soft)]">
          <div
            className="h-full rounded-full bg-[color:var(--accent)] transition-all"
            style={{ width: `${total > 0 ? (currentPosition / total) * 100 : 0}%` }}
          />
        </div>
      </header>

      <AnimatePresence initial={false} mode="wait">
        <motion.section
          key={current.id}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.16em] text-[color:var(--ink-soft)]">
                Frage {currentPosition} von {total}
              </p>
            </div>
            <div className="rounded-full border border-[color:var(--line)]/80 bg-white/80 px-3 py-1 text-xs text-[color:var(--muted)]">
              {saving && isLastQuestion
                ? "Ergebnisse werden berechnet..."
                : saving
                  ? "Speichern..."
                  : answer
                    ? "Gespeichert"
                    : "Noch offen"}
            </div>
          </div>

          <h2 className="mt-4 text-xl leading-8 text-[color:var(--ink)]">{promptText}</h2>

          <div className="mt-6 grid gap-3">
            {currentOptions.map((option) => {
              const selected = answer === option.value;
              return (
                <button
                  key={`${current.id}-${option.value}`}
                  type="button"
                  onClick={() => void handleSelect(option.value)}
                  disabled={saving || completed}
                  className={`rounded-2xl border bg-white/70 px-5 py-4 text-left text-base leading-7 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md transition ${
                    selected
                      ? "border-[color:var(--accent)]/80 ring-2 ring-[color:var(--accent)]/20"
                      : "border-[color:var(--line)]/80 hover:border-[color:var(--ink-soft)]/60"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {saving && isLastQuestion ? (
            <p className="mt-4 rounded-xl border border-[color:var(--line)]/80 bg-white/80 px-3 py-2 text-sm text-[color:var(--muted)]">
              Ergebnisse werden berechnet...
            </p>
          ) : null}

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={index === 0 || saving}
              className="rounded-xl border border-[color:var(--line)]/80 bg-white/80 px-4 py-2 text-sm text-[color:var(--ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Zurück
            </button>
            <p className="text-xs text-[color:var(--muted)]">
              Tipp: Antwort klicken, wir springen automatisch weiter.
            </p>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function stripTradeoffLabelsFromPrompt(prompt: string) {
  const stripped = prompt.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return stripped || prompt;
}

function extractTradeoffLabels(prompt: string): [string, string] {
  const inBrackets = prompt.match(/\(([^)]+)\)/)?.[1] ?? "";
  const normalized = inBrackets.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return ["Option links", "Option rechts"];
  }

  const bySeparators = normalized
    .split(/\s*(?:vs\.?|gegen|\/|->|<-|<->|↔|→|←|\||,|-)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (bySeparators.length >= 2) {
    return [bySeparators[0], bySeparators[bySeparators.length - 1]];
  }

  const byAnd = normalized
    .split(/\s+und\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (byAnd.length >= 2) {
    return [byAnd[0], byAnd[byAnd.length - 1]];
  }

  return [normalized, "Gegenpol"];
}
