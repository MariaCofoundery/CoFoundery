"use client";

import { useEffect, useState } from "react";

/**
 * "Kurz erklaert" beim ersten Besuch eines Bereichs (Entwurf vom 05.11.2026): ein paar Saetze, wofuer der Bereich da
 * ist und wo man was findet. Erscheint je Geraet einmal; "Nicht mehr zeigen" und "Fertig" merken es sich im Browser.
 * Ohne Speicher (privates Fenster) erscheint der Tipp eben wieder - er haengt an nichts.
 */
export function FirstVisitTip({
  id,
  steps,
  labels,
}: {
  id: string;
  steps: { title: string; text: string }[];
  labels: { counter: string; next: string; done: string; dismiss: string };
}) {
  const key = `m2f_tip_${id}`;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(key) !== "seen") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [key]);

  const close = () => {
    try {
      window.localStorage.setItem(key, "seen");
    } catch {
      // Ohne Speicher erscheint der Tipp beim naechsten Mal wieder.
    }
    setOpen(false);
  };

  if (!open || steps.length === 0) return null;
  const step = steps[index];
  const last = index === steps.length - 1;
  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-slate-950/25" onClick={close} />
      <section role="dialog" aria-modal="true" aria-labelledby={`${key}-title`} className="work-ui fixed inset-x-4 top-28 z-50 mx-auto max-w-md rounded-[18px] bg-white p-5 shadow-[0_12px_30px_rgba(20,21,43,.22)]">
        <p className="text-[12.5px] font-semibold text-violet-800">{labels.counter.replace("{step}", String(index + 1)).replace("{total}", String(steps.length))}</p>
        <h2 id={`${key}-title`} className="mt-1.5 text-[18px] font-bold text-slate-950">{step.title}</h2>
        <p className="mt-2 text-[14.5px] leading-6 text-slate-800">{step.text}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="inline-flex min-h-10 items-center px-1 text-sm font-medium text-slate-600 underline-offset-4 hover:underline">{labels.dismiss}</button>
          <button type="button" autoFocus onClick={() => (last ? close() : setIndex(index + 1))} className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-[15px] font-semibold">
            {last ? labels.done : labels.next}
          </button>
        </div>
      </section>
    </>
  );
}
