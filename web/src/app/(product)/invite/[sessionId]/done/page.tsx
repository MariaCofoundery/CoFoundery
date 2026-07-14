import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { type ReactNode } from "react";
import { DelayedRedirect } from "@/features/navigation/DelayedRedirect";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { ResearchTrackedLink } from "@/features/research/ResearchTrackedLink";
import {
  applyExistingInvitationProfileChoice,
  ensureReportRunForInvitation,
  getInvitationJoinDecision,
} from "@/features/reporting/actions";
import { buildInvitationDashboardHref } from "@/features/onboarding/invitationFlow";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ useExisting?: string }>;
};

function buildQuestionnaireHref(invitationId: string, module: "base" | "values") {
  const search = new URLSearchParams({ invitationId });
  const path = module === "base" ? "/me/base" : "/me/values";
  return `${path}?${search.toString()}`;
}

function completionButtonClass(variant: "primary" | "secondary" | "ghost" = "primary") {
  if (variant === "primary") {
    return "inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
  }
  if (variant === "secondary") {
    return "inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700";
  }
  return "inline-flex rounded-lg border border-slate-200/70 bg-slate-50 px-4 py-2 text-sm text-slate-700";
}

function CompletionShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.16),transparent_62%)]" />
          <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.10),transparent_72%)] blur-xl" />
        </div>
        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export default async function InvitationDonePage({ params, searchParams }: PageProps) {
  const t = await getTranslations("invite.done");
  const [{ sessionId }, query] = await Promise.all([params, searchParams]);
  const invitationId = sessionId.trim();
  if (!invitationId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${invitationId}/done`)}`);
  }

  const dashboardHref = buildInvitationDashboardHref(invitationId);
  const matchingReportHref = `/report/${encodeURIComponent(invitationId)}`;
  const individualReportHref = "/me/report";
  const valuesModuleHref = buildQuestionnaireHref(invitationId, "values");
  const decision = await getInvitationJoinDecision(invitationId);
  const useExistingChoice = query.useExisting === "1";

  async function navigateWithEnsuredMatchingReport(formData: FormData) {
    "use server";

    const target = String(formData.get("target") ?? "matching");
    const ensureResult = await ensureReportRunForInvitation(invitationId);
    if (!ensureResult.ok) {
      console.error("invite done CTA ensureReportRunForInvitation failed", {
        invitationId,
        target,
        reason: ensureResult.reason,
        detail: ensureResult.detail ?? null,
      });
    }

    if (target === "individual") {
      redirect(individualReportHref);
    }

    if (target === "values") {
      redirect(valuesModuleHref);
    }

    if (target === "dashboard") {
      redirect(dashboardHref);
    }

    redirect(matchingReportHref);
  }

  if (!decision.ok) {
    return (
      <CompletionShell
        eyebrow={t("eyebrow")}
        title={t("error.title")}
        description={t("error.description", { reason: decision.reason })}
      >
          <ResearchTrackedLink
            href={dashboardHref}
            eventName="invite_done_error_dashboard_clicked"
            invitationId={invitationId}
            className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            {t("actions.dashboard")}
          </ResearchTrackedLink>
      </CompletionShell>
    );
  }

  const showValuesNextStep =
    decision.required_modules.includes("values") && !decision.invitee_status.has_values_submitted;

  function renderReadyActions() {
    if (showValuesNextStep) {
      return (
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={navigateWithEnsuredMatchingReport}>
            <input type="hidden" name="target" value="matching" />
            <button type="submit" className={completionButtonClass("primary")}>
              {t("actions.matchingReport")}
            </button>
          </form>
          <form action={navigateWithEnsuredMatchingReport}>
            <input type="hidden" name="target" value="values" />
            <button type="submit" className={completionButtonClass("secondary")}>
              {t("actions.valuesModule")}
            </button>
          </form>
          <ResearchTrackedLink
            href={dashboardHref}
            eventName="invite_done_dashboard_clicked"
            invitationId={invitationId}
            className={completionButtonClass("ghost")}
          >
            {t("actions.dashboard")}
          </ResearchTrackedLink>
        </div>
      );
    }

    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={navigateWithEnsuredMatchingReport}>
          <input type="hidden" name="target" value="matching" />
          <button type="submit" className={completionButtonClass("primary")}>
            {t("actions.matchingReport")}
          </button>
        </form>
        <form action={navigateWithEnsuredMatchingReport}>
          <input type="hidden" name="target" value="individual" />
          <button type="submit" className={completionButtonClass("secondary")}>
            {t("actions.individualReport")}
          </button>
        </form>
        <ResearchTrackedLink
          href={dashboardHref}
          eventName="invite_done_dashboard_clicked"
          invitationId={invitationId}
          className={completionButtonClass("ghost")}
        >
          {t("actions.dashboard")}
        </ResearchTrackedLink>
      </div>
    );
  }

  function renderWaitingActions() {
    if (showValuesNextStep) {
      return (
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={navigateWithEnsuredMatchingReport}>
            <input type="hidden" name="target" value="values" />
            <button type="submit" className={completionButtonClass("primary")}>
              {t("actions.valuesModule")}
            </button>
          </form>
          <ResearchTrackedLink
            href={dashboardHref}
            eventName="invite_done_dashboard_clicked"
            invitationId={invitationId}
            className={completionButtonClass("secondary")}
          >
            {t("actions.dashboard")}
          </ResearchTrackedLink>
        </div>
      );
    }

    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <form action={navigateWithEnsuredMatchingReport}>
          <input type="hidden" name="target" value="individual" />
          <button type="submit" className={completionButtonClass("primary")}>
            {t("actions.individualReport")}
          </button>
        </form>
        <ResearchTrackedLink
          href={dashboardHref}
          eventName="invite_done_dashboard_clicked"
          invitationId={invitationId}
          className={completionButtonClass("secondary")}
        >
          {t("actions.dashboard")}
        </ResearchTrackedLink>
      </div>
    );
  }

  if (decision.mode === "needs_questionnaires") {
    const nextModule = decision.missing_modules.includes("base") ? "base" : "values";
    redirect(buildQuestionnaireHref(invitationId, nextModule));
  }

  if (decision.mode === "report_ready") {
    const ensuredReportResult = await ensureReportRunForInvitation(invitationId);
    return (
      <CompletionShell
        eyebrow={t("eyebrow")}
        title={t("reportReady.title")}
        description={t("reportReady.description")}
      >
          <ResearchPageTracker
            eventName="invite_done_viewed"
            invitationId={invitationId}
            properties={{ state: "report_ready" }}
          />
          <DelayedRedirect href={matchingReportHref} />
          <div className="mt-5 rounded-2xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-4 py-3 text-sm leading-7 text-slate-700">
            {showValuesNextStep
              ? t("reportReady.valuesHint")
              : t("reportReady.completeHint")}
          </div>
          {renderReadyActions()}
          {!ensuredReportResult.ok ? (
            <p className="mt-4 text-xs text-slate-500">
              {t("reportReady.retryHint", { reason: ensuredReportResult.reason })}
            </p>
          ) : null}
      </CompletionShell>
    );
  }

  if (decision.requires_existing_profile_choice) {
    if (useExistingChoice) {
      const existingProfileResult = await applyExistingInvitationProfileChoice(invitationId);
      if (existingProfileResult.ok && existingProfileResult.reportRunId) {
        redirect(matchingReportHref);
      }
      if (existingProfileResult.ok && existingProfileResult.waiting) {
        return (
          <CompletionShell
            eyebrow={t("eyebrow")}
            title={t("existingProfileLinked.title")}
            description={t("existingProfileLinked.description")}
          >
            <ResearchPageTracker
              eventName="invite_done_viewed"
              invitationId={invitationId}
              properties={{ state: "waiting_for_answers_after_existing_choice" }}
            />
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700">
              {t("existingProfileLinked.hint")}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ResearchTrackedLink
                href={dashboardHref}
                eventName="invite_done_dashboard_clicked"
                invitationId={invitationId}
                className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
              >
                {t("actions.toDashboard")}
              </ResearchTrackedLink>
            </div>
          </CompletionShell>
        );
      }
    }

    const refreshStartModule = decision.required_modules.includes("base") ? "base" : "values";
    const refreshSearch = new URLSearchParams({ invitationId, flow: "refresh" });
    const refreshHref = `${
      refreshStartModule === "base" ? "/me/base" : "/me/values"
    }?${refreshSearch.toString()}`;
    const useExistingHref = `/invite/${encodeURIComponent(invitationId)}/done?useExisting=1`;

    return (
      <CompletionShell
        eyebrow={t("eyebrow")}
        title={t("existingChoice.title")}
        description={t("existingChoice.description")}
      >
        <ResearchPageTracker
          eventName="invite_done_viewed"
          invitationId={invitationId}
          properties={{ state: "existing_profile_choice" }}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
            <p className="font-medium text-slate-900">{t("existingChoice.useExistingTitle")}</p>
            <p className="mt-2">
              {t("existingChoice.useExistingText")}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
            <p className="font-medium text-slate-900">{t("existingChoice.refreshTitle")}</p>
            <p className="mt-2">
              {t("existingChoice.refreshText")}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <ResearchTrackedLink
            href={useExistingHref}
            eventName="invite_done_use_existing_clicked"
            invitationId={invitationId}
            className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
          >
            {t("actions.useExisting")}
          </ResearchTrackedLink>
          <ResearchTrackedLink
            href={refreshHref}
            eventName="invite_done_refresh_clicked"
            invitationId={invitationId}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            {t("actions.refresh")}
          </ResearchTrackedLink>
        </div>
      </CompletionShell>
    );
  }

  const ensuredReportResult = await ensureReportRunForInvitation(invitationId);
  if (ensuredReportResult.ok) {
    return (
      <CompletionShell
        eyebrow={t("eyebrow")}
        title={t("finalized.title")}
        description={t("finalized.description")}
      >
          <ResearchPageTracker
            eventName="invite_done_viewed"
            invitationId={invitationId}
            properties={{ state: "finalized_now" }}
          />
          <DelayedRedirect href={matchingReportHref} />
          <div className="mt-5 rounded-2xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-4 py-3 text-sm leading-7 text-slate-700">
            {showValuesNextStep
              ? t("finalized.valuesHint")
              : t("finalized.reportHint")}
          </div>
          {renderReadyActions()}
      </CompletionShell>
    );
  }

  if (ensuredReportResult.reason === "waiting_for_answers") {
    return (
      <CompletionShell
        eyebrow={t("eyebrow")}
        title={t("waiting.title")}
        description={t("waiting.description")}
      >
          <ResearchPageTracker
            eventName="invite_done_viewed"
            invitationId={invitationId}
            properties={{ state: "waiting_for_answers" }}
          />
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700">
            {showValuesNextStep
              ? t("waiting.valuesHint")
              : t("waiting.dashboardHint")}
          </div>
          {renderWaitingActions()}
      </CompletionShell>
    );
  }

  return (
    <CompletionShell
      eyebrow={t("eyebrow")}
      title={t("fallback.title")}
      description={t("fallback.description", { reason: ensuredReportResult.reason })}
    >
        <ResearchPageTracker
          eventName="invite_done_viewed"
          invitationId={invitationId}
          properties={{ state: "error", reason: ensuredReportResult.reason }}
        />
        {renderWaitingActions()}
    </CompletionShell>
  );
}
