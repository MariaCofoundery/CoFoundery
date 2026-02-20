"use client";

import { useState } from "react";
import { type SessionAlignmentReport } from "@/features/reporting/types";

type Props = {
  report: SessionAlignmentReport;
};

export function CopyReportJsonButton({ report }: Props) {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1800);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium tracking-[0.08em] text-amber-800 hover:bg-amber-50"
      >
        Session-Daten als JSON kopieren
      </button>
      {status === "ok" ? <span className="text-xs text-emerald-700">Kopiert</span> : null}
      {status === "error" ? <span className="text-xs text-red-700">Fehlgeschlagen</span> : null}
    </div>
  );
}
