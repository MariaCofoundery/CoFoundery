import { requireFounderDimensionMeta } from "@/features/reporting/founderDimensionMeta";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type DynamicMapDimension = {
  dimension: string;
  scoreA: number | null;
  scoreB: number | null;
  distance: number | null;
};

type FounderTeamDynamicMapProps = {
  dimensions: DynamicMapDimension[];
  founderAName?: string | null;
  founderBName?: string | null;
};

type Point = {
  x: number;
  y: number;
};

const X_AXIS_DIMENSIONS = [
  requireFounderDimensionMeta("Risikoorientierung"),
  requireFounderDimensionMeta("Entscheidungslogik"),
] as const;

const Y_AXIS_DIMENSIONS = [
  requireFounderDimensionMeta("Arbeitsstruktur & Zusammenarbeit"),
  requireFounderDimensionMeta("Commitment"),
  requireFounderDimensionMeta("Konfliktstil"),
] as const;

function mean(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function findDimension(
  dimensions: DynamicMapDimension[],
  target: string
): DynamicMapDimension | undefined {
  return dimensions.find((dimension) => dimension.dimension === target);
}

function deriveFounderPoint(
  dimensions: DynamicMapDimension[],
  founderKey: "scoreA" | "scoreB"
): Point {
  // The map direction is intentionally tied to explicit pole metadata:
  // higher values lean toward each dimension's right pole, lower values toward the left pole.
  const x = mean(
    X_AXIS_DIMENSIONS
      .map((meta) => findDimension(dimensions, meta.canonicalName)?.[founderKey] ?? null)
      .filter((value): value is number => value != null)
  );
  const y = mean(
    Y_AXIS_DIMENSIONS
      .map((meta) => findDimension(dimensions, meta.canonicalName)?.[founderKey] ?? null)
      .filter((value): value is number => value != null)
  );

  return {
    x: clamp(x ?? 50),
    y: clamp(y ?? 50),
  };
}

function deriveDifferenceSentence(dimensions: DynamicMapDimension[]) {
  const sorted = [...dimensions]
    .filter((dimension) => dimension.distance != null)
    .sort((a, b) => (b.distance ?? 0) - (a.distance ?? 0));

  const first = sorted[0];
  const second = sorted[1];

  if (!first || first.distance == null || first.distance < 20) {
    return t(
      "Insgesamt liegen eure Positionen ueber die relevanten Bereiche hinweg relativ nah beieinander und wirken gut integrierbar."
    );
  }

  if (second && second.distance != null && second.distance >= 20) {
    return t(
      `Unterschiede zeigen sich vor allem dort, wo ${first.dimension.toLowerCase()} und ${second.dimension.toLowerCase()} im Alltag unterschiedlich priorisiert oder erlebt werden.`
    );
  }

  return t(
    `Unterschiede zeigen sich vor allem im Bereich ${first.dimension.toLowerCase()}, wo eure Arbeitslogiken derzeit etwas weiter auseinanderliegen.`
  );
}

function initials(name: string | null | undefined) {
  const normalized = name?.trim() ?? "";
  if (!normalized) return "?";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function founderLabel(name: string | null | undefined, fallback: string) {
  return name?.trim() || fallback;
}

function mapPosition(value: number, size: number, padding: number) {
  return padding + (value / 100) * (size - padding * 2);
}

export function FounderTeamDynamicMap({
  dimensions,
  founderAName,
  founderBName,
}: FounderTeamDynamicMapProps) {
  const founderA = deriveFounderPoint(dimensions, "scoreA");
  const founderB = deriveFounderPoint(dimensions, "scoreB");
  const team = {
    x: (founderA.x + founderB.x) / 2,
    y: (founderA.y + founderB.y) / 2,
  };

  const size = 520;
  const padding = 52;
  const pointA = {
    x: mapPosition(founderA.x, size, padding),
    y: mapPosition(100 - founderA.y, size, padding),
  };
  const pointB = {
    x: mapPosition(founderB.x, size, padding),
    y: mapPosition(100 - founderB.y, size, padding),
  };
  const teamPoint = {
    x: mapPosition(team.x, size, padding),
    y: mapPosition(100 - team.y, size, padding),
  };

  const differenceSentence = deriveDifferenceSentence(dimensions);
  const founderALabel = founderLabel(founderAName, "Founder A");
  const founderBLabel = founderLabel(founderBName, "Founder B");

  return (
    <div className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-6 md:p-8">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/88 p-5 md:p-6">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full overflow-visible">
          <rect
            x={padding}
            y={padding}
            width={size - padding * 2}
            height={size - padding * 2}
            rx="28"
            fill="rgba(248,250,252,0.72)"
            stroke="rgb(226 232 240)"
          />

          <line
            x1={padding}
            y1={size / 2}
            x2={size - padding}
            y2={size / 2}
            stroke="rgb(226 232 240)"
            strokeWidth="1"
          />
          <line
            x1={size / 2}
            y1={padding}
            x2={size / 2}
            y2={size - padding}
            stroke="rgb(226 232 240)"
            strokeWidth="1"
          />

          <text
            x={size / 2}
            y={size - 6}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="rgb(100 116 139)"
          >
            Tempo & Umgang mit Unsicherheit
          </text>
          <text
            x={16}
            y={size / 2 + 4}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="rgb(100 116 139)"
            transform={`rotate(-90 16 ${size / 2 + 4})`}
          >
            Struktur & Abstimmung
          </text>

          <text
            x={size / 2}
            y={padding + 14}
            textAnchor="middle"
            fontSize="11"
            fill="rgb(71 85 105)"
          >
            {t("staerker abgestimmt")}
          </text>
          <text
            x={size / 2}
            y={size - padding - 10}
            textAnchor="middle"
            fontSize="11"
            fill="rgb(71 85 105)"
          >
            {t("autonomer")}
          </text>
          <text
            x={padding + 6}
            y={size / 2 - 8}
            textAnchor="start"
            fontSize="11"
            fill="rgb(71 85 105)"
          >
            {t("absichernder")}
          </text>
          <text
            x={size - padding - 6}
            y={size / 2 - 8}
            textAnchor="end"
            fontSize="11"
            fill="rgb(71 85 105)"
          >
            {t("experimenteller")}
          </text>

          <line
            x1={pointA.x}
            y1={pointA.y}
            x2={pointB.x}
            y2={pointB.y}
            stroke="rgb(203 213 225)"
            strokeDasharray="6 6"
            strokeWidth="1.5"
          />

          <g>
            <circle
              cx={teamPoint.x}
              cy={teamPoint.y}
              r="20"
              fill="white"
              stroke="rgb(15 23 42)"
              strokeWidth="2.5"
            />
            <circle
              cx={teamPoint.x}
              cy={teamPoint.y}
              r="8"
              fill="rgb(15 23 42)"
            />
            <text
              x={teamPoint.x}
              y={teamPoint.y - 28}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="rgb(15 23 42)"
            >
              Team
            </text>
          </g>

          <g>
            <circle
              cx={pointA.x}
              cy={pointA.y}
              r="18"
              fill="var(--brand-primary)"
              stroke="white"
              strokeWidth="3"
            />
            <text
              x={pointA.x}
              y={pointA.y + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="white"
            >
              {initials(founderAName)}
            </text>
            <text
              x={pointA.x}
              y={pointA.y - 28}
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fill="rgb(71 85 105)"
            >
              {founderALabel}
            </text>
          </g>

          <g>
            <circle
              cx={pointB.x}
              cy={pointB.y}
              r="18"
              fill="var(--brand-accent)"
              stroke="white"
              strokeWidth="3"
            />
            <text
              x={pointB.x}
              y={pointB.y + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="white"
            >
              {initials(founderBName)}
            </text>
            <text
              x={pointB.x}
              y={pointB.y - 28}
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fill="rgb(71 85 105)"
            >
              {founderBLabel}
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-sm leading-7 text-slate-700">
          {t(
            "Im Mittel bewegt sich euer Team derzeit zwischen Tempo und Absicherung sowie zwischen Eigenstaendigkeit und klarer Abstimmung."
          )}
        </p>
        <p className="text-sm leading-7 text-slate-600">{t(differenceSentence)}</p>
      </div>
    </div>
  );
}
