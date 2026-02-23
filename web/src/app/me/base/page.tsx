import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDraftAssessment,
  getAssessmentAnswerMap,
  getOwnedDraftAssessment,
  getOrCreateDraftAssessment,
} from "@/features/assessments/actions";
import { getInvitationJoinDecision } from "@/features/reporting/actions";
import {
  QuestionnaireClient,
  type QuestionnaireChoice,
  type QuestionnaireQuestion,
  type QuestionnaireResponse,
} from "@/features/questionnaire/QuestionnaireClient";

type MeBaseSearchParams = {
  invitationId?: string;
  flow?: string;
  assessmentId?: string;
};

export default async function MeBasePage({
  searchParams,
}: {
  searchParams: Promise<MeBaseSearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/base");
  }

  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const isRefreshFlow = params.flow === "refresh";

  let completeRedirect = "/dashboard";
  if (invitationId) {
    const decision = await getInvitationJoinDecision(invitationId);
    if (!decision.ok) {
      redirect(`/dashboard?error=${encodeURIComponent(decision.reason)}`);
    }

    const needsBase = isRefreshFlow
      ? decision.required_modules.includes("base")
      : decision.missing_modules.includes("base");
    if (!needsBase) {
      const needsValues = isRefreshFlow
        ? decision.required_modules.includes("values")
        : decision.missing_modules.includes("values");
      if (needsValues) {
        const valuesSearch = new URLSearchParams({ invitationId });
        if (isRefreshFlow) valuesSearch.set("flow", "refresh");
        redirect(`/me/values?${valuesSearch.toString()}`);
      }
      redirect(`/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`);
    }

    const needsValuesAfterBase =
      decision.required_modules.includes("values") &&
      (isRefreshFlow || !decision.invitee_status.has_values_submitted);
    if (needsValuesAfterBase) {
      const valuesSearch = new URLSearchParams({ invitationId });
      if (isRefreshFlow) valuesSearch.set("flow", "refresh");
      completeRedirect = `/me/values?${valuesSearch.toString()}`;
    } else {
      completeRedirect = `/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`;
    }
  }

  let draft = null as Awaited<ReturnType<typeof getOrCreateDraftAssessment>> | null;
  if (invitationId && isRefreshFlow) {
    const refreshDraftId = params.assessmentId?.trim() ?? "";
    if (refreshDraftId) {
      draft = await getOwnedDraftAssessment("base", refreshDraftId);
    }
    if (!draft) {
      const freshDraft = await createDraftAssessment("base");
      const refreshSearch = new URLSearchParams({
        invitationId,
        flow: "refresh",
        assessmentId: freshDraft.id,
      });
      redirect(`/me/base?${refreshSearch.toString()}`);
    }
  } else {
    draft = await getOrCreateDraftAssessment("base");
  }
  if (!draft) {
    return <main className="p-8">Fehler beim Erstellen des Fragebogens.</main>;
  }

  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, dimension, type, prompt, sort_order")
    .eq("is_active", true)
    .eq("category", "basis")
    .order("sort_order", { ascending: true });

  if (questionsError) {
    return <main className="p-8">Fehler beim Laden des Basis-Fragebogens: {questionsError.message}</main>;
  }

  const questions = (questionsData ?? []) as QuestionnaireQuestion[];
  const questionIds = questions.map((question) => question.id);

  const [{ data: choicesData, error: choicesError }, answerMap] = await Promise.all([
    questionIds.length > 0
      ? supabase
          .from("choices")
          .select("id, question_id, label, value, sort_order")
          .in("question_id", questionIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as QuestionnaireChoice[], error: null }),
    getAssessmentAnswerMap(draft.id),
  ]);

  if (choicesError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-base font-semibold text-red-900">Basis-Fragebogen</h1>
          <p className="mt-2 text-sm text-red-700">
            Antwortoptionen konnten nicht geladen werden. Bitte neu laden.
          </p>
        </section>
      </main>
    );
  }

  const choices = (choicesData ?? []) as QuestionnaireChoice[];
  const hasChoicesForEveryQuestion =
    questionIds.length === 0 ||
    questionIds.every((questionId) => choices.some((choice) => choice.question_id === questionId));
  if (!hasChoicesForEveryQuestion) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-base font-semibold text-red-900">Basis-Fragebogen</h1>
          <p className="mt-2 text-sm text-red-700">
            Antwortoptionen konnten nicht geladen werden. Bitte neu laden.
          </p>
        </section>
      </main>
    );
  }

  const responses: QuestionnaireResponse[] = Object.entries(answerMap).map(([questionId, choiceValue]) => ({
    question_id: questionId,
    choice_value: choiceValue,
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <div className="mb-5 flex items-center justify-between">
        <a
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium tracking-[0.1em] text-slate-700"
        >
          Zurück zum Dashboard
        </a>
      </div>

      <QuestionnaireClient
        assessmentId={draft.id}
        title="Basis-Fragebogen"
        subtitle="Selbstprofil"
        questions={questions}
        choices={choices}
        responses={responses}
        completeRedirect={completeRedirect}
        allowDefaultScaleFallback={false}
        missingChoicesMessage="Antwortoptionen konnten nicht geladen werden. Bitte neu laden."
      />
    </main>
  );
}
