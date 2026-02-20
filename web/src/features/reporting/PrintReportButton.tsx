"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
    >
      Als PDF speichern
    </button>
  );
}
