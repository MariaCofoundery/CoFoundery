"use client";

import Link from "next/link";
import {
  QuestionnaireClient,
  type QuestionnaireChoice,
} from "@/features/questionnaire/QuestionnaireClient";
import { type QuestionnaireQuestion } from "@/features/questionnaire/questionnaireShared";

type Props = {
  title: string;
  subtitle: string;
  questions: QuestionnaireQuestion[];
  choices: QuestionnaireChoice[];
  restartHref: string;
  completed: boolean;
};

export function QuestionnaireDebugPreview({
  title,
  subtitle,
  questions,
  choices,
  restartHref,
  completed,
}: Props) {
  const totalQuestions = questions.length;
  const forcedChoiceCount = questions.filter((question) => question.type === "forced_choice").length;
  const likertCount = questions.filter((question) => question.type === "likert").length;
  const scenarioCount = questions.filter((question) => question.type === "scenario").length;

  if (completed) {
    return (
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Debug Preview</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Der Preview-Durchlauf wurde lokal abgeschlossen. Es wurden keine Live-Antworten gespeichert und kein
          produktiver Fragebogenstatus veraendert.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={restartHref}
            className="inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-[color:var(--brand-primary-hover)]"
          >
            Preview neu starten
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Debug Preview</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Diese Vorschau laedt die aktuell aktiven Basisfragen, speichert Antworten aber nur lokal im
              Browserzustand. So laesst sich der komplette Flow erneut testen, ohne bestehende Live-Antworten zu
              ueberschreiben.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
            <MetaCard label="Fragen gesamt" value={String(totalQuestions)} />
            <MetaCard label="Forced Choice" value={String(forcedChoiceCount)} accent="primary" />
            <MetaCard label="Likert" value={String(likertCount)} />
            <MetaCard label="Szenario" value={String(scenarioCount)} accent="accent" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={restartHref}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Preview zuruecksetzen
          </Link>
        </div>
      </section>

      <QuestionnaireClient
        assessmentId="debug-base-preview"
        title={title}
        subtitle={subtitle}
        questions={questions}
        choices={choices}
        responses={[]}
        completeRedirect={`${restartHref}${restartHref.includes("?") ? "&" : "?"}completed=1`}
        allowDefaultScaleFallback={false}
        missingChoicesMessage="Antwortoptionen konnten nicht geladen werden. Bitte neu laden."
        onSaveAnswer={async () => ({ ok: true })}
        onSubmitAssessment={async () => ({ ok: true, submittedAt: new Date().toISOString() })}
        disableTracking
      />
    </div>
  );
}

function MetaCard({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: string;
  accent?: "primary" | "accent" | "neutral";
}) {
  const className =
    accent === "primary"
      ? "border-[color:var(--brand-primary)]/22 bg-[color:var(--brand-primary)]/7"
      : accent === "accent"
        ? "border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/7"
        : "border-slate-200/80 bg-slate-50/70";

  return (
    <article className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </article>
  );
}
