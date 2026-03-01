import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvitationJoinDecision } from "@/features/reporting/actions";

type PageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ flow?: string }>;
};

function buildBaseHref(invitationId: string, isRefreshFlow: boolean) {
  const search = new URLSearchParams({ invitationId });
  if (isRefreshFlow) search.set("flow", "refresh");
  return `/me/base?${search.toString()}`;
}

function buildValuesHref(invitationId: string, isRefreshFlow: boolean) {
  const search = new URLSearchParams({ invitationId });
  if (isRefreshFlow) search.set("flow", "refresh");
  return `/me/values?${search.toString()}`;
}

function buildDoneHref(invitationId: string) {
  return `/invite/${encodeURIComponent(invitationId)}/done`;
}

function buildDashboardHref(invitationId: string) {
  return `/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`;
}

export default async function InvitationBasisCompletePage({ params, searchParams }: PageProps) {
  const [{ sessionId }, query] = await Promise.all([params, searchParams]);
  const invitationId = sessionId.trim();
  if (!invitationId) {
    redirect("/dashboard");
  }

  const isRefreshFlow = query.flow === "refresh";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = isRefreshFlow
    ? `/invite/${encodeURIComponent(invitationId)}/basis-complete?flow=refresh`
    : `/invite/${encodeURIComponent(invitationId)}/basis-complete`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const decision = await getInvitationJoinDecision(invitationId);
  if (!decision.ok) {
    redirect(`/dashboard?error=${encodeURIComponent(decision.reason)}`);
  }

  if (decision.mode === "report_ready") {
    redirect(buildDoneHref(invitationId));
  }

  const needsBase = isRefreshFlow
    ? decision.required_modules.includes("base") && !decision.invitee_status.has_base_submitted
    : decision.missing_modules.includes("base");
  if (needsBase) {
    redirect(buildBaseHref(invitationId, isRefreshFlow));
  }

  const needsValues = isRefreshFlow
    ? decision.required_modules.includes("values")
    : decision.missing_modules.includes("values");
  if (!needsValues) {
    redirect(buildDoneHref(invitationId));
  }

  const valuesHref = buildValuesHref(invitationId, isRefreshFlow);
  const dashboardHref = buildDashboardHref(invitationId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Zwischenschritt</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Stark. Der Basis-Fragebogen ist geschafft.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Das war der große Schritt. Dein Fortschritt ist sicher gespeichert.
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          Jetzt hast du die Wahl: kurz Pause machen oder direkt mit den 10 Fragen im Werte-Modul weitermachen.
          Danach ist dein Teil komplett.
        </p>
        <p className="mt-2 rounded-xl border border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/10 px-4 py-3 text-sm leading-7 text-slate-700">
          Fast geschafft: Sobald ihr beide fertig seid, erstellt sich euer Matching-Report automatisch.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={valuesHref}
            className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]"
          >
            Jetzt durchziehen: Werte-Modul (10 Fragen)
          </Link>
          <Link
            href={dashboardHref}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Kurz pausieren, später weitermachen
          </Link>
        </div>
      </section>
    </main>
  );
}
