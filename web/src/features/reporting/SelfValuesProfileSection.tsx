import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  report: SelfAlignmentReport;
};

export function SelfValuesProfileSection({ report }: Props) {
  const profile = report.selfValuesProfile;

  return (
    <section className="card-block rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:rounded-xl print:border print:border-slate-200 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dein Werteprofil</h3>
      </div>

      {profile ? (
        <>
          <p className="mt-4 text-sm leading-7 text-slate-700">{normalizeSentence(t(profile.summary))}</p>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Kernimpulse</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                {profile.insights.slice(0, 4).map((item) => (
                  <li key={`values-insight-${item}`}>{normalizeSentence(t(item))}</li>
                ))}
              </ul>
            </div>

          {profile.watchouts.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                Achte besonders auf…
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-amber-900">
                {profile.watchouts.slice(0, 2).map((item) => (
                  <li key={`values-watchout-${item}`}>{normalizeSentence(t(rewriteWatchout(item)))}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {report.valuesModulePreview?.trim() ||
              t("Schließe das Werte-Add-on ab, um eine individuelle Werte-Interpretation zu erhalten.")}
          </p>
          <a
            href="/me/values"
            className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            Werte Add-on starten
          </a>
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

function rewriteWatchout(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.includes("uberlebensphasen") ||
    normalized.includes("überlebensphasen") ||
    normalized.includes("harte kompromisse")
  ) {
    return "Achte außerdem darauf, dass harte Kompromisse in Überlebensphasen schnell zu Spannungen im Team führen können.";
  }

  return value;
}
