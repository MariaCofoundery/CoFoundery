import { redirect } from "next/navigation";
import { getSessionAlignmentReport } from "@/features/reporting/actions";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function IndividualReportPage({ params }: PageProps) {
  const { sessionId } = await params;
  const report = await getSessionAlignmentReport(sessionId);

  if (!report) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
      <article className="rounded-2xl border border-slate-200/80 bg-white p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Individual Report</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{report.participantAName}</h1>
        <p className="mt-2 text-sm text-slate-600">Erstellt: {formatDate(report.createdAt)}</p>
        <p className="mt-4 text-sm text-slate-700">
          TEMP: Diese Ansicht zeigt nur Basis-Metadaten. Die individualisierte Darstellung wird auf
          `report_runs.payload` umgestellt.
        </p>
        <a
          href={`/report/${report.sessionId}`}
          className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Vollen Report öffnen
        </a>
      </article>
    </main>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}
