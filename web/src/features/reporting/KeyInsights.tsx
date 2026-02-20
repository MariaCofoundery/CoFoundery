import { type KeyInsight } from "@/features/reporting/types";

type Props = {
  insights: KeyInsight[];
};

export function KeyInsights({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Strategische Kerninsights</h3>
        <p className="mt-4 text-sm text-slate-600">
          Für dieses Profil liegen noch nicht genügend Daten für eine belastbare Einordnung vor.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-10">
      <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Strategische Kerninsights</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Priorisierte Ableitungen aus deinem Antwortprofil mit Fokus auf Umsetzung im Gründungsalltag.
      </p>
      <ul className="mt-8 space-y-5">
        {insights.map((insight) => {
          const [dimensionLabel, profileLabel] = splitInsightTitle(insight.title);
          return (
          <li key={insight.dimension} className="rounded-xl border border-slate-200/80 px-5 py-4">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
              {dimensionLabel}
            </span>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-slate-800">
              {profileLabel}
            </p>
            <p className="mt-1 text-sm leading-7 text-slate-700">{insight.text}</p>
          </li>
          );
        })}
      </ul>
    </section>
  );
}

function splitInsightTitle(title: string) {
  const [dimensionPart, profilePart] = title.split(" - ");
  const dimension = (dimensionPart ?? "").trim() || "Dimension";
  const profile = (profilePart ?? title).trim();
  return [dimension, profile];
}
