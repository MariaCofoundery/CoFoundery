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
      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-[#4a2fb8]">{label}</p>
      <ol className="flex min-w-0 flex-1 items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          return (
            <li
              key={position}
              className={`h-1.5 min-w-3 flex-1 rounded-full transition-[background-color,transform] duration-300 motion-reduce:transition-none ${
                position < current
                  ? "bg-[#9a82e8]"
                  : position === current
                    ? "scale-y-150 brand-cta"
                    : "bg-[#e4e2f0]"
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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d9cff8] bg-[#efeafd] text-sm font-semibold text-[#3a2394] shadow-sm">
        {initial(selfLabel)}
      </div>
      <div className="relative mx-3 h-px flex-1 bg-gradient-to-r from-[#b9a8f0] via-[#e8c36a] to-[#d9a53a]" aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border border-white bg-[#e8c36a] shadow-sm" />
      </div>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#f3dca0] bg-[#fdecc8] text-sm font-semibold text-[#5c3200] shadow-sm">
        {initial(partnerName)}
      </div>
      <span className="ml-3 min-w-0 truncate text-sm font-semibold text-[#33325e]">{partnerName}</span>
    </div>
  );
}
