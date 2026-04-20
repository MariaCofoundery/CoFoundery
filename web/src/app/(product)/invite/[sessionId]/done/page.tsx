import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { DelayedRedirect } from "@/features/navigation/DelayedRedirect";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { ResearchTrackedLink } from "@/features/research/ResearchTrackedLink";
import {
  applyExistingInvitationProfileChoice,
  finalizeInvitationIfReady,
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

function CompletionShell({
  title,
  description,
  children,
}: {
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
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Abschluss</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export default async function InvitationDonePage({ params, searchParams }: PageProps) {
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
  const reportHref = `/report/${encodeURIComponent(invitationId)}`;
  const decision = await getInvitationJoinDecision(invitationId);
  const useExistingChoice = query.useExisting === "1";

  if (!decision.ok) {
    return (
      <CompletionShell
        title="Einladung nicht verfügbar"
        description={`Die Einladung konnte nicht geladen werden (${decision.reason}).`}
      >
          <ResearchTrackedLink
            href="/dashboard"
            eventName="invite_done_error_dashboard_clicked"
            invitationId={invitationId}
            className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </ResearchTrackedLink>
      </CompletionShell>
    );
  }

  if (decision.mode === "needs_questionnaires") {
    const nextModule = decision.missing_modules.includes("base") ? "base" : "values";
    redirect(buildQuestionnaireHref(invitationId, nextModule));
  }

  if (decision.mode === "report_ready") {
    return (
      <CompletionShell
        title="Stark, alles ist komplett."
        description="Euer Founder-Report ist bereit. Du wirst in wenigen Sekunden weitergeleitet und kannst ihn direkt gemeinsam nutzen."
      >
          <ResearchPageTracker
            eventName="invite_done_viewed"
            invitationId={invitationId}
            properties={{ state: "report_ready" }}
          />
          <DelayedRedirect href={reportHref} />
          <div className="mt-5 rounded-2xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-4 py-3 text-sm leading-7 text-slate-700">
            Basisprofil und ggf. Werteprofil sind jetzt im gemeinsamen Report zusammengeführt.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ResearchTrackedLink
              href={reportHref}
              eventName="invite_done_report_clicked"
              invitationId={invitationId}
              className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
            >
              Report öffnen
            </ResearchTrackedLink>
            <ResearchTrackedLink
              href={dashboardHref}
              eventName="invite_done_dashboard_clicked"
              invitationId={invitationId}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Zurück zum Dashboard
            </ResearchTrackedLink>
          </div>
      </CompletionShell>
    );
  }

  if (decision.requires_existing_profile_choice) {
    if (useExistingChoice) {
      const existingProfileResult = await applyExistingInvitationProfileChoice(invitationId);
      if (existingProfileResult.ok && existingProfileResult.reportRunId) {
        redirect(reportHref);
      }
      if (existingProfileResult.ok && existingProfileResult.waiting) {
        return (
          <CompletionShell
            title="Dein bestehendes Profil ist eingebunden."
            description="Deine bereits eingereichten Antworten gelten jetzt für diese Einladung. Sobald die andere Person fertig ist, wird euer Matching-Report erstellt."
          >
            <ResearchPageTracker
              eventName="invite_done_viewed"
              invitationId={invitationId}
              properties={{ state: "waiting_for_answers_after_existing_choice" }}
            />
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700">
              Du musst jetzt nichts weiter tun. Im Dashboard siehst du später direkt, sobald euer gemeinsamer Report bereitsteht.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <ResearchTrackedLink
                href={dashboardHref}
                eventName="invite_done_dashboard_clicked"
                invitationId={invitationId}
                className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
              >
                Zum Dashboard
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
        title="Wie möchtest du für dieses Matching starten?"
        description="Du hast bereits ein eingereichtes Profil. Für dieses Matching kannst du es bewusst übernehmen oder für diesen Kontext neu beantworten."
      >
        <ResearchPageTracker
          eventName="invite_done_viewed"
          invitationId={invitationId}
          properties={{ state: "existing_profile_choice" }}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
            <p className="font-medium text-slate-900">Bestehendes Profil verwenden</p>
            <p className="mt-2">
              Nutze deine zuletzt eingereichten Antworten als Matching-Grundlage für diese Einladung.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
            <p className="font-medium text-slate-900">Für dieses Matching neu beantworten</p>
            <p className="mt-2">
              Starte mit einem frischen Lauf, wenn du deinen aktuellen Stand bewusst neu einbringen willst.
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
            Bestehendes Profil verwenden
          </ResearchTrackedLink>
          <ResearchTrackedLink
            href={refreshHref}
            eventName="invite_done_refresh_clicked"
            invitationId={invitationId}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Neu beantworten
          </ResearchTrackedLink>
        </div>
      </CompletionShell>
    );
  }

  const finalizeResult = await finalizeInvitationIfReady(invitationId);
  if (finalizeResult.ok) {
    return (
      <CompletionShell
        title="Sehr gut, dein Teil ist abgeschlossen."
        description="Deine Antworten sind gespeichert und euer gemeinsamer Founder-Report wurde gerade erzeugt. Du wirst in wenigen Sekunden weitergeleitet."
      >
          <ResearchPageTracker
            eventName="invite_done_viewed"
            invitationId={invitationId}
            properties={{ state: "finalized_now" }}
          />
          <DelayedRedirect href={reportHref} />
          <div className="mt-5 rounded-2xl border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 px-4 py-3 text-sm leading-7 text-slate-700">
            Jetzt lohnt sich der Blick in den Report besonders: Dort werden Unterschiede, Stärken und erste Gesprächsfelder direkt sichtbar.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ResearchTrackedLink
              href={reportHref}
              eventName="invite_done_report_clicked"
              invitationId={invitationId}
              className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
            >
              Report öffnen
            </ResearchTrackedLink>
            <ResearchTrackedLink
              href={dashboardHref}
              eventName="invite_done_dashboard_clicked"
              invitationId={invitationId}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Zurück zum Dashboard
            </ResearchTrackedLink>
          </div>
      </CompletionShell>
    );
  }

  if (finalizeResult.reason === "waiting_for_answers") {
    return (
      <CompletionShell
        title="Sehr gut, dein Teil ist abgeschlossen."
        description="Deine Antworten sind gespeichert. Sobald die andere Person fertig ist, erstellt sich euer Founder-Report automatisch."
      >
          <ResearchPageTracker
            eventName="invite_done_viewed"
            invitationId={invitationId}
            properties={{ state: "waiting_for_answers" }}
          />
          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-7 text-slate-700">
            Du musst jetzt nichts weiter tun. Im Dashboard siehst du später direkt, sobald euer gemeinsamer Report bereitsteht.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <ResearchTrackedLink
              href={dashboardHref}
              eventName="invite_done_dashboard_clicked"
              invitationId={invitationId}
              className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
            >
              Zum Dashboard
            </ResearchTrackedLink>
            <ResearchTrackedLink
              href={reportHref}
              eventName="invite_done_report_clicked"
              invitationId={invitationId}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Report öffnen
            </ResearchTrackedLink>
          </div>
      </CompletionShell>
    );
  }

  return (
    <CompletionShell
      title="Fragebogen abgeschlossen"
      description={`Der Report konnte gerade noch nicht erstellt werden (${finalizeResult.reason}). Bitte prüfe den Status im Dashboard.`}
    >
        <ResearchPageTracker
          eventName="invite_done_viewed"
          invitationId={invitationId}
          properties={{ state: "error", reason: finalizeResult.reason }}
        />
        <div className="mt-6">
          <ResearchTrackedLink
            href={dashboardHref}
            eventName="invite_done_error_dashboard_clicked"
            invitationId={invitationId}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </ResearchTrackedLink>
        </div>
    </CompletionShell>
  );
}
