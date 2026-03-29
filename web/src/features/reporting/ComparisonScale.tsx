type Props = {
  scoreA: number | null;
  scoreB: number | null;
  markerA: string;
  markerB: string;
  participantAName: string;
  participantBName: string;
  lowLabel: string;
  highLabel: string;
  valueScale?: "legacy_1_6" | "founder_percent";
  compact?: boolean;
};

export function ComparisonScale({
  scoreA,
  scoreB,
  markerA,
  markerB,
  participantAName,
  participantBName,
  lowLabel,
  highLabel,
  valueScale = "legacy_1_6",
  compact = false,
}: Props) {
  const a = normalizeScore(scoreA, valueScale);
  const b = normalizeScore(scoreB, valueScale);
  const left = a != null ? toPercent(a, valueScale) : null;
  const right = b != null ? toPercent(b, valueScale) : null;
  const markersAreClose = left != null && right != null ? Math.abs(left - right) < 7 : false;

  const tensionLeft =
    left != null && right != null ? Math.min(left, right) : null;
  const tensionWidth =
    left != null && right != null ? Math.abs(left - right) : null;

  return (
    <div className="w-full">
      <div>
        <div className={`relative w-full ${compact ? "h-9" : "h-11"}`}>
          <div
            className={`absolute left-0 right-0 z-0 rounded-full bg-slate-200 print:bg-slate-300 ${
              compact ? "top-3.5 h-[2px]" : "top-4 h-[3px]"
            }`}
          />
          <div
            className={`absolute left-0 right-0 z-[1] rounded-full bg-gradient-to-r from-[#00B8D9]/55 to-[#7C3AED]/55 print:from-[#00B8D9] print:to-[#7C3AED] ${
              compact ? "top-3.5 h-[2px]" : "top-4 h-[3px]"
            }`}
          />

          {tensionLeft != null && tensionWidth != null ? (
            <div
              className={`absolute z-10 rounded-full bg-slate-300/80 ${
                compact ? "top-[11px] h-[3px]" : "top-[13px] h-[4px]"
              }`}
              style={{ left: `${tensionLeft}%`, width: `${tensionWidth}%` }}
            />
          ) : null}

          {left != null ? (
            <Marker
              left={left}
              color="#00B8D9"
              text={markerA}
              title={participantAName}
              offsetY={compact ? (markersAreClose ? -1 : 1) : markersAreClose ? 0 : 4}
              zIndex={markersAreClose ? 30 : 20}
              compact={compact}
            />
          ) : null}

          {right != null ? (
            <Marker
              left={right}
              color="#7C3AED"
              text={markerB}
              title={participantBName}
              offsetY={compact ? (markersAreClose ? 7 : 1) : markersAreClose ? 10 : 4}
              zIndex={markersAreClose ? 20 : 20}
              compact={compact}
            />
          ) : null}
        </div>

        <div
          className={`flex items-start justify-between gap-6 leading-5 ${
            compact ? "mt-2 text-[10px]" : "mt-2.5 text-[11px]"
          }`}
        >
          <span className="max-w-[42%] text-left text-[#00B8D9]/85">{lowLabel}</span>
          <span className="max-w-[42%] text-right text-[#7C3AED]/85">{highLabel}</span>
        </div>
      </div>
    </div>
  );
}

function Marker({
  left,
  color,
  text,
  title,
  offsetY,
  zIndex,
  compact,
}: {
  left: number;
  color: string;
  text: string;
  title: string;
  offsetY: number;
  zIndex: number;
  compact: boolean;
}) {
  return (
    <div
      className="absolute -translate-x-1/2"
      style={{ left: `${left}%`, top: `${offsetY}px`, zIndex }}
      title={title}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full border-2 border-white font-semibold text-white shadow-[0_4px_10px_rgba(15,23,42,0.16)] print:border-white print:shadow-none ${
          compact ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]"
        }`}
        style={{ backgroundColor: color }}
      >
        {text}
      </span>
    </div>
  );
}

function normalizeScore(value: number | null, valueScale: "legacy_1_6" | "founder_percent") {
  if (value == null || !Number.isFinite(value)) return null;
  return valueScale === "founder_percent"
    ? Math.max(0, Math.min(100, value))
    : Math.max(1, Math.min(6, value));
}

function toPercent(value: number, valueScale: "legacy_1_6" | "founder_percent") {
  return valueScale === "founder_percent" ? value : ((value - 1) / 5) * 100;
}
