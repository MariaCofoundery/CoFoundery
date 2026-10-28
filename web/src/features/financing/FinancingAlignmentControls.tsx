"use client";

import { useState, useTransition } from "react";
import {
  startFinancingAlignmentAction,
  submitFinancingAlignmentAction,
} from "@/features/financing/financingActions";
import {
  FINANCING_ALIGNMENT_QUESTIONS,
  type FinancingAlignmentAnswer,
  type FinancingAlignmentQuestion,
} from "@/features/financing/financingAlignmentModel";

const BUTTON =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-[15px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2 disabled:opacity-50";

export function FinancingAlignmentStart({ teamId, label, pendingLabel, errorText }: { teamId: string; label: string; pendingLabel: string; errorText: string }) {
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <button
        type="button"
        className={BUTTON}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await startFinancingAlignmentAction(teamId);
            setFailed(!result.ok);
          })
        }
      >
        {pending ? pendingLabel : label}
      </button>
      {failed ? <p role="alert" className="mt-2 text-sm text-rose-700">{errorText}</p> : null}
    </div>
  );
}

type Copy = {
  questions: Record<FinancingAlignmentQuestion, { title: string; a: string; b: string; c: string }>;
  unsure: string;
  submit: string;
  submitting: string;
  error: string;
  incomplete: string;
};

/** Eigene Antworten, alle sieben auf einmal. Abgeben geht erst, wenn jede Frage beantwortet ist. */
export function FinancingAlignmentForm({ teamId, alignmentId, copy }: { teamId: string; alignmentId: string; copy: Copy }) {
  const [answers, setAnswers] = useState<Partial<Record<FinancingAlignmentQuestion, FinancingAlignmentAnswer>>>({});
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const complete = FINANCING_ALIGNMENT_QUESTIONS.every((question) => answers[question]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!complete || pending) return;
        startTransition(async () => {
          const result = await submitFinancingAlignmentAction(teamId, alignmentId, answers);
          setFailed(!result.ok);
        });
      }}
      className="grid gap-4"
    >
      {FINANCING_ALIGNMENT_QUESTIONS.map((question) => (
        <fieldset key={question} className="rounded-2xl bg-[#f7f6fb] px-4 py-3">
          <legend className="px-1 text-[15px] font-semibold text-[#0b1f3a]">{copy.questions[question].title}</legend>
          <div className="mt-2 grid gap-2">
            {(["a", "b", "c", "unsure"] as const).map((option) => {
              const id = `fa-${question}-${option}`;
              const label = option === "unsure" ? copy.unsure : copy.questions[question][option];
              return (
                <label
                  key={option}
                  htmlFor={id}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#6d49e0] ${answers[question] === option ? "border-[#6d49e0] bg-[#efeafc] font-semibold text-[#0b1f3a]" : "border-[#e4e2f0] bg-white text-[#33325e] hover:bg-[#f7f6fb]"}`}
                >
                  <input
                    id={id}
                    type="radio"
                    name={`fa-${question}`}
                    value={option}
                    checked={answers[question] === option}
                    onChange={() => setAnswers((current) => ({ ...current, [question]: option }))}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={`h-4 w-4 shrink-0 rounded-full border-2 ${answers[question] === option ? "border-[#6d49e0] bg-[#6d49e0]" : "border-[#b9b6d3]"}`} />
                  <span className="min-w-0">{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div>
        <button type="submit" className={BUTTON} disabled={!complete || pending}>
          {pending ? copy.submitting : copy.submit}
        </button>
        {!complete ? <p className="mt-2 text-xs text-[#5f5e7a]">{copy.incomplete}</p> : null}
        {failed ? <p role="alert" className="mt-2 text-sm text-rose-700">{copy.error}</p> : null}
      </div>
    </form>
  );
}
