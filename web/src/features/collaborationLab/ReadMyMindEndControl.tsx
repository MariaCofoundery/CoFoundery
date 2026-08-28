"use client";

import { useState } from "react";

export function ReadMyMindEndControl({ action, label, confirmation, cancel }: { action: () => void | Promise<void>; label: string; confirmation: string; cancel: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" aria-expanded="false" onClick={() => setOpen(true)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">{label}</button>;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" role="group" aria-label={label}>
      <p className="text-sm leading-6 text-slate-700">{confirmation}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={action}><button type="submit" className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">{label}</button></form>
        <button type="button" onClick={() => setOpen(false)} className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">{cancel}</button>
      </div>
    </div>
  );
}
