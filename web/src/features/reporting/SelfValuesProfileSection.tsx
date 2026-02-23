import { type SessionAlignmentReport } from "@/features/reporting/types";

type Props = {
  report: SessionAlignmentReport;
};

export function SelfValuesProfileSection({ report }: Props) {
  const total = report.valuesTotal > 0 ? report.valuesTotal : 10;
  const statusLabel =
    report.valuesModuleStatus === "completed"
      ? "abgeschlossen"
      : report.valuesModuleStatus === "in_progress"
        ? "in Bearbeitung"
        : "offen";
  const profile = report.selfValuesProfile;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dein Werteprofil</h3>
        <span className="rounded-full border border-slate-300 bg-slate-100/80 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-700">
          {statusLabel}
        </span>
      </div>

      <p className="mt-3 text-xs tracking-[0.08em] text-slate-500">
        Fortschritt: {report.valuesAnsweredA}/{total}
      </p>

      {profile ? (
        <>
          <p className="mt-4 text-sm leading-7 text-slate-700">{profile.summary}</p>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Kernimpulse</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
              {profile.insights.slice(0, 4).map((item) => (
                <li key={`values-insight-${item}`}>{item}</li>
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
                  <li key={`values-watchout-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {report.valuesModulePreview?.trim() ||
              "Schließe das Werte-Add-on ab, um eine individuelle Werte-Interpretation zu erhalten."}
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
