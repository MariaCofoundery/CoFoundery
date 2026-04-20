import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAssessmentAnswerMap,
  getLatestSubmittedAssessment,
  getOwnedDraftAssessment,
  getOrCreateDraftAssessment,
} from "@/features/assessments/actions";
import { ensureInvitationMatchingBinding } from "@/features/assessments/matchingBindings";
import { getInvitationJoinDecision } from "@/features/reporting/actions";
import {
  type QuestionnaireChoice,
  type QuestionnaireResponse,
} from "@/features/questionnaire/QuestionnaireClient";
import { type QuestionnaireQuestion } from "@/features/questionnaire/questionnaireShared";
import { ValuesQuestionnaire } from "@/features/questionnaire/ValuesQuestionnaire";
import { getValuesQuestionVersionMismatch } from "@/features/reporting/valuesQuestionMeta";
import { logInviteFlowDebug } from "@/features/onboarding/inviteFlowDebug";

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
  let trackingTeamContext: "pre_founder" | "existing_team" | null = null;

  let completeRedirect = "/me/values/complete";
  if (invitationId) {
    const decision = await getInvitationJoinDecision(invitationId);
    logInviteFlowDebug("me/values:join_decision", {
      invitationId,
      userId: user.id,
      isRefreshFlow,
      decision,
    });
    if (!decision.ok) {
      logInviteFlowDebug("me/values:redirect_dashboard_error", {
        invitationId,
        userId: user.id,
        reason: decision.reason,
      });
      redirect(`/dashboard?error=${encodeURIComponent(decision.reason)}`);
    }
    trackingTeamContext = decision.team_context;

    const needsValues = isRefreshFlow
      ? decision.required_modules.includes("values")
      : decision.missing_modules.includes("values");
    if (!needsValues) {
      redirect(`/invite/${encodeURIComponent(invitationId)}/done`);
    }

    const needsBaseFirst = isRefreshFlow
      ? decision.required_modules.includes("base") && !decision.invitee_status.has_base_submitted
      : decision.missing_modules.includes("base");
    if (needsBaseFirst) {
      const baseSearch = new URLSearchParams({ invitationId });
      if (isRefreshFlow) baseSearch.set("flow", "refresh");
      logInviteFlowDebug("me/values:redirect_base", {
        invitationId,
        userId: user.id,
        redirectTo: `/me/base?${baseSearch.toString()}`,
      });
      redirect(`/me/base?${baseSearch.toString()}`);
    }

    completeRedirect = `/invite/${encodeURIComponent(invitationId)}/done`;
  }
  logInviteFlowDebug("me/values:resolved", {
    invitationId,
    userId: user.id,
    completeRedirect,
  });

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
  if (invitationId) {
    const explicitDraftId = params.assessmentId?.trim() ?? "";
    let binding;
    try {
      binding = await ensureInvitationMatchingBinding(invitationId, user.id, "values", {
        assessmentId: explicitDraftId || null,
        createDraftIfMissing: true,
        replaceExisting: isRefreshFlow || Boolean(explicitDraftId),
      });
    } catch {
      binding = await ensureInvitationMatchingBinding(invitationId, user.id, "values", {
        createDraftIfMissing: true,
        replaceExisting: isRefreshFlow,
      });
    }
    draft = await getOwnedDraftAssessment("values", binding.assessmentId);
    if (!draft) {
      const rebound = await ensureInvitationMatchingBinding(invitationId, user.id, "values", {
        createDraftIfMissing: true,
        replaceExisting: true,
      });
      draft = await getOwnedDraftAssessment("values", rebound.assessmentId);
    }
  } else {
    draft = await getOrCreateDraftAssessment("values");
  }
  if (!draft) {
    return <main className="p-8">Fehler beim Erstellen des Werte-Fragebogens.</main>;
  }

  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, dimension, type, prompt, sort_order, is_active, category")
    .eq("is_active", true)
    .eq("category", "values")
    .order("sort_order", { ascending: true });

  if (questionsError) {
    return <main className="p-8">Fehler beim Laden des Werte-Add-ons: {questionsError.message}</main>;
  }

  const questions = (questionsData ?? []) as QuestionnaireQuestion[];
  const valuesQuestionMismatch = getValuesQuestionVersionMismatch(questions.map((question) => question.id));
  if (process.env.NODE_ENV !== "production" && !valuesQuestionMismatch.isAligned) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <h1 className="text-base font-semibold text-red-900">Werte-Fragebogen</h1>
          <p className="mt-2 text-sm text-red-700">
            Die aktive Werte-Fragenbasis stimmt nicht mit der versionierten Werte-Definition im Repo überein.
          </p>
          <p className="mt-2 text-xs text-red-800">
            Unknown: {valuesQuestionMismatch.unknownIds.join(", ") || "keine"} · Missing:{" "}
            {valuesQuestionMismatch.missingIds.join(", ") || "keine"}
          </p>
        </section>
      </main>
    );
  }
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
          <h1 className="text-base font-semibold text-red-900">Werte-Fragebogen</h1>
          <p className="mt-2 text-sm text-red-700">
            Antwortoptionen konnten nicht geladen werden. Bitte neu laden.
          </p>
        </section>
      </main>
    );
  }

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

      <section className="mb-5 rounded-2xl border border-slate-200/70 bg-slate-50/72 px-5 py-4">
        <p className="text-sm leading-7 text-slate-700">Das Werteprofil ist optional.</p>
        <p className="mt-1 text-sm leading-7 text-slate-600">
          Es hilft euch zu klären, was für euch unter Druck wirklich zählt und wo ihr klare
          Grenzen zieht.
        </p>
        <p className="mt-1 text-sm leading-7 text-slate-600">
          Ihr könnt es direkt machen oder auch später ergänzen.
        </p>
      </section>

      <ValuesQuestionnaire
        assessmentId={draft.id}
        questions={questions}
        choices={choices}
        responses={responses}
        completeRedirect={completeRedirect}
        trackingContext={{
          module: "values",
          instrumentVersion: "values_v2",
          invitationId,
          teamContext: trackingTeamContext,
        }}
      />
    </main>
  );
}
