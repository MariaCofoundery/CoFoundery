import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestSelfAlignmentReport } from "@/features/reporting/actions";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { IndividualReportPageContent } from "@/features/reporting/IndividualReportPageContent";

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
    <>
      <ResearchPageTracker eventName="self_report_viewed" module="base" />
      <IndividualReportPageContent
        report={report}
        toolbar={
          <div className="flex items-center justify-between">
            <a
              href="/dashboard"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Zurück zum Dashboard
            </a>
            <PrintReportButton eventName="self_report_print_clicked" module="base" />
          </div>
        }
      />
    </>
  );
}
