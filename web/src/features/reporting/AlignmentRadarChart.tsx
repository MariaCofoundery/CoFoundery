import { REPORT_DIMENSIONS, type RadarSeries } from "@/features/reporting/types";

type ChartParticipant = {
  id: string;
  label: string;
  color: string;
  scores: RadarSeries;
};

type Props = {
  participants: ChartParticipant[];
  compact?: boolean;
};

const LABELS: Record<(typeof REPORT_DIMENSIONS)[number], string> = {
  Vision: "Vision",
  Entscheidung: "Entscheidung",
  Risiko: "Risiko",
  Autonomie: "Autonomie",
  Verbindlichkeit: "Verbindlichkeit",
  Konflikt: "Konflikt",
};

export function AlignmentRadarChart({ participants, compact = false }: Props) {
  const size = 560;
  const center = size / 2;
  const radius = 180;
  const levels = 6;

  const axes = REPORT_DIMENSIONS.map((dimension, index) => {
    const angle = (Math.PI * 2 * index) / REPORT_DIMENSIONS.length - Math.PI / 2;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    const lx = center + Math.cos(angle) * (radius + 74);
    const ly = center + Math.sin(angle) * (radius + 74);
    return { dimension, x, y, lx, ly, angle };
  });

  return (
    <div className={compact ? "bg-white p-2" : "rounded-2xl border border-slate-200/80 bg-white/95 p-10"}>
      <svg viewBox={`0 0 ${size} ${size}`} className={compact ? "h-auto w-full max-w-[420px] overflow-visible" : "h-auto w-full max-w-[700px] overflow-visible"}>
        {Array.from({ length: levels }).map((_, i) => {
          const ringRadius = radius * ((i + 1) / levels);
          const ringPoints = axes
            .map((axis) => {
              const ratio = ringRadius / radius;
              const x = center + (axis.x - center) * ratio;
              const y = center + (axis.y - center) * ratio;
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polygon
              key={`ring-${i}`}
              points={ringPoints}
              fill="none"
              stroke="rgb(226 232 240)"
              strokeWidth="1"
            />
          );
        })}

        {axes.map((axis) => (
          <line
            key={`axis-${axis.dimension}`}
            x1={center}
            y1={center}
            x2={axis.x}
            y2={axis.y}
            stroke="rgb(226 232 240)"
            strokeWidth="1"
          />
        ))}

        {participants.map((participant) => {
          const polygon = pointsFromSeries(participant.scores, axes, center);
          if (!polygon) return null;
          return (
            <g key={participant.id}>
              <polygon
                points={polygon}
                fill={participant.color}
                fillOpacity="0.4"
                stroke={participant.color}
                strokeWidth="3"
                style={{ transition: "all 320ms ease" }}
              />
            </g>
          );
        })}

        {axes.map((axis) => (
          <text
            key={`label-${axis.dimension}`}
            x={axis.lx}
            y={axis.ly}
            textAnchor={textAnchor(axis.angle)}
            dominantBaseline="middle"
            fontSize="14"
            fill="rgb(30 41 59)"
          >
            {LABELS[axis.dimension]}
          </text>
        ))}
      </svg>

      <div className={compact ? "mt-4 flex flex-wrap gap-5 text-[11px] tracking-[0.1em] text-slate-500" : "mt-8 flex flex-wrap gap-8 text-xs tracking-[0.1em] text-slate-600"}>
        {participants.map((participant) => (
          <LegendDot key={participant.id} color={participant.color} label={participant.label} />
        ))}
      </div>
    </div>
  );
}

function pointsFromSeries(
  series: RadarSeries,
  axes: { dimension: (typeof REPORT_DIMENSIONS)[number]; x: number; y: number }[],
  center: number
) {
  const points = axes.map((axis) => {
    const value = series[axis.dimension];
    const normalized = value == null ? 0 : Math.max(1, Math.min(6, value));
    const ratio = value == null ? 0 : normalized / 6;
    const x = center + (axis.x - center) * ratio;
    const y = center + (axis.y - center) * ratio;
    return `${x},${y}`;
  });

  if (points.every((point) => point === `${center},${center}`)) {
    return "";
  }

  return points.join(" ");
}

function textAnchor(angle: number) {
  const cos = Math.cos(angle);
  if (Math.abs(cos) < 0.2) return "middle";
  return cos > 0 ? "start" : "end";
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
