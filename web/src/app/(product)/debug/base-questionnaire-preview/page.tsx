import { notFound, redirect } from "next/navigation";
import { type CSSProperties } from "react";
import { QuestionnaireDebugPreview } from "@/features/questionnaire/QuestionnaireDebugPreview";
import { normalizeQuestionnaireQuestions } from "@/features/questionnaire/questionnaireShared";
import { createClient } from "@/lib/supabase/server";
import { type QuestionnaireChoice } from "@/features/questionnaire/QuestionnaireClient";

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
