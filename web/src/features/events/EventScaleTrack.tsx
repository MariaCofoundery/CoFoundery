type EventScaleTrackProps = {
  score: number;
  variant?: "self" | "other";
};

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, score));
}

export function EventScaleTrack({
  score,
  variant = "self",
}: EventScaleTrackProps) {
  const clampedScore = clampScore(score);
  const markerColor = variant === "other" ? "#7C3AED" : "#00B8D9";
  const shadowColor = variant === "other" ? "rgba(124,58,237,0.22)" : "rgba(0,184,217,0.24)";
  const railStart = 9;
  const railWidth = 98;
  const markerX = railStart + (clampedScore / 100) * railWidth;

  return (
    <div className="min-w-[120px] w-full">
      <svg
        viewBox="0 0 116 24"
        preserveAspectRatio="none"
        className="block h-6 w-full overflow-visible"
        aria-hidden="true"
      >
        <rect x={railStart} y="8" width={railWidth} height="8" rx="999" fill="#E6DCCB" />
        <rect x={railStart} y="8" width={railWidth} height="8" rx="999" fill="none" stroke="#D3C7B3" strokeWidth="0.8" />
        <circle cx={markerX} cy="12" r="8" fill="none" stroke={shadowColor} strokeWidth="4" opacity="0.22" />
        <circle cx={markerX} cy="12" r="8" fill={markerColor} stroke="#FFFFFF" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
