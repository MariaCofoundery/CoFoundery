type Props = {
  scoreA: number | null;
  scoreB: number | null;
  markerA: string;
  markerB: string;
  participantAName: string;
  participantBName: string;
  lowLabel: string;
  highLabel: string;
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
}: Props) {
  const a = normalizeScore(scoreA);
  const b = normalizeScore(scoreB);
  const left = a != null ? toPercent(a) : null;
  const right = b != null ? toPercent(b) : null;

  const tensionLeft =
    left != null && right != null ? Math.min(left, right) : null;
  const tensionWidth =
    left != null && right != null ? Math.abs(left - right) : null;

  return (
    <div className="w-full">
      <div>
        <div className="relative h-9 w-full">
          <div className="absolute left-0 right-0 top-4 z-0 h-[2px] bg-[#E5E7EB]" />
          <div className="absolute left-0 right-0 top-4 z-[1] h-[2px] bg-gradient-to-r from-[#00B8D9]/60 to-[#7C3AED]/60" />

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
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {text}
      </span>
    </div>
  );
}

function normalizeScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(1, Math.min(6, value));
}

function toPercent(value: number) {
  return ((value - 1) / 5) * 100;
}
