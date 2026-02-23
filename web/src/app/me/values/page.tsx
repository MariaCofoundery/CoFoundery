import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDraftAssessment,
  getAssessmentAnswerMap,
  getLatestSubmittedAssessment,
  getOwnedDraftAssessment,
  getOrCreateDraftAssessment,
} from "@/features/assessments/actions";
import { getInvitationJoinDecision } from "@/features/reporting/actions";
import {
  type QuestionnaireChoice,
  type QuestionnaireQuestion,
  type QuestionnaireResponse,
} from "@/features/questionnaire/QuestionnaireClient";
import { ValuesQuestionnaire } from "@/features/questionnaire/ValuesQuestionnaire";

type MeValuesSearchParams = {
  invitationId?: string;
  flow?: string;
  assessmentId?: string;
};

export default async function MeValuesPage({
  searchParams,
}: {
  searchParams: Promise<MeValuesSearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/values");
  }

  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const isRefreshFlow = params.flow === "refresh";

  let completeRedirect = "/dashboard?valuesStatus=completed";
  if (invitationId) {
    const decision = await getInvitationJoinDecision(invitationId);
    if (!decision.ok) {
      redirect(`/dashboard?error=${encodeURIComponent(decision.reason)}`);
    }

    const needsValues = isRefreshFlow
      ? decision.required_modules.includes("values")
      : decision.missing_modules.includes("values");
    if (!needsValues) {
      redirect(`/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`);
    }

    const needsBaseFirst = isRefreshFlow
      ? decision.required_modules.includes("base") && !decision.invitee_status.has_base_submitted
      : decision.missing_modules.includes("base");
    if (needsBaseFirst) {
      const baseSearch = new URLSearchParams({ invitationId });
      if (isRefreshFlow) baseSearch.set("flow", "refresh");
      redirect(`/me/base?${baseSearch.toString()}`);
    }

    completeRedirect = `/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`;
  }

  const submittedBase = await getLatestSubmittedAssessment("base");
  if (!submittedBase) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h1 className="text-xl font-semibold text-slate-900">Basis zuerst abschließen</h1>
          <p className="mt-3 text-sm text-slate-700">
            Das Werte Add-on ist verfügbar, sobald dein Basis-Fragebogen eingereicht ist.
          </p>
          <a
            href="/me/base"
            className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            Basis-Fragebogen starten
          </a>
        </section>
      </main>
    );
  }

  let draft = null as Awaited<ReturnType<typeof getOrCreateDraftAssessment>> | null;
  if (invitationId && isRefreshFlow) {
    const refreshDraftId = params.assessmentId?.trim() ?? "";
    if (refreshDraftId) {
      draft = await getOwnedDraftAssessment("values", refreshDraftId);
    }
    if (!draft) {
      const freshDraft = await createDraftAssessment("values");
      const refreshSearch = new URLSearchParams({
        invitationId,
        flow: "refresh",
        assessmentId: freshDraft.id,
      });
      redirect(`/me/values?${refreshSearch.toString()}`);
    }
  } else {
    draft = await getOrCreateDraftAssessment("values");
  }
  if (!draft) {
    return <main className="p-8">Fehler beim Erstellen des Werte-Fragebogens.</main>;
  }

  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, dimension, type, prompt, sort_order")
    .eq("is_active", true)
    .eq("category", "values")
    .order("sort_order", { ascending: true });

  if (questionsError) {
    return <main className="p-8">Fehler beim Laden des Werte-Add-ons: {questionsError.message}</main>;
  }

  const questions = (questionsData ?? []) as QuestionnaireQuestion[];
  const questionIds = questions.map((question) => question.id);

  const [{ data: choicesData }, answerMap] = await Promise.all([
    questionIds.length > 0
      ? supabase
          .from("choices")
          .select("id, question_id, label, value, sort_order")
          .in("question_id", questionIds)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as QuestionnaireChoice[] }),
    getAssessmentAnswerMap(draft.id),
  ]);

  const choices = (choicesData ?? []) as QuestionnaireChoice[];
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

      <ValuesQuestionnaire
        assessmentId={draft.id}
        questions={questions}
        choices={choices}
        responses={responses}
        completeRedirect={completeRedirect}
      />
    </main>
  );
}
