"use client";

import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { FounderDynamicsTimelineDetailPhase } from "@/features/reporting/founderDynamicsTimelineDetails";

type Props = {
  phases: FounderDynamicsTimelineDetailPhase[];
};

function formatDimensionList(dimensions: FounderDimensionKey[]) {
  return dimensions.join(" · ");
}

export function DynamicsTimelineDetails({ phases }: Props) {
  if (phases.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.9rem] border border-slate-200/80 bg-slate-50/55 px-5 py-6 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Phasen im Detail
        </p>
        <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-[1.45rem]">
          Was hinter den Zeitpunkten inhaltlich sichtbar wird
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Die Timeline verdichtet den Verlauf. Hier seht ihr dieselben Phasen noch einmal als
          ruhigere Arbeitsfläche mit Watchpoints und Leitfragen.
        </p>
      </div>

      <div className="mt-7 space-y-4">
        {phases.map((phase, index) => (
          <article
            key={phase.id}
            className="relative grid gap-4 rounded-[1.6rem] border border-slate-200/80 bg-white/95 p-5 sm:grid-cols-[78px_minmax(0,1fr)] sm:p-6"
          >
            <div className="relative flex items-start sm:justify-center">
              <div className="flex items-center gap-4 sm:flex-col sm:gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white shadow-sm">
                  {index + 1}
                </div>
                {index < phases.length - 1 ? (
                  <div className="hidden h-16 w-px bg-gradient-to-b from-slate-300 via-slate-200 to-transparent sm:block" />
                ) : null}
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {phase.step}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <h4 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                    {phase.title}
                  </h4>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{phase.description}</p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  Treiber: {formatDimensionList(phase.drivers)}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {phase.watchpoints.map((watchpoint) => (
                  <div
                    key={watchpoint}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-4 py-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Watchpoint
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{watchpoint}</p>
                  </div>
                ))}
              </div>

              {phase.guidingQuestion ? (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Leitfrage
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{phase.guidingQuestion}</p>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
