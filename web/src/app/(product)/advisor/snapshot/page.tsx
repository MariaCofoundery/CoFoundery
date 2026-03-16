import Link from "next/link";
import { redirect } from "next/navigation";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import {
  FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  type FounderAlignmentWorkbookAdvisorFollowUp,
} from "@/features/reporting/founderAlignmentWorkbook";
import { getFounderAlignmentWorkbookPageData } from "@/features/reporting/founderAlignmentWorkbookData";
import { createClient } from "@/lib/supabase/server";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
};

function resolveTeamContext(value: string | undefined) {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function teamContextLabel(teamContext: "pre_founder" | "existing_team") {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Pre-Founder";
}

function followUpLabel(value: FounderAlignmentWorkbookAdvisorFollowUp) {
  if (value === "four_weeks") return "Follow-up in 4 Wochen";
  if (value === "three_months") return "Follow-up in 3 Monaten";
  return "Kein Follow-up gesetzt";
}

function founderReactionLabel(value: "understood" | "open" | "in_clarification" | null) {
  if (value === "understood") return "verstanden";
  if (value === "open") return "offen";
  if (value === "in_clarification") return "wird geklaert";
  return "Noch keine Founder-Reaktion";
}

export default async function AdvisorSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);

  if (!invitationId) {
    redirect("/advisor/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getFounderAlignmentWorkbookPageData(invitationId, requestedTeamContext);

  if (data.status !== "ready") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 md:px-10">
        <div className="rounded-[32px] border border-slate-200/80 bg-white/95 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Advisor Snapshot</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            Snapshot aktuell noch nicht verfuegbar
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            Fuer diesen Team-Kontext ist noch kein belastbarer Snapshot verfuegbar.
          </p>
          <div className="mt-6">
            <Link
              href="/advisor/dashboard"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Zurueck zum Advisor Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (data.currentUserRole !== "advisor") {
    redirect("/dashboard");
  }

  const founderALabel = data.founderAName?.trim() || "Founder A";
  const founderBLabel = data.founderBName?.trim() || "Founder B";
  const focusSteps = FOUNDER_ALIGNMENT_WORKBOOK_STEPS.filter((step) =>
    data.highlights.prioritizedStepIds.includes(step.id)
  ).slice(0, 3);

  return (
    <main className="print-document-root mx-auto min-h-screen w-full max-w-5xl px-6 py-16 md:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/advisor/dashboard"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Zurueck zum Advisor Dashboard
        </Link>
        <PrintReportButton label="Snapshot exportieren" />
      </div>

      <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:p-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Advisor Snapshot</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            {founderALabel} x {founderBLabel}
          </h1>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex rounded-full border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/7 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
              {teamContextLabel(data.teamContext)}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
              {followUpLabel(data.workbook.advisorFollowUp)}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
            Kompakter Coaching-Snapshot mit Fokusfeldern, Advisor-Impulsen, Founder-Reaktion und
            den naechsten sinnvollen Schritten.
          </p>
        </header>

        <div className="mt-8 grid gap-5">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Wichtigste Fokusfelder</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FocusCard
                title="Staerkste gemeinsame Grundlage"
                text={data.highlights.topStrength || "Noch keine hervorgehobene Staerke."}
              />
              <FocusCard
                title="Ergaenzende Dynamik"
                text={
                  data.highlights.topComplementaryDynamic ||
                  "Noch keine hervorgehobene ergaenzende Dynamik."
                }
              />
              <FocusCard
                title="Wichtigstes Spannungsthema"
                text={data.highlights.topTension || "Noch kein hervorgehobenes Spannungsthema."}
              />
            </div>
            {focusSteps.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Priorisierte Gesprächsfelder</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  {focusSteps.map((step) => (
                    <li key={step.id}>• {step.title}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-[color:var(--brand-accent)]/16 bg-[color:var(--brand-accent)]/6 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Advisor-Impulse</p>
            <div className="mt-4 grid gap-4">
              <FocusCard
                title="Beobachtungen"
                text={data.workbook.advisorClosing.observations || "Noch keine Beobachtungen festgehalten."}
              />
              <FocusCard
                title="Rueckfragen"
                text={data.workbook.advisorClosing.questions || "Noch keine Rueckfragen festgehalten."}
              />
              <FocusCard
                title="Empfohlene naechste Schritte"
                text={data.workbook.advisorClosing.nextSteps || "Noch keine Empfehlungen festgehalten."}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/6 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Founder-Reaktion</p>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {founderReactionLabel(data.workbook.founderReaction.status)}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
              {data.workbook.founderReaction.comment || "Noch kein gemeinsamer Kommentar festgehalten."}
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function FocusCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/92 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}
