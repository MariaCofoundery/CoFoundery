type KpiProps = {
  title: string;
  value: string;
};

export function Kpi({ title, value }: KpiProps) {
  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-white/80 px-4 py-3">
      <div className="font-[var(--font-display)] text-sm">{title}</div>
      <div className="mt-1 text-xs tracking-[0.14em] text-[color:var(--muted)]">{value}</div>
    </div>
  );
}
