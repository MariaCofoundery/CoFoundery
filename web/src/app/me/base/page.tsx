import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDraftAssessment,
  getAssessmentAnswerMap,
  getOwnedDraftAssessment,
  getOrCreateDraftAssessment,
} from "@/features/assessments/actions";
import { ensureInvitationMatchingBinding } from "@/features/assessments/matchingBindings";
import {
  buildFounderCompatibilityBaseQuestionnaire,
  hasIncompatibleLegacyFounderBaseAnswers,
  normalizeFounderCompatibilityBaseDraftAnswerMap,
} from "@/features/questionnaire/founderCompatibilityBaseQuestionnaire";
import { getInvitationJoinDecision } from "@/features/reporting/actions";
import {
  QuestionnaireClient,
  type QuestionnaireResponse,
} from "@/features/questionnaire/QuestionnaireClient";
import {
  buildInvitationDashboardHref,
  resolveActiveInvitationIdForCurrentUser,
} from "@/features/onboarding/invitationFlow";
import { logInviteFlowDebug } from "@/features/onboarding/inviteFlowDebug";

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
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextSearch = new URLSearchParams();
    if (params.invitationId?.trim()) {
      nextSearch.set("invitationId", params.invitationId.trim());
    }
    if (params.flow === "refresh") {
      nextSearch.set("flow", "refresh");
    }
    if (params.assessmentId?.trim()) {
      nextSearch.set("assessmentId", params.assessmentId.trim());
    }
    const nextPath = nextSearch.toString() ? `/me/base?${nextSearch.toString()}` : "/me/base";
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const invitationIdFromParams = params.invitationId?.trim() || null;
  const recoveredInvitationId = invitationIdFromParams
    ? null
    : await resolveActiveInvitationIdForCurrentUser();
  const invitationId = invitationIdFromParams ?? recoveredInvitationId;
  const isRefreshFlow = params.flow === "refresh";
  const dashboardHref = invitationId ? buildInvitationDashboardHref(invitationId) : "/dashboard";
  let trackingTeamContext: "pre_founder" | "existing_team" | null = null;

  if (!invitationIdFromParams && recoveredInvitationId) {
    logInviteFlowDebug("me/base:recovered_invitation_context", {
      recoveredInvitationId,
      userId: user.id,
    });
  }

  let completeRedirect = "/me/base/complete";
  if (invitationId) {
    const decision = await getInvitationJoinDecision(invitationId);
    logInviteFlowDebug("me/base:join_decision", {
      invitationId,
      userId: user.id,
      isRefreshFlow,
      decision,
    });
    if (!decision.ok) {
      logInviteFlowDebug("me/base:redirect_dashboard_error", {
        invitationId,
        userId: user.id,
        reason: decision.reason,
      });
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
        logInviteFlowDebug("me/base:redirect_values", {
          invitationId,
          userId: user.id,
          redirectTo: `/me/values?${valuesSearch.toString()}`,
        });
        redirect(`/me/values?${valuesSearch.toString()}`);
      }
      logInviteFlowDebug("me/base:redirect_done", {
        invitationId,
        userId: user.id,
        redirectTo: `/invite/${encodeURIComponent(invitationId)}/done`,
      });
      redirect(`/invite/${encodeURIComponent(invitationId)}/done`);
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
  logInviteFlowDebug("me/base:resolved", {
    invitationId,
    userId: user.id,
    completeRedirect,
  });

  const explicitDraftId = params.assessmentId?.trim() ?? "";
  let draft = null as Awaited<ReturnType<typeof getOrCreateDraftAssessment>> | null;
  if (explicitDraftId && !invitationId) {
    draft = await getOwnedDraftAssessment("base", explicitDraftId);
  }
  if (!draft && invitationId) {
    let binding;
    try {
      binding = await ensureInvitationMatchingBinding(invitationId, user.id, "base", {
        assessmentId: explicitDraftId || null,
        createDraftIfMissing: true,
        replaceExisting: isRefreshFlow || Boolean(explicitDraftId),
      });
    } catch {
      binding = await ensureInvitationMatchingBinding(invitationId, user.id, "base", {
        createDraftIfMissing: true,
        replaceExisting: isRefreshFlow,
      });
    }
    draft = await getOwnedDraftAssessment("base", binding.assessmentId);
    if (!draft) {
      const rebound = await ensureInvitationMatchingBinding(invitationId, user.id, "base", {
        createDraftIfMissing: true,
        replaceExisting: true,
      });
      draft = await getOwnedDraftAssessment("base", rebound.assessmentId);
    }
  }
  if (!draft) {
    draft = await getOrCreateDraftAssessment("base");
  }
  if (!draft) {
    return <main className="p-8">Fehler beim Erstellen des Fragebogens.</main>;
  }

  const { questions, choices } = buildFounderCompatibilityBaseQuestionnaire();
  const rawAnswerMap = await getAssessmentAnswerMap(draft.id);
  if (hasIncompatibleLegacyFounderBaseAnswers(rawAnswerMap)) {
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
  const answerMap = normalizeFounderCompatibilityBaseDraftAnswerMap(rawAnswerMap);

  const responses: QuestionnaireResponse[] = Object.entries(answerMap).map(([questionId, choiceValue]) => ({
    question_id: questionId,
    choice_value: choiceValue,
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
      <div className="mb-5 flex items-center justify-between">
        <a
          href={dashboardHref}
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
          instrumentVersion: "founder_base_v2",
          invitationId,
          teamContext: trackingTeamContext,
        }}
      />
    </main>
  );
}
