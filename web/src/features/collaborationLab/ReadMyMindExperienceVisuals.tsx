function initial(name: string) {
  return name.trim().charAt(0).toLocaleUpperCase() || "·";
}

export function ReadMyMindProgress({ current, total, label }: {
  current: number;
  total: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4" aria-label={label}>
      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-violet-800">{label}</p>
      <ol className="flex min-w-0 flex-1 items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          return (
            <li
              key={position}
              className={`h-1.5 min-w-3 flex-1 rounded-full transition-[background-color,transform] duration-300 motion-reduce:transition-none ${
                position < current
                  ? "bg-violet-400"
                  : position === current
                    ? "scale-y-150 bg-violet-700"
                    : "bg-slate-200"
              }`}
            />
          );
        })}
      </ol>
    </div>
  );
}

export function ReadMyMindHandoffVisual({ selfLabel, partnerName }: {
  selfLabel: string;
  partnerName: string;
}) {
  return (
    <div className="mt-6 flex max-w-md items-center" aria-label={`${selfLabel} · ${partnerName}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-100 text-sm font-semibold text-violet-900 shadow-sm">
        {initial(selfLabel)}
      </div>
      <div className="relative mx-3 h-px flex-1 bg-gradient-to-r from-violet-300 via-amber-300 to-amber-400" aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border border-white bg-amber-300 shadow-sm" />
      </div>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-100 text-sm font-semibold text-amber-950 shadow-sm">
        {initial(partnerName)}
      </div>
      <span className="ml-3 min-w-0 truncate text-sm font-semibold text-slate-700">{partnerName}</span>
    </div>
  );
}
