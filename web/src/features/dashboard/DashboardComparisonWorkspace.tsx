"use client";

type Props = {
  error?: string;
};

export function DashboardComparisonWorkspace({ error }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Legacy Dashboard deaktiviert</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        TEMP: Die frühere session-basierte Vergleichsoberfläche ist abgeschaltet.
      </p>
      {error ? <p className="mt-3 text-sm text-amber-700">Hinweis: {error}</p> : null}
    </section>
  );
}
