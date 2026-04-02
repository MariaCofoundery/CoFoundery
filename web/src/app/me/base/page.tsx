import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDraftAssessment,
  getAssessmentAnswerMap,
  getOwnedDraftAssessment,
  getOrCreateDraftAssessment,
} from "@/features/assessments/actions";
import {
  buildFounderCompatibilityBaseQuestionnaire,
  hasLegacyFounderBaseAnswers,
} from "@/features/questionnaire/founderCompatibilityBaseQuestionnaire";
import { getInvitationJoinDecision } from "@/features/reporting/actions";
import {
  QuestionnaireClient,
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
  let trackingTeamContext: "pre_founder" | "existing_team" | null = null;

  let completeRedirect = "/me/base/complete";
  if (invitationId) {
    const decision = await getInvitationJoinDecision(invitationId);
    if (!decision.ok) {
      redirect(`/dashboard?error=${encodeURIComponent(decision.reason)}`);
    }
    trackingTeamContext = decision.team_context;

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
      const transitionSearch = new URLSearchParams();
      if (isRefreshFlow) transitionSearch.set("flow", "refresh");
      const transitionQuery = transitionSearch.toString();
      completeRedirect = transitionQuery
        ? `/invite/${encodeURIComponent(invitationId)}/basis-complete?${transitionQuery}`
        : `/invite/${encodeURIComponent(invitationId)}/basis-complete`;
    } else {
      completeRedirect = `/invite/${encodeURIComponent(invitationId)}/done`;
    }
  }

  const explicitDraftId = params.assessmentId?.trim() ?? "";
  let draft = null as Awaited<ReturnType<typeof getOrCreateDraftAssessment>> | null;
  if (explicitDraftId) {
    draft = await getOwnedDraftAssessment("base", explicitDraftId);
  }
  if (!draft && invitationId && isRefreshFlow) {
    const freshDraft = await createDraftAssessment("base");
    const refreshSearch = new URLSearchParams({
      invitationId,
      flow: "refresh",
      assessmentId: freshDraft.id,
    });
    redirect(`/me/base?${refreshSearch.toString()}`);
  }
  if (!draft) {
    draft = await getOrCreateDraftAssessment("base");
  }
  if (!draft) {
    return <main className="p-8">Fehler beim Erstellen des Fragebogens.</main>;
  }

  const { questions, choices } = buildFounderCompatibilityBaseQuestionnaire();
  const answerMap = await getAssessmentAnswerMap(draft.id);
  if (hasLegacyFounderBaseAnswers(answerMap)) {
    const freshDraft = await createDraftAssessment("base");
    const nextSearch = new URLSearchParams();
    if (invitationId) {
      nextSearch.set("invitationId", invitationId);
    }
    if (isRefreshFlow) {
      nextSearch.set("flow", "refresh");
    }
    nextSearch.set("assessmentId", freshDraft.id);
    redirect(`/me/base?${nextSearch.toString()}`);
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

      <section className="mb-5 rounded-2xl border border-slate-200/70 bg-slate-50/72 px-5 py-4">
        <p className="text-sm leading-7 text-slate-700">
          Hier legt ihr die Grundlage für euren Matching-Report.
        </p>
      </section>

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
        trackingContext={{
          module: "base",
          invitationId,
          teamContext: trackingTeamContext,
        }}
      />
    </main>
  );
}
