import Link from "next/link";
import {
  getFounderPreviewViewerOptions,
  type FounderPreviewMode,
  type FounderPreviewViewerRole,
} from "@/features/reporting/debugFounderPreviewData";

type Props = {
  pathname: string;
  currentMode: FounderPreviewMode;
  currentViewer: FounderPreviewViewerRole;
};

export function DebugWorkbookViewerSwitch({
  pathname,
  currentMode,
  currentViewer,
}: Props) {
  const viewers = getFounderPreviewViewerOptions(currentMode);

  return (
    <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] print:hidden">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Preview User</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {viewers.map((viewer) => {
          const isActive = viewer.id === currentViewer;
          return (
            <Link
              key={viewer.id}
              href={`${pathname}?mode=${currentMode}&viewer=${viewer.id}`}
              className={`inline-flex rounded-full border px-4 py-2 text-sm transition ${
                isActive
                  ? "border-[color:var(--brand-accent)] bg-[color:var(--brand-accent)] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {viewer.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
