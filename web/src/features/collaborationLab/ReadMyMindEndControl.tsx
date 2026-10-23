"use client";

import { useEffect, useId, useState } from "react";

export function ReadMyMindEndControl({ action, label, confirmation, cancel, title, note, variant = "quiet" }: { action: () => void | Promise<void>; label: string; confirmation: string; cancel: string; title?: string; note?: string; variant?: "quiet" | "danger" }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  if (!open) return <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={`rounded-lg px-3 py-2 text-sm font-medium underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variant === "danger" ? "border border-rose-200 bg-white text-rose-800 hover:bg-rose-50 focus-visible:ring-rose-400" : "text-[#5f5e7a] hover:underline focus-visible:ring-[#9a82e8]"}`}>{label}</button>;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f3a]/45 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="w-full max-w-md rounded-2xl border border-[#e4e2f0] bg-white p-5 shadow-2xl sm:p-6">
        <h2 id={titleId} className="text-xl font-semibold text-[#0b1f3a]">{title ?? label}</h2>
        <p className="mt-3 text-sm leading-6 text-[#33325e]">{confirmation}</p>
        {note ? <p className="mt-3 rounded-xl bg-[#fff8e6] px-3 py-2 text-xs leading-5 text-[#5c3200]">{note}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button autoFocus type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg border border-[#e4e2f0] px-4 py-2 text-sm font-medium text-[#33325e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b89aa] focus-visible:ring-offset-2">{cancel}</button>
          <form action={action}><button type="submit" className={`min-h-10 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variant === "danger" ? "bg-rose-700 hover:bg-rose-800 focus-visible:ring-rose-500" : "bg-[#0b1f3a] focus-visible:ring-[#5f5e7a]"}`}>{label}</button></form>
        </div>
      </div>
    </div>
  );
}
