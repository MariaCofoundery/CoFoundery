"use client";

import { useState, useTransition } from "react";
import { setFinancingStatusAction } from "@/features/financing/financingActions";
import { nextFinancingStatus, type FinancingStatus } from "@/features/financing/financingModel";

const TONE: Record<FinancingStatus, string> = {
  open: "bg-[#f7f6fb] text-[#33325e] border-[#e4e2f0]",
  progress: "bg-[#e1f1f9] text-[#0a6a9c] border-transparent",
  done: "bg-[#e3f5f1] text-[#0f7b6c] border-transparent",
  na: "bg-[#f7f6fb] text-[#5f5e7a] border-[#e4e2f0] line-through",
};

/**
 * Ein Klick wechselt den Status zum naechsten. Sofort sichtbar (optimistisch); schlaegt das
 * Speichern fehl, springt er zurueck und sagt es.
 */
export function FinancingStatusButton({
  teamId,
  itemKey,
  initial,
  labels,
  itemTitle,
  errorText,
}: {
  teamId: string;
  itemKey: string;
  initial: FinancingStatus;
  labels: Record<FinancingStatus, string>;
  itemTitle: string;
  errorText: string;
}) {
  const [status, setStatus] = useState<FinancingStatus>(initial);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function change() {
    const previous = status;
    const next = nextFinancingStatus(previous);
    setStatus(next);
    setFailed(false);
    startTransition(async () => {
      const result = await setFinancingStatusAction(teamId, itemKey, next);
      if (!result.ok) {
        setStatus(previous);
        setFailed(true);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={change}
        disabled={pending}
        aria-label={`${itemTitle}: ${labels[status]}`}
        className={`min-h-9 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] disabled:opacity-70 ${TONE[status]}`}
      >
        {labels[status]}
      </button>
      {failed ? <span role="alert" className="text-xs text-rose-700">{errorText}</span> : null}
    </span>
  );
}
