import Link from "next/link";
import {
  getFounderPreviewModeOptions,
  type FounderPreviewMode,
} from "@/features/reporting/debugFounderPreviewData";

type Props = {
  pathname: string;
  currentMode: FounderPreviewMode;
};

export function DebugFounderPreviewModeSwitch({ pathname, currentMode }: Props) {
  const modes = getFounderPreviewModeOptions();

  return (
    <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] print:hidden">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Preview Mode</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {modes.map((mode) => {
          const isActive = mode.id === currentMode;
          return (
            <Link
              key={mode.id}
              href={`${pathname}?mode=${mode.id}`}
              className={`inline-flex rounded-full border px-4 py-2 text-sm transition ${
                isActive
                  ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {mode.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
