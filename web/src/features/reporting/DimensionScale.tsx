type Props = {
  score: number | null;
  leftLabel: string;
  rightLabel: string;
  compact?: boolean;
  showPoleLabels?: boolean;
  className?: string;
};

export function DimensionScale({
  score,
  leftLabel,
  rightLabel,
  compact = false,
  showPoleLabels = true,
  className = "",
}: Props) {
  const normalizedScore = normalizeScore(score);
  const position = normalizedScore != null ? toPercent(normalizedScore) : null;

  return (
    <div className={className}>
      <div className={`relative w-full ${compact ? "h-7" : "h-9"}`}>
        <div
          className={`absolute left-0 right-0 rounded-full bg-slate-200/85 ${compact ? "top-3 h-[1.5px]" : "top-4 h-[2px]"}`}
        />
        <div
          className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-300/90 ${compact ? "top-[9px] h-2.5 w-[1px]" : "top-3.5 h-3 w-[1px]"}`}
        />

        {position != null ? (
          <div
            className={`absolute -translate-x-1/2 rounded-full border border-white bg-slate-900 shadow-[0_4px_10px_rgba(15,23,42,0.12)] ${compact ? "top-[7px] h-3 w-3" : "top-2.5 h-3.5 w-3.5"}`}
            style={{ left: `${position}%` }}
          />
        ) : null}
      </div>

      {showPoleLabels ? (
        <div
          className={`mt-2 flex items-start justify-between gap-4 ${compact ? "text-[10px]" : "text-[11px]"} leading-5 text-slate-500`}
        >
          <span className="max-w-[42%] text-left">{leftLabel}</span>
          <span className="max-w-[42%] text-right">{rightLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

function normalizeScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function toPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
