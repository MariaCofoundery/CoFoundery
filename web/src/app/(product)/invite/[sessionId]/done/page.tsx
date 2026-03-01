import Link from "next/link";
import { redirect } from "next/navigation";
import { DelayedRedirect } from "@/features/navigation/DelayedRedirect";
import {
  finalizeInvitationIfReady,
  getInvitationJoinDecision,
} from "@/features/reporting/actions";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

function buildDashboardHref(invitationId: string) {
  return `/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`;
}

function buildQuestionnaireHref(invitationId: string, module: "base" | "values") {
  const search = new URLSearchParams({ invitationId });
  const path = module === "base" ? "/me/base" : "/me/values";
  return `${path}?${search.toString()}`;
}

export default async function InvitationDonePage({ params }: PageProps) {
  const { sessionId } = await params;
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

  const dashboardHref = buildDashboardHref(invitationId);
  const reportHref = `/report/${encodeURIComponent(invitationId)}`;
  const decision = await getInvitationJoinDecision(invitationId);

  if (!decision.ok) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Einladung nicht verfügbar</h1>
          <p className="mt-3 text-sm text-slate-700">
            Die Einladung konnte nicht geladen werden ({decision.reason}).
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </Link>
        </section>
      </main>
    );
  }

  if (decision.mode === "needs_questionnaires") {
    const nextModule = decision.missing_modules.includes("base") ? "base" : "values";
    redirect(buildQuestionnaireHref(invitationId, nextModule));
  }

  if (decision.mode === "report_ready") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <DelayedRedirect href={reportHref} />
          <h1 className="text-2xl font-semibold text-slate-900">Stark, alles ausgefüllt</h1>
          <p className="mt-3 text-sm text-slate-700">
            Euer Matching-Report ist bereit. Du wirst in wenigen Sekunden weitergeleitet.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={reportHref}
              className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
            >
              Report öffnen
            </Link>
            <Link
              href={dashboardHref}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Zurück zum Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const finalizeResult = await finalizeInvitationIfReady(invitationId);
  if (finalizeResult.ok) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <DelayedRedirect href={reportHref} />
          <h1 className="text-2xl font-semibold text-slate-900">Stark, alles ausgefüllt</h1>
          <p className="mt-3 text-sm text-slate-700">
            Euer Matching-Report wurde erstellt. Du wirst in wenigen Sekunden weitergeleitet.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={reportHref}
              className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
            >
              Report öffnen
            </Link>
            <Link
              href={dashboardHref}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Zurück zum Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (finalizeResult.reason === "waiting_for_answers") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Stark, alles ausgefüllt</h1>
          <p className="mt-3 text-sm text-slate-700">
            Deine Antworten sind gespeichert. Sobald die andere Person fertig ist, wird euer Matching-Report
            automatisch erstellt.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={reportHref}
              className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
            >
              Report öffnen
            </Link>
            <Link
              href={dashboardHref}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Zurück zum Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Fragebogen abgeschlossen</h1>
        <p className="mt-3 text-sm text-slate-700">
          Der Report konnte gerade noch nicht erstellt werden ({finalizeResult.reason}). Bitte prüfe den Status im
          Dashboard.
        </p>
        <div className="mt-6">
          <Link
            href={dashboardHref}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
