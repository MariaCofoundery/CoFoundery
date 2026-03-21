import { notFound } from "next/navigation";
import {
  buildAssessmentAuditReport,
  TARGET_ASSESSMENT_ID,
} from "@/features/reporting/selfReportAssessmentAudit";

export default async function SelfReportAssessmentAuditPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const audit = await buildAssessmentAuditReport(TARGET_ASSESSMENT_ID);
  console.log("[self-report-assessment-audit]", JSON.stringify(audit, null, 2));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Debug
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Self Report Assessment Audit
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Dev-only Audit-Ausgabe für das konkrete Base-Assessment{" "}
            <span className="font-mono text-slate-200">{TARGET_ASSESSMENT_ID}</span>.
            Die Seite lädt Rohdaten, berechnet die bestehenden Scores und hängt
            die vollständige menschenlesbare Audit-Ausgabe daran.
          </p>
        </header>

        <section className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <pre className="text-xs leading-6 text-slate-200">
            {JSON.stringify(audit, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
