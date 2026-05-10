type EventScaleTrackProps = {
  score: number;
  variant?: "self" | "other";
};

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 50;
  }

  return Math.max(0, Math.min(100, score));
}

export function EventScaleTrack({
  score,
  variant = "self",
}: EventScaleTrackProps) {
  const clampedScore = clampScore(score);
  const markerTone =
    variant === "other"
      ? {
          marker: "#7C3AED",
          shadow: "0 6px 14px rgba(124,58,237,0.22)",
        }
      : {
          marker: "#00B8D9",
          shadow: "0 6px 14px rgba(0,184,217,0.22)",
        };

  return (
    <div className="w-full">
      <div className="relative h-9 w-full overflow-visible">
        <div className="absolute left-0 right-0 top-4 z-0 h-[3px] rounded-full bg-slate-200" />
        <div
          className="absolute left-0 right-0 top-4 z-[1] h-[3px] rounded-full bg-gradient-to-r from-[#00B8D9]/45 to-[#7C3AED]/45"
        />
        <div
          aria-hidden="true"
          className="absolute left-0 top-1/2 z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white"
          style={{
            left: `${clampedScore}%`,
            backgroundColor: markerTone.marker,
            boxShadow: markerTone.shadow,
          }}
        />
      </div>
    </div>
  );
}
