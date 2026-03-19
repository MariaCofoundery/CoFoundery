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
}: Props) {
  const a = normalizeScore(scoreA, valueScale);
  const b = normalizeScore(scoreB, valueScale);
  const left = a != null ? toPercent(a, valueScale) : null;
  const right = b != null ? toPercent(b, valueScale) : null;

  const tensionLeft =
    left != null && right != null ? Math.min(left, right) : null;
  const tensionWidth =
    left != null && right != null ? Math.abs(left - right) : null;

  return (
    <div className="w-full">
      <div>
        <div className="relative h-9 w-full">
          <div className="absolute left-0 right-0 top-4 z-0 h-[3px] rounded-full bg-slate-200 print:bg-slate-300" />
          <div className="absolute left-0 right-0 top-4 z-[1] h-[3px] rounded-full bg-gradient-to-r from-[#00B8D9]/70 to-[#7C3AED]/70 print:from-[#00B8D9] print:to-[#7C3AED]" />

          {tensionLeft != null && tensionWidth != null ? (
            <div
              className="absolute top-[13px] z-10 h-[4px] rounded-full bg-slate-300/85"
              style={{ left: `${tensionLeft}%`, width: `${tensionWidth}%` }}
            />
          ) : null}

          {left != null ? (
            <Marker
              left={left}
              color="#00B8D9"
              text={markerA}
              title={participantAName}
            />
          ) : null}

          {right != null ? (
            <Marker
              left={right}
              color="#7C3AED"
              text={markerB}
              title={participantBName}
            />
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-[#00B8D9]">{lowLabel}</span>
          <span className="text-[#7C3AED]">{highLabel}</span>
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
}: {
  left: number;
  color: string;
  text: string;
  title: string;
}) {
  return (
    <div
      className="absolute top-0 z-20 -translate-x-1/2"
      style={{ left: `${left}%` }}
      title={title}
    >
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white shadow-[0_4px_10px_rgba(15,23,42,0.16)] print:shadow-none"
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
