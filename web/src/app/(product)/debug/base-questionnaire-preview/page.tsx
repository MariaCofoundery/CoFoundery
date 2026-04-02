import { notFound, redirect } from "next/navigation";
import { type CSSProperties } from "react";
import { QuestionnaireDebugPreview } from "@/features/questionnaire/QuestionnaireDebugPreview";
import { normalizeQuestionnaireQuestions } from "@/features/questionnaire/questionnaireShared";
import { createClient } from "@/lib/supabase/server";
import { type QuestionnaireChoice } from "@/features/questionnaire/QuestionnaireClient";
import {
  getCoreRegistryItems,
  getOrderedActiveRegistryItems,
  getOrderedRegistryDimensions,
  getRegistryItemsByDimension,
  getSupportRegistryItems,
} from "@/features/scoring/founderCompatibilityRegistry";

type PageSearchParams = {
  completed?: string;
};

export default async function BaseQuestionnairePreviewPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/debug/base-questionnaire-preview");
  }

  const { completed } = await searchParams;

  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("is_active", true)
    .eq("category", "basis")
    .order("sort_order", { ascending: true });

  if (questionsError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-semibold text-red-900">Debug Preview: Basis-Fragebogen</h1>
          <p className="mt-3 text-sm leading-7 text-red-700">
            Die aktiven Basisfragen konnten nicht geladen werden: {questionsError.message}
          </p>
        </section>
      </main>
    );
  }

  const questions = normalizeQuestionnaireQuestions((questionsData ?? []) as unknown[]);
  const registryDimensions = getOrderedRegistryDimensions();
  const activeRegistryItems = getOrderedActiveRegistryItems();
  const coreRegistryItems = getCoreRegistryItems();
  const supportRegistryItems = getSupportRegistryItems();
  const questionIds = questions.map((question) => question.id);
  const { data: choicesData, error: choicesError } =
    questionIds.length > 0
      ? await supabase
          .from("choices")
          .select("id, question_id, label, value, sort_order")
          .in("question_id", questionIds)
          .order("sort_order", { ascending: true })
      : { data: [] as QuestionnaireChoice[], error: null };

  if (choicesError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-xl font-semibold text-red-900">Debug Preview: Basis-Fragebogen</h1>
          <p className="mt-3 text-sm leading-7 text-red-700">
            Die Antwortoptionen konnten nicht geladen werden: {choicesError.message}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#fbf8ff_26%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8"
      style={
        {
          "--brand-primary": "#67e8f9",
          "--brand-primary-hover": "#22d3ee",
          "--brand-accent": "#7c3aed",
        } as CSSProperties
      }
    >
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Registry Runtime</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Founder Compatibility Item Registry</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Diese Vorschau liest die aktive Registry direkt aus dem Repo und zeigt die v2-Struktur, ohne den
            produktiven Fragenpfad oder Supabase-Fragen bereits umzubauen.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RegistryMetaCard label="Aktive Registry-Items" value={String(activeRegistryItems.length)} />
            <RegistryMetaCard label="CORE-Items" value={String(coreRegistryItems.length)} accent="primary" />
            <RegistryMetaCard label="SUPPORT-Items" value={String(supportRegistryItems.length)} accent="accent" />
            <RegistryMetaCard label="Live DB-Basisfragen" value={String(questions.length)} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {registryDimensions.map((dimension) => {
              const items = getRegistryItemsByDimension(dimension.dimensionId).filter((item) => item.isActive);
              const coreItems = items.filter((item) => item.layer === "core").length;
              const supportItems = items.filter((item) => item.layer === "support").length;

              return (
                <article
                  key={dimension.dimensionId}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    #{dimension.order} {dimension.dimensionId}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{dimension.dimensionLabel}</p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    Pole: {dimension.leftPoleLabel} ↔ {dimension.rightPoleLabel}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    Aktiv: {items.length} Items ({coreItems} CORE / {supportItems} SUPPORT)
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <QuestionnaireDebugPreview
          title="Basis-Fragebogen Preview"
          subtitle="Selbstprofil"
          questions={questions}
          choices={(choicesData ?? []) as QuestionnaireChoice[]}
          restartHref="/debug/base-questionnaire-preview"
          completed={completed === "1"}
        />
      </div>
    </main>
  );
}

function RegistryMetaCard({
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
