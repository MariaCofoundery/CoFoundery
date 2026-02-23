type ScaleTone =
  | "hohe_passung"
  | "produktive_ergaenzung"
  | "abstimmungsbedarf"
  | "daten_unvollstaendig";

type Props = {
  scoreA: number | null;
  scoreB: number | null;
  participantAName: string;
  participantBName: string;
  anchorLeft: string;
  anchorMid: string;
  anchorRight: string;
  tone: ScaleTone;
  toneLabel: string;
};

export function DimensionScale({
  scoreA,
  scoreB,
  participantAName,
  participantBName,
  anchorLeft,
  anchorMid,
  anchorRight,
  tone,
  toneLabel,
}: Props) {
  const normalizedA = normalizeScore(scoreA);
  const normalizedB = normalizeScore(scoreB);
  const hasCompleteData = normalizedA != null && normalizedB != null;
  const posA = normalizedA != null ? toPercent(normalizedA) : null;
  const posB = normalizedB != null ? toPercent(normalizedB) : null;
  const overlap = posA != null && posB != null ? Math.abs(posA - posB) < 10 : false;
  const bandClass = toneBandClass(tone, hasCompleteData);

  return (
    <div className={`mt-4 rounded-xl border p-4 ${bandClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">Spektrum</p>
        <span className="rounded-full border border-slate-300/80 bg-white/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700">
          {toneLabel}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200/80 bg-white/90 p-3">
        <div className="relative h-16">
          <div className={`absolute left-0 right-0 top-7 h-3 rounded-full ${hasCompleteData ? toneRailClass(tone) : "bg-slate-200/80"}`} />
          <div className="absolute left-0 right-0 top-[30px] h-[2px] bg-slate-300" />

          {hasCompleteData && posA != null ? (
            <ScaleMarker
              position={posA}
              badge={initials(participantAName)}
              label={participantAName}
              colorClass="bg-[color:var(--brand-primary)]"
              topOffset={overlap ? 0 : 2}
            />
          ) : null}

          {hasCompleteData && posB != null ? (
            <ScaleMarker
              position={posB}
              badge={initials(participantBName)}
              label={participantBName}
              colorClass="bg-[color:var(--brand-accent)]"
              topOffset={overlap ? 18 : 2}
            />
          ) : null}
        </div>

        <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
          <span className="text-left">{anchorLeft}</span>
          <span className="text-center">{anchorMid}</span>
          <span className="text-right">{anchorRight}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
          <LegendDot colorClass="bg-[color:var(--brand-primary)]" label={participantAName} />
          <LegendDot colorClass="bg-[color:var(--brand-accent)]" label={participantBName} />
        </div>

        {!hasCompleteData ? (
          <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Zu wenig Daten für diese Dimension.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ScaleMarker({
  position,
  badge,
  label,
  colorClass,
  topOffset,
}: {
  position: number;
  badge: string;
  label: string;
  colorClass: string;
  topOffset: number;
}) {
  return (
    <div className="absolute z-20 -translate-x-1/2" style={{ left: `${position}%`, top: `${topOffset}px` }}>
      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${colorClass}`} title={label}>
        {badge}
      </span>
      <span className={`absolute left-1/2 top-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white ${colorClass}`} />
    </div>
  );
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </span>
  );
}

function normalizeScore(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(1, Math.min(6, value));
}

function toPercent(value: number) {
  return Math.max(0, Math.min(100, ((value - 1) / 5) * 100));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function toneBandClass(tone: ScaleTone, hasCompleteData: boolean) {
  if (!hasCompleteData || tone === "daten_unvollstaendig") {
    return "border-slate-200/80 bg-slate-50/60";
  }
  if (tone === "hohe_passung") {
    return "border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/8";
  }
  if (tone === "produktive_ergaenzung") {
    return "border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/6";
  }
  return "border-[color:var(--brand-accent)]/30 bg-[color:var(--brand-accent)]/10";
}

function toneRailClass(tone: ScaleTone) {
  if (tone === "hohe_passung") {
    return "bg-[color:var(--brand-primary)]/25";
  }
  if (tone === "produktive_ergaenzung") {
    return "bg-[color:var(--brand-accent)]/20";
  }
  if (tone === "abstimmungsbedarf") {
    return "bg-[color:var(--brand-accent)]/30";
  }
  return "bg-slate-200/80";
}
