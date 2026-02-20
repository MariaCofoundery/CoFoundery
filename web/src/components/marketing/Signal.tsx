type SignalProps = {
  label: string;
  status: string;
  tone: string;
};

export function Signal({ label, status, tone }: SignalProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[color:var(--line)] bg-white px-4 py-3">
      <span className="text-sm">{label}</span>
      <span className="inline-flex items-center gap-2 font-[var(--font-display)] text-[10px] tracking-[0.16em] text-[color:var(--muted)]">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone }} />
        {status}
      </span>
    </div>
  );
}
