"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { DynamicsTimelineDetails } from "@/components/DynamicsTimelineDetails";
import type { FounderDynamicsTimelineDetailPhase } from "@/features/reporting/founderDynamicsTimelineDetails";
import type {
  FounderDynamicsTimelineGraphPhase,
  FounderDynamicsTimelineNode,
} from "@/features/reporting/timelineLogic";

type Props = {
  phases?: FounderDynamicsTimelineGraphPhase[];
  nodes: FounderDynamicsTimelineNode[];
  debug?: boolean;
  detailPhases?: FounderDynamicsTimelineDetailPhase[];
  showProgressiveDetails?: boolean;
};

const FounderDynamicsTimelineGraph = dynamic(
  () =>
    import("@/features/reporting/FounderDynamicsTimelineGraph").then((module) => ({
      default: module.FounderDynamicsTimelineGraph,
    })),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-[2rem] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.28)] sm:px-8">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
            Verlauf über 5 Jahre
          </p>
          <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">
            Wo eure Dynamik später kippen oder tragen kann
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Die Timeline wird geladen. Die Grafik rendert bewusst clientseitig, damit SVG,
            Interaktion und Detailbereich stabil bleiben.
          </p>
        </div>
        <div className="mt-8 h-[26.5rem] rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))]" />
      </section>
    ),
  }
);

export function DynamicsTimeline({
  phases,
  nodes,
  debug = false,
  detailPhases = [],
  showProgressiveDetails = detailPhases.length > 0,
}: Props) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailRegionId = useId();

  return (
    <div className="space-y-4">
      <FounderDynamicsTimelineGraph phases={phases} nodes={nodes} debug={debug} />

      {showProgressiveDetails && detailPhases.length > 0 ? (
        <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/75 px-5 py-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.22)] sm:px-6">
          <button
            type="button"
            aria-expanded={isDetailOpen}
            aria-controls={detailRegionId}
            onClick={() => setIsDetailOpen((current) => !current)}
            className="group inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100/80"
          >
            <span>{isDetailOpen ? "Detailansicht schließen" : "Phasen im Detail lesen"}</span>
            <span
              aria-hidden="true"
              className={`text-slate-400 transition-transform duration-200 ${
                isDetailOpen ? "rotate-180" : ""
              }`}
            >
              ↓
            </span>
          </button>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Die kompakte Timeline bleibt euer schneller Überblick. Die Detailansicht öffnet
            dieselben Phasen mit Watchpoints und Leitfragen erst dann, wenn ihr tiefer einsteigen
            wollt.
          </p>

          {isDetailOpen ? (
            <div id={detailRegionId} className="mt-5">
              <DynamicsTimelineDetails phases={detailPhases} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
