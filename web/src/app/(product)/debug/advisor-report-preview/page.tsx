import { notFound } from "next/navigation";
import { AdvisorReportPreview } from "@/features/reporting/AdvisorReportPreview";
import {
  getAdvisorReportPreviewCase,
  getAdvisorReportPreviewCaseOptions,
  resolveAdvisorReportPreviewCase,
} from "@/features/reporting/advisorReportPreviewData";

type SearchParams = {
  case?: string;
  debug?: string;
};

export default async function AdvisorReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const selectedCase = resolveAdvisorReportPreviewCase(params.case);
  const preview = getAdvisorReportPreviewCase(selectedCase);
  const debug = params.debug === "1";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl bg-slate-100 px-6 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {getAdvisorReportPreviewCaseOptions().map((option) => (
                <a
                  key={option.id}
                  href={`/debug/advisor-report-preview?case=${option.id}${debug ? "&debug=1" : ""}`}
                  className={`inline-flex rounded-lg border px-4 py-2 text-sm ${
                    option.id === selectedCase
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {option.shortLabel}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "0", label: "Nur Report-Output" },
                { id: "1", label: "Mit Debug-Signalen" },
              ].map((mode) => (
                <a
                  key={mode.id}
                  href={`/debug/advisor-report-preview?case=${selectedCase}${mode.id === "1" ? "&debug=1" : ""}`}
                  className={`inline-flex rounded-lg border px-4 py-2 text-sm ${
                    (mode.id === "1") === debug
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {mode.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <AdvisorReportPreview preview={preview} debug={debug} />
      </div>
    </main>
  );
}
