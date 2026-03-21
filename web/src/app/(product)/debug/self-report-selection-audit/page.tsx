import { notFound } from "next/navigation";
import {
  runSelfReportAuditTestCases,
} from "@/features/reporting/selfReportSelection";

export default async function SelfReportSelectionAuditPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const auditCases = runSelfReportAuditTestCases();
  console.log(
    "[self-report-selection-audit]",
    JSON.stringify(auditCases, null, 2)
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Debug
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Self Report Selection Audit
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Dev-only JSON-Ausgabe der bestehenden Audit-Testfälle aus der
            Self-Report-Selection-Engine. Dieselbe Ausgabe wird beim Laden der
            Seite auch im Server-Log ausgegeben.
          </p>
        </header>

        <section className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <pre className="text-xs leading-6 text-slate-200">
            {JSON.stringify(auditCases, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
