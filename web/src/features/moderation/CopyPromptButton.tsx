"use client";

import { useState } from "react";

/** Der Vorschlagstext zum Kopieren; scheitert die Zwischenablage, bleibt er markierbar im Feld. */
export function CopyPromptButton({ prompt, copy, copied, manual }: { prompt: string; copy: string; copied: string; manual: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return (
    <div className="mt-1">
      <textarea readOnly rows={4} value={prompt} onFocus={(event) => event.currentTarget.select()} aria-label={copy} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800" />
      <button type="button" onClick={onCopy} className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">{copy}</button>
      <span role="status" className="ml-3 text-sm text-slate-600">{state === "copied" ? copied : state === "failed" ? manual : ""}</span>
    </div>
  );
}
