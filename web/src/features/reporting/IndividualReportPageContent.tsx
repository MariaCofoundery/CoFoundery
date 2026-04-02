import type { ReactNode } from "react";
import { SelfReportView } from "@/features/reporting/SelfReportView";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

type Props = {
  report: SelfAlignmentReport;
  toolbar?: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  headerMeta?: ReactNode;
  beforeReport?: ReactNode;
};

const DEFAULT_DESCRIPTION =
  "Dieser Report fasst dein aktuelles Founder-Profil kompakt zusammen: mit deinen stärksten Mustern, typischen Spannungsfeldern und einer klaren visuellen Einordnung der sechs Dimensionen am Ende.";

export function IndividualReportPageContent({
  report,
  toolbar,
  eyebrow = "Individueller Report",
  title,
  description = DEFAULT_DESCRIPTION,
  headerMeta,
  beforeReport,
}: Props) {
  return (
    <main className="report-print-root mx-auto min-h-screen w-full max-w-6xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      {toolbar ? <div className="no-print mb-8">{toolbar}</div> : null}

      <section className="page-section mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mb-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">{title ?? report.participantAName}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
          </div>
          {headerMeta ? <div className="flex flex-wrap gap-2">{headerMeta}</div> : null}
        </div>
      </section>

      {beforeReport}

      <SelfReportView report={report} />
    </main>
  );
}
