"use client";

import { useRef } from "react";

type Person = { name: string; values: { place: number; name: string; meaning: string | null }[] };

/**
 * Schneller Blick (Entwurf 10.11.2026): ein Pop-up mit dem, was jede Person mit diesem Team geteilt hat - Werte in ihrer
 * eigenen Reihenfolge, mit den eigenen Saetzen. Natives <dialog>: Escape schliesst, der Fokus bleibt im Fenster.
 * Reine Anzeige: nichts wird verglichen oder verrechnet.
 */
export function ValuesPeek({ people, label, title, close, place }: { people: Person[]; label: string; title: string; close: string; place: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50">{label}</button>
      <dialog
        ref={ref}
        aria-labelledby="values-peek-title"
        onClick={(event) => { if (event.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(42rem,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/50"
      >
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="values-peek-title" className="text-xl font-semibold text-slate-950">{title}</h2>
            <button type="button" onClick={() => ref.current?.close()} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">{close}</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {people.map((person) => (
              <article key={person.name} className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-[15px] font-bold">{person.name}</h3>
                <ol className="mt-2 grid gap-2">
                  {person.values.map((value) => (
                    <li key={value.place} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
                      <span aria-label={place.replace("{place}", String(value.place))} className="grid h-6 w-6 place-items-center rounded-full bg-violet-50 text-[12.5px] font-bold text-violet-900">{value.place}</span>
                      <span><b className="text-[14.5px]">{value.name}</b>{value.meaning ? <span className="block text-[13.5px] leading-5 text-slate-700">{value.meaning}</span> : null}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
