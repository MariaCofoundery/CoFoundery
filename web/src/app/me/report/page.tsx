import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestSelfAlignmentReport } from "@/features/reporting/actions";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { SelfReportView } from "@/features/reporting/SelfReportView";

export default async function MeReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/report");
  }

  const report = await getLatestSelfAlignmentReport();

  if (!report) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Individueller Report</h1>
          <p className="mt-3 text-sm text-slate-700">
            Für deinen individuellen Report fehlt noch ein eingereichter Basis-Fragebogen.
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <a
          href="/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Zurück zum Dashboard
        </a>
        <PrintReportButton />
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Individual Report</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[0.06em] text-slate-900">{report.participantAName}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Basis beantwortet: {report.basisAnsweredA}/{report.basisTotal}
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Dieser Report beschreibt dein aktuelles Gründerprofil entlang der sechs Kern-Dimensionen und
          gibt dir konkrete Reflexionsimpulse für deine Co-Founder-Suche.
        </p>
      </section>

      <SelfReportView report={report} />
    </main>
  );
}
