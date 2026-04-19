import Link from "next/link";
import { DynamicsTimeline } from "@/components/DynamicsTimeline";
import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  type FounderDynamicsPreviewCase,
  getFounderDynamicsPreviewCaseOptions,
} from "@/features/reporting/founderDynamicsTimelinePreviewData";

type Props = {
  preview: FounderDynamicsPreviewCase;
  debugTimeline?: boolean;
};

const STANCE_LABELS: Record<FounderDynamicsPreviewCase["stance"], string> = {
  stable: "Tragfähige Lage",
  tension: "Frühe Spannung",
  blind_spot: "Gemeinsamer Watchpoint",
  complement: "Ergänzung mit Klärungsbedarf",
};

const STANCE_STYLES: Record<
  FounderDynamicsPreviewCase["stance"],
  { chip: string; marker: string; line: string }
> = {
  stable: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    marker: "bg-emerald-600",
    line: "from-emerald-200 via-slate-200 to-slate-200",
  },
  tension: {
    chip: "border-amber-200 bg-amber-50 text-amber-900",
    marker: "bg-amber-600",
    line: "from-amber-200 via-slate-200 to-slate-200",
  },
  blind_spot: {
    chip: "border-slate-300 bg-slate-100 text-slate-800",
    marker: "bg-slate-700",
    line: "from-slate-300 via-slate-200 to-slate-200",
  },
  complement: {
    chip: "border-sky-200 bg-sky-50 text-sky-800",
    marker: "bg-sky-600",
    line: "from-sky-200 via-slate-200 to-slate-200",
  },
};

function scoreLabel(value: number | null) {
  if (value == null) {
    return "Noch offen";
  }

  return `${value}/100`;
}

function formatDimensionList(dimensions: FounderDimensionKey[]) {
  return dimensions.join(" · ");
}

function formatTopSignal(dimensions: FounderDimensionKey[]) {
  if (dimensions.length === 0) {
    return "Keine klare Zuspitzung";
  }

  return dimensions.slice(0, 2).join(" · ");
}

export function FounderDynamicsTimelinePreview({
  preview,
  debugTimeline = false,
}: Props) {
  const stanceStyle = STANCE_STYLES[preview.stance];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(246,241,234,0.92))] px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
                Interne Preview · Founder-Dynamics-Timeline
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
                {preview.participantAName} + {preview.participantBName}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">{preview.summary}</p>
            </div>
            <div
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${stanceStyle.chip}`}
            >
              {STANCE_LABELS[preview.stance]}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Strategische Nähe
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {scoreLabel(preview.alignmentScore)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Schwerpunkt aktuell: {formatTopSignal(preview.topAlignments)}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Operative Tragfähigkeit
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {scoreLabel(preview.workingCompatibilityScore)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Relevante Reibung aktuell: {formatTopSignal(preview.topTensions)}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Preview-Kontext
              </p>
              <p className="mt-2 text-base font-medium text-slate-950">{preview.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Die Timeline zeigt mögliche Watchpoints über typische Phasen hinweg, nicht feste
                Vorhersagen.
              </p>
            </article>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {getFounderDynamicsPreviewCaseOptions().map((option) => {
              const isActive = option.id === preview.id;
              return (
                <Link
                  key={option.id}
                  href={`/debug/founder-dynamics-timeline?case=${option.id}${
                    debugTimeline ? "&debug=1" : ""
                  }`}
                  className={`inline-flex rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                  title={option.title}
                >
                  {option.shortLabel}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <DynamicsTimeline
        phases={preview.timelinePhases}
        nodes={preview.timelineNodes}
        debug={debugTimeline}
        showProgressiveDetails={false}
      />

      <section className="rounded-[2rem] border border-slate-200/80 bg-white px-6 py-7 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.28)] sm:px-8">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Phasen im Detail
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Was hinter den Zeitpunkten inhaltlich sichtbar wird
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Die Timeline verdichtet den Verlauf. Hier seht ihr dieselben Phasen noch einmal als
            ruhigere Arbeitsfläche mit Watchpoints und Leitfragen.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {preview.phases.map((phase, index) => (
            <article
              key={phase.id}
              className="relative grid gap-4 rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 sm:grid-cols-[88px_minmax(0,1fr)] sm:p-6"
            >
              <div className="relative flex items-start sm:justify-center">
                <div className="flex items-center gap-4 sm:flex-col sm:gap-3">
                  <div
                    className={`relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ${stanceStyle.marker}`}
                  >
                    {index + 1}
                  </div>
                  {index < preview.phases.length - 1 ? (
                    <div
                      className={`hidden h-20 w-px bg-gradient-to-b ${stanceStyle.line} sm:block`}
                    />
                  ) : null}
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    {phase.step}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-2xl">
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                      {phase.title}
                    </h3>
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
                      className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4"
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
    </div>
  );
}
