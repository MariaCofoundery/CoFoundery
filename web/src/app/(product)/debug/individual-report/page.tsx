import { notFound } from "next/navigation";
import { IndividualReportPageContent } from "@/features/reporting/IndividualReportPageContent";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import {
  getDebugIndividualReportProfile,
  getDebugIndividualReportProfileOptions,
  resolveDebugIndividualReportProfileId,
} from "@/features/reporting/debugIndividualReportData";

type SearchParams = {
  profile?: string;
  json?: string;
};

function buildHref(profile: string, showJson: boolean) {
  const params = new URLSearchParams({ profile });
  if (showJson) {
    params.set("json", "1");
  }

  return `/debug/individual-report?${params.toString()}`;
}

function DebugBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "accent";
}) {
  const className =
    tone === "accent"
      ? "border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/10 text-slate-700"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}>
      {label}
    </span>
  );
}

export default async function DebugIndividualReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const selectedProfileId = resolveDebugIndividualReportProfileId(params.profile);
  const selectedProfile = getDebugIndividualReportProfile(selectedProfileId);
  const profileOptions = getDebugIndividualReportProfileOptions();
  const showJson = params.json === "1";

  return (
    <IndividualReportPageContent
      report={selectedProfile.report}
      eyebrow="Debug Preview · Individual Report"
      title={selectedProfile.report.participantAName}
      description={`${selectedProfile.description} Diese Ansicht verwendet ausschließlich lokale Mock-Daten und rendert dieselbe Individual-Report-UI wie /me/report.`}
      toolbar={
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {profileOptions.map((option) => {
                const isActive = option.id === selectedProfileId;
                return (
                  <a
                    key={option.id}
                    href={buildHref(option.id, showJson)}
                    className={`inline-flex rounded-lg border px-4 py-2 text-sm ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {option.label}
                  </a>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={buildHref(selectedProfileId, !showJson)}
                className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              >
                {showJson ? "JSON ausblenden" : "JSON anzeigen"}
              </a>
              <PrintReportButton label="Als PDF speichern" />
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700">
            Diese Route ist nur in Development verfügbar. Sie nutzt keine Authentifizierung, ruft
            kein Supabase auf und verändert keinen produktiven Report-Flow.
          </div>
        </div>
      }
      headerMeta={
        <>
          <DebugBadge label="DEV ONLY" tone="accent" />
          <DebugBadge label={`Profil: ${selectedProfile.label}`} />
          <DebugBadge label={`Values: ${selectedProfile.report.valuesModuleStatus}`} />
        </>
      }
      beforeReport={
        showJson ? (
          <section className="page-section mb-6 rounded-2xl border border-slate-200/80 bg-slate-950 p-6 text-white print:hidden">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Mock JSON</p>
            <pre className="mt-4 overflow-x-auto text-xs leading-6 text-slate-200">
              {JSON.stringify(selectedProfile.report, null, 2)}
            </pre>
          </section>
        ) : null
      }
    />
  );
}
