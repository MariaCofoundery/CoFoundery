"use client";

import { useMemo, useState } from "react";
import {
  FOUNDER_DYNAMICS_TIMELINE_PHASES,
  type FounderDynamicsTimelineGraphPhase,
  type FounderDynamicsTimelineNode,
  type FounderDynamicsTimelineNodeKind,
} from "@/features/reporting/timelineLogic";

type Props = {
  phases?: FounderDynamicsTimelineGraphPhase[];
  nodes: FounderDynamicsTimelineNode[];
  debug?: boolean;
};

type PositionedTimelineNode = {
  node: FounderDynamicsTimelineNode;
  originalX: number;
  adjustedX: number;
  y: number;
  clusterIndex: number;
};

const GRAPH_WIDTH = 980;
const GRAPH_HEIGHT = 380;
const INNER_LEFT = 72;
const INNER_RIGHT = 72;
const AXIS_Y = 226;
const NODE_CLUSTER_DISTANCE = 24;
const NODE_MAX_OFFSET = 14;
const NODE_HIT_SIZE = 30;
const CURVE_ANCHOR_POINTS = [
  { year: 0, y: 214 },
  { year: 0.6, y: 242 },
  { year: 1.35, y: 186 },
  { year: 2.7, y: 182 },
  { year: 3.85, y: 148 },
  { year: 5, y: 194 },
] as const;

const AXIS_STROKE = "rgba(148, 163, 184, 0.82)";
const CURVE_BASE_STROKE = "rgba(203, 213, 225, 0.88)";

const NODE_STYLES: Record<
  FounderDynamicsTimelineNodeKind,
  {
    dot: string;
    halo: string;
    curveClass: string;
    curveStroke: string;
    dotBorder: string;
    dotFill: string;
    haloFill: string;
    tooltipBorder: string;
    label: string;
  }
> = {
  tension: {
    dot: "border-amber-300/95 bg-amber-50 text-amber-900",
    halo: "bg-amber-200/35",
    curveClass: "stroke-amber-300/60",
    curveStroke: "rgba(252, 211, 77, 0.92)",
    dotBorder: "rgba(252, 211, 77, 0.98)",
    dotFill: "rgb(255, 251, 235)",
    haloFill: "rgba(253, 230, 138, 0.35)",
    tooltipBorder: "border-amber-200/70",
    label: "Spannung",
  },
  blind_spot: {
    dot: "border-slate-400/95 bg-slate-50 text-slate-900",
    halo: "bg-slate-300/30",
    curveClass: "stroke-slate-400/55",
    curveStroke: "rgba(148, 163, 184, 0.95)",
    dotBorder: "rgba(148, 163, 184, 0.98)",
    dotFill: "rgb(248, 250, 252)",
    haloFill: "rgba(203, 213, 225, 0.34)",
    tooltipBorder: "border-slate-300/75",
    label: "Blind Spot",
  },
  coordination_need: {
    dot: "border-sky-300/95 bg-sky-50 text-sky-900",
    halo: "bg-sky-200/32",
    curveClass: "stroke-sky-300/60",
    curveStroke: "rgba(125, 211, 252, 0.96)",
    dotBorder: "rgba(125, 211, 252, 0.98)",
    dotFill: "rgb(240, 249, 255)",
    haloFill: "rgba(186, 230, 253, 0.34)",
    tooltipBorder: "border-sky-200/70",
    label: "Klärungsbedarf",
  },
};

function yearToPixel(year: number) {
  return INNER_LEFT + ((GRAPH_WIDTH - INNER_LEFT - INNER_RIGHT) * year) / 5;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCurvePoint(index: number) {
  const first = CURVE_ANCHOR_POINTS[0];
  const last = CURVE_ANCHOR_POINTS[CURVE_ANCHOR_POINTS.length - 1];
  return CURVE_ANCHOR_POINTS[clamp(index, 0, CURVE_ANCHOR_POINTS.length - 1)] ?? first ?? last;
}

function catmullRomToBezier(
  previous: (typeof CURVE_ANCHOR_POINTS)[number],
  current: (typeof CURVE_ANCHOR_POINTS)[number],
  next: (typeof CURVE_ANCHOR_POINTS)[number],
  afterNext: (typeof CURVE_ANCHOR_POINTS)[number]
) {
  const currentX = yearToPixel(current.year);
  const currentY = current.y;
  const nextX = yearToPixel(next.year);
  const nextY = next.y;
  const control1X = currentX + (nextX - yearToPixel(previous.year)) / 6;
  const control1Y = currentY + (nextY - previous.y) / 6;
  const control2X = nextX - (yearToPixel(afterNext.year) - currentX) / 6;
  const control2Y = nextY - (afterNext.y - currentY) / 6;

  return ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${nextX} ${nextY}`;
}

function getBaseTimelineCurvePath() {
  const first = CURVE_ANCHOR_POINTS[0];
  if (!first) return "";

  let path = `M ${yearToPixel(first.year)} ${first.y}`;
  for (let index = 0; index < CURVE_ANCHOR_POINTS.length - 1; index += 1) {
    path += catmullRomToBezier(
      getCurvePoint(index - 1),
      getCurvePoint(index),
      getCurvePoint(index + 1),
      getCurvePoint(index + 2)
    );
  }

  return path;
}

function getCurveYAtYear(year: number) {
  const clampedYear = clamp(year, 0, 5);

  for (let index = 0; index < CURVE_ANCHOR_POINTS.length - 1; index += 1) {
    const start = CURVE_ANCHOR_POINTS[index];
    const end = CURVE_ANCHOR_POINTS[index + 1];
    if (!start || !end) continue;
    if (clampedYear >= start.year && clampedYear <= end.year) {
      const progress = (clampedYear - start.year) / (end.year - start.year);
      const eased = progress * progress * (3 - 2 * progress);
      return start.y + (end.y - start.y) * eased;
    }
  }

  return CURVE_ANCHOR_POINTS[CURVE_ANCHOR_POINTS.length - 1]?.y ?? AXIS_Y;
}

function getNodeViewportPosition(node: FounderDynamicsTimelineNode) {
  return {
    x: yearToPixel(node.year),
    y: getCurveYAtYear(node.year),
  };
}

function buildPositionedTimelineNodes(nodes: FounderDynamicsTimelineNode[]): PositionedTimelineNode[] {
  const positioned = nodes.map((node) => {
    const { x, y } = getNodeViewportPosition(node);
    return {
      node,
      originalX: x,
      adjustedX: x,
      y,
      clusterIndex: 0,
    };
  });

  const clusters: PositionedTimelineNode[][] = [];
  for (const entry of positioned) {
    const currentCluster = clusters[clusters.length - 1];
    const previous = currentCluster?.[currentCluster.length - 1];

    if (!currentCluster || !previous || entry.originalX - previous.originalX >= NODE_CLUSTER_DISTANCE) {
      clusters.push([entry]);
      continue;
    }

    currentCluster.push(entry);
  }

  for (const cluster of clusters) {
    if (cluster.length <= 1) continue;

    const step = Math.min(8, (NODE_MAX_OFFSET * 2) / Math.max(cluster.length - 1, 1));
    const centerOffset = (cluster.length - 1) / 2;

    cluster.forEach((entry, index) => {
      const offset = clamp((index - centerOffset) * step, -NODE_MAX_OFFSET, NODE_MAX_OFFSET);
      entry.adjustedX = entry.originalX + offset;
      entry.clusterIndex = index;
    });
  }

  return positioned;
}

function isFiniteYear(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 5;
}

export function FounderDynamicsTimelineGraph({
  phases = FOUNDER_DYNAMICS_TIMELINE_PHASES,
  nodes,
  debug = false,
}: Props) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const renderableNodes = useMemo(
    () =>
      nodes
        .filter((node) => isFiniteYear(node.year))
        .sort((left, right) => left.year - right.year || left.id.localeCompare(right.id)),
    [nodes]
  );
  const positionedNodes = useMemo(
    () => buildPositionedTimelineNodes(renderableNodes),
    [renderableNodes]
  );

  const focusNodeId = hoveredNodeId ?? selectedNodeId;
  const activeNodeId = selectedNodeId;
  const activeNode = useMemo(
    () => positionedNodes.find((entry) => entry.node.id === activeNodeId)?.node ?? null,
    [activeNodeId, positionedNodes]
  );
  const focusNode = useMemo(
    () => positionedNodes.find((entry) => entry.node.id === focusNodeId)?.node ?? null,
    [focusNodeId, positionedNodes]
  );
  const timelineCurvePath = useMemo(() => getBaseTimelineCurvePath(), []);
  const visibleLegendKinds = useMemo(
    () =>
      (["tension", "blind_spot", "coordination_need"] as const).filter((kind) =>
        positionedNodes.some((entry) => entry.node.kind === kind)
      ),
    [positionedNodes]
  );
  const phaseMap = useMemo(
    () => new Map(phases.map((phase) => [phase.id, phase])),
    [phases]
  );
  const hasRenderableNodes = positionedNodes.length > 0;
  const curveStyle = focusNode
    ? NODE_STYLES[focusNode.kind].curveClass
    : "stroke-slate-300/65";
  const curveStroke = focusNode
    ? NODE_STYLES[focusNode.kind].curveStroke
    : "rgba(148, 163, 184, 0.92)";

  return (
    <section className="rounded-[2rem] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_28px_90px_-56px_rgba(15,23,42,0.28)] sm:px-8">
      <div className="max-w-2xl">
        <p className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
          Verlauf über 5 Jahre
        </p>
        <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">
          Wo eure Dynamik später kippen oder tragen kann
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Die Punkte markieren keine festen Vorhersagen. Sie zeigen, in welchen Phasen eure
          aktuelle Dynamik typischerweise spürbar werden kann.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/65 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Die Linie zeigt keinen festen Score, sondern einen typischen Verlauf von
          Entscheidungsdruck und Komplexität.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {visibleLegendKinds.map((kind) => {
            const style = NODE_STYLES[kind];
            return (
              <div
                key={kind}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] text-slate-600"
              >
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full border ${style.dot}`}
                  aria-hidden
                />
                {style.label}
              </div>
            );
          })}
          {!hasRenderableNodes ? (
            <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/88 px-3 py-1.5 text-[11px] text-slate-500">
              Aktuell ohne markierte Watchpoints
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto pb-2">
        <div className="min-w-[980px]">
          <div className="relative h-[26.5rem] overflow-visible rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[5rem]">
              {phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className={`absolute top-0 h-full border-r border-slate-200/60 px-4 py-3 ${
                    index % 2 === 0 ? "bg-slate-50/45" : "bg-[#f6f1ea]/38"
                  }`}
                  style={{
                    left: `${(phase.startYear / 5) * 100}%`,
                    width: `${((phase.endYear - phase.startYear) / 5) * 100}%`,
                  }}
                >
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                    {phase.rangeLabel}
                  </p>
                  <p className="mt-1.5 max-w-[11rem] text-[12px] font-medium leading-5 tracking-[-0.01em] text-slate-700">
                    {phase.title}
                  </p>
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-full">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`guide-${index}`}
                  className="absolute top-0 h-full w-px bg-slate-200/70"
                  style={{ left: `${yearToPixel(index)}px` }}
                />
              ))}
            </div>

            <div className="pointer-events-none absolute left-4 top-[6.2rem] text-[10px] uppercase tracking-[0.22em] text-slate-400">
              Mehr Entscheidungsdruck
            </div>
            <div className="pointer-events-none absolute bottom-14 left-4 text-[10px] uppercase tracking-[0.22em] text-slate-400">
              Ruhigere Phase
            </div>

            {debug ? (
              <div className="pointer-events-none absolute inset-[18px] rounded-[1.35rem] border border-dashed border-fuchsia-300/70" />
            ) : null}

            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <line
                x1={INNER_LEFT}
                y1={AXIS_Y}
                x2={GRAPH_WIDTH - INNER_RIGHT}
                y2={AXIS_Y}
                strokeWidth="1.25"
                stroke={AXIS_STROKE}
              />

              <path
                d={timelineCurvePath}
                className="fill-none"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke={CURVE_BASE_STROKE}
              />
              <path
                d={timelineCurvePath}
                className={`fill-none transition-colors duration-300 ${curveStyle}`}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke={curveStroke}
              />

              {debug
                ? positionedNodes.map(({ node, originalX, adjustedX, y, clusterIndex }) => {
                    return (
                      <g key={`${node.id}-debug`} className="pointer-events-none">
                        <circle
                          cx={adjustedX}
                          cy={y}
                          r="12"
                          className="fill-transparent stroke-fuchsia-400/75"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={adjustedX}
                          y={y + (node.lane === "upper" ? -18 : 24)}
                          textAnchor="middle"
                          className="fill-fuchsia-500 text-[10px]"
                        >
                          {Math.round(originalX)}→{Math.round(adjustedX)} · c{clusterIndex}
                        </text>
                      </g>
                    );
                  })
                : null}
            </svg>

            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="absolute flex -translate-x-1/2 flex-col items-center gap-2"
                style={{ left: `${yearToPixel(index)}px`, top: `${AXIS_Y - 8}px` }}
              >
                <span className="h-3 w-px bg-slate-300/80" />
                <span className="text-[10px] tracking-[0.18em] text-slate-400">
                  {index === 0 ? "0" : `${index}J`}
                </span>
              </div>
            ))}

            <div className="absolute inset-0 overflow-visible">
              {positionedNodes.map(({ node, originalX, adjustedX, y, clusterIndex }) => {
                const isSelected = selectedNodeId === node.id;
                const isFocused = focusNodeId === node.id;
                const style = NODE_STYLES[node.kind];
                const isUpper = node.lane === "upper";

                return (
                  <div
                    key={node.id}
                    className="absolute overflow-visible"
                    style={{ left: `${adjustedX}px`, top: `${y}px`, zIndex: isSelected ? 20 : 10 }}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() =>
                        setHoveredNodeId((current) => (current === node.id ? null : current))
                      }
                      onFocus={() => setHoveredNodeId(node.id)}
                      onBlur={() =>
                        setHoveredNodeId((current) => (current === node.id ? null : current))
                      }
                      onClick={() =>
                        setSelectedNodeId((current) => (current === node.id ? null : node.id))
                      }
                      className="group absolute left-0 top-0 inline-flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                      style={{
                        zIndex: isSelected ? 30 : 15,
                        width: `${NODE_HIT_SIZE}px`,
                        height: `${NODE_HIT_SIZE}px`,
                      }}
                      aria-label={`${node.title} – ${style.label}`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`absolute h-10 w-10 rounded-full transition duration-200 ${
                          isFocused
                            ? `scale-90 ${style.halo}`
                            : debug
                              ? "scale-100 bg-fuchsia-200/30"
                              : "scale-75 bg-transparent"
                        }`}
                        style={
                          isFocused
                            ? { backgroundColor: style.haloFill }
                            : undefined
                        }
                        aria-hidden
                      />
                      <span
                        className={`relative z-10 inline-flex rounded-full border transition duration-200 ${
                          debug
                            ? "h-5 w-5 border-fuchsia-500 bg-fuchsia-200 shadow-[0_18px_34px_-18px_rgba(192,38,211,0.6)]"
                            : `h-[18px] w-[18px] ${style.dot} shadow-[0_10px_22px_-14px_rgba(15,23,42,0.45)]`
                        } ${
                          isSelected
                            ? "scale-[1.18] shadow-[0_18px_34px_-18px_rgba(15,23,42,0.45)]"
                            : isFocused
                              ? "scale-110"
                              : "group-hover:scale-105"
                        }`}
                        style={
                          debug
                            ? undefined
                            : {
                                borderColor: style.dotBorder,
                                backgroundColor: style.dotFill,
                              }
                        }
                      />
                    </button>

                    {debug ? (
                      <div
                        className={`pointer-events-none absolute left-0 z-20 -translate-x-1/2 rounded-md border border-fuchsia-300 bg-white/95 px-2 py-1 text-[10px] text-fuchsia-700 shadow-sm ${
                          isUpper ? "-top-11" : "top-5"
                        }`}
                      >
                        {node.dimension} · {node.year} · {Math.round(originalX)}→{Math.round(adjustedX)} · c{clusterIndex}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!hasRenderableNodes ? (
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-slate-200/80 bg-white/92 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.24)]">
                Für diesen Fall sind aktuell keine sichtbaren Watchpoints vorhanden. Die Preview
                hat damit keine belastbaren Timeline-Punkte zum Rendern.
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[10px] uppercase tracking-[0.22em] text-slate-400">
              Zeitachse · Jahre seit Beginn der Zusammenarbeit
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] px-5 py-5 sm:px-6">
        {activeNode ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                {phaseMap.get(activeNode.phaseId)?.title ?? "Phase"} · {activeNode.dimension}
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                {activeNode.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{activeNode.description}</p>
              {activeNode.guidingQuestion ? (
                <div className="mt-4 rounded-[1.2rem] border border-slate-200/80 bg-white/90 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Leitfrage
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {activeNode.guidingQuestion}
                  </p>
                </div>
              ) : null}
            </div>
            <aside className="rounded-[1.2rem] border border-slate-200/80 bg-white/88 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Aktiver Punkt</p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full border ${NODE_STYLES[activeNode.kind].dot}`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-slate-900">
                  {NODE_STYLES[activeNode.kind].label}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Klick auf einen anderen Punkt, um den Fokus zu wechseln.
              </p>
            </aside>
          </div>
        ) : hasRenderableNodes ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Detailbereich
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                Öffnet einen Punkt, um die Phase im Detail zu lesen
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
                Die Grafik zeigt, wann eure aktuelle Dynamik typischerweise spürbar werden kann.
                Mit Klick auf einen Punkt bleibt der passende Kontext hier stabil sichtbar.
              </p>
            </div>
            <aside className="rounded-[1.2rem] border border-slate-200/80 bg-white/88 px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Interaktion</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Hover hebt einen Punkt nur sanft hervor. Erst ein Klick setzt die feste Auswahl.
              </p>
            </aside>
          </div>
        ) : (
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Detailbereich</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950">
              Für diesen Fall sind aktuell keine markierten Punkte vorhanden
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              Die Timeline bleibt bewusst leer, wenn aus den vorhandenen Dimensionsdaten keine
              belastbaren Watchpoints abgeleitet werden.
            </p>
          </div>
        )}
      </section>

      {debug ? (
        <div className="mt-4 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/70 px-4 py-3 text-xs leading-6 text-fuchsia-800">
          Debug-Modus aktiv: Punkte zeigen Koordinaten-Overlays und stärkere Marker, damit die
          Render-Geometrie direkt sichtbar bleibt. Renderbar: {renderableNodes.length} Nodes,{" "}
          Kurve vorhanden.
        </div>
      ) : null}
    </section>
  );
}
