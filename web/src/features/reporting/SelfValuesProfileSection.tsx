import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  report: SelfAlignmentReport;
};

export function SelfValuesProfileSection({ report }: Props) {
  const profile = report.selfValuesProfile;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 print:rounded-xl print:border print:border-slate-200 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Werteprofil kompakt</h3>
      </div>

      {profile ? (
        <>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {normalizeSentence(t(profile.summary))}
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Kernimpulse</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                {profile.insights.slice(0, 3).map((item) => (
                  <li key={`values-insight-${item}`}>{normalizeSentence(t(item))}</li>
                ))}
              </ul>
            </div>

            {profile.watchouts.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                  Besonders wichtig
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-amber-900">
                  {profile.watchouts.slice(0, 1).map((item) => (
                    <li key={`values-watchout-${item}`}>{normalizeSentence(t(item))}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {report.valuesModulePreview?.trim() ||
              t("Schließe das Werte-Add-on ab, um eine kompakte Werte-Einordnung zu erhalten.")}
          </p>
          <div className="mt-4">
            <a
              href="/me/values"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              Werte Add-on starten
            </a>
          </div>
        </>
      )}
    </section>
  );
}

function normalizeSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(normalized) ? normalized : `${normalized}.`;
}
