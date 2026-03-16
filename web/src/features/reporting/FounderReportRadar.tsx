type RadarDatum = {
  key: string;
  label: string;
  scoreA: number | null;
  scoreB: number | null;
};

type FounderReportRadarProps = {
  data: RadarDatum[];
  labelA?: string;
  labelB?: string;
};

function polarToCartesian(center: number, radius: number, angle: number) {
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}

function clampScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function buildPolygonPoints(
  values: Array<number | null>,
  angles: number[],
  center: number,
  radius: number
) {
  const points = values.map((value, index) => {
    const safeRadius = (clampScore(value) / 100) * radius;
    const point = polarToCartesian(center, safeRadius, angles[index]);
    return `${point.x},${point.y}`;
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

export function FounderReportRadar({
  data,
  labelA = "Founder A",
  labelB = "Founder B",
}: FounderReportRadarProps) {
  const size = 540;
  const center = size / 2;
  const radius = 146;
  const levels = 5;

  const angles = data.map((_, index) => (Math.PI * 2 * index) / data.length - Math.PI / 2);
  const axes = data.map((item, index) => {
    const point = polarToCartesian(center, radius, angles[index]);
    const labelPoint = polarToCartesian(center, radius + 42, angles[index]);
    return {
      ...item,
      angle: angles[index],
      x: point.x,
      y: point.y,
      lx: labelPoint.x,
      ly: labelPoint.y,
    };
  });

  const polygonA = buildPolygonPoints(
    data.map((item) => item.scoreA),
    angles,
    center,
    radius
  );
  const polygonB = buildPolygonPoints(
    data.map((item) => item.scoreB),
    angles,
    center,
    radius
  );

  return (
    <div className="px-2 py-2 sm:px-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full overflow-hidden">
        {Array.from({ length: levels }).map((_, index) => {
          const ringRadius = radius * ((index + 1) / levels);
          const ringPoints = axes
            .map((axis) => {
              const point = polarToCartesian(center, ringRadius, axis.angle);
              return `${point.x},${point.y}`;
            })
            .join(" ");

          return (
            <polygon
              key={`ring-${index}`}
              points={ringPoints}
              fill="none"
              stroke={index === levels - 1 ? "rgb(148 163 184 / 0.9)" : "rgb(226 232 240)"}
              strokeWidth={index === levels - 1 ? "1.2" : "1"}
            />
          );
        })}

        {axes.map((axis) => (
          <line
            key={`axis-${axis.key}`}
            x1={center}
            y1={center}
            x2={axis.x}
            y2={axis.y}
            stroke="rgb(226 232 240)"
            strokeWidth="1"
          />
        ))}

        {polygonA ? (
          <polygon
            points={polygonA}
            fill="rgb(103 232 249 / 0.12)"
            stroke="var(--brand-primary)"
            strokeWidth="2.4"
          />
        ) : null}
        {polygonB ? (
          <polygon
            points={polygonB}
            fill="rgb(124 58 237 / 0.08)"
            stroke="var(--brand-accent)"
            strokeWidth="2.4"
          />
        ) : null}

        {axes.map((axis) => {
          const pointA = polarToCartesian(
            center,
            (clampScore(axis.scoreA) / 100) * radius,
            axis.angle
          );
          const pointB = polarToCartesian(
            center,
            (clampScore(axis.scoreB) / 100) * radius,
            axis.angle
          );

          return (
            <g key={`points-${axis.key}`}>
              {axis.scoreA != null ? (
                <circle
                  cx={pointA.x}
                  cy={pointA.y}
                  r="4.4"
                  fill="var(--brand-primary)"
                  stroke="white"
                  strokeWidth="1.5"
                />
              ) : null}
              {axis.scoreB != null ? (
                <circle
                  cx={pointB.x}
                  cy={pointB.y}
                  r="4.4"
                  fill="var(--brand-accent)"
                  stroke="white"
                  strokeWidth="1.5"
                />
              ) : null}
            </g>
          );
        })}

        {axes.map((axis) => (
          <g key={`label-${axis.key}`}>
            <text
              x={axis.lx}
              y={axis.ly}
              textAnchor={textAnchor(axis.angle)}
              dominantBaseline="middle"
              fontSize="13"
              fill="rgb(15 23 42)"
              fontWeight="500"
            >
              {axis.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-10 flex flex-wrap gap-3 text-xs tracking-[0.08em] text-slate-600">
        <LegendDot color="var(--brand-primary)" label={labelA} />
        <LegendDot color="var(--brand-accent)" label={labelB} />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}
