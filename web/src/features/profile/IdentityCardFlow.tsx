"use client";

import { useRef, useState, type ReactNode } from "react";

export type IdentityCardId = "photo" | "who" | "where" | "what" | "links" | "roles" | "interests";

/** Karten, die zum Identitaetsformular gehoeren - nur dort gilt "Speichern". */
const FORM_CARDS: IdentityCardId[] = ["who", "where", "what", "links", "roles"];

type Copy = {
  back: string;
  next: string;
  /** Mit den Platzhaltern {current} und {total}. */
  stepOf: string;
  label: string;
  save: string;
  titles: Record<IdentityCardId, string>;
};

/**
 * "Ueber dich" als Karten: eine Frage pro Schritt, fuer Menschen, die schon ein
 * Profil haben und etwas aendern wollen.
 *
 * Dasselbe Prinzip wie `FindCardFlow` und `ConnectCardFlow`: Die Felder bleiben
 * im Dokument, nicht gezeigte Karten sind nur ausgeblendet; gespeichert wird mit
 * denselben Aktionen wie vorher.
 *
 * DER RAHMEN STEHT AUSSERHALB DER FORMULARE. Foto, Identitaet und Interessen
 * sind drei verschiedene Formulare mit drei Aktionen (Formulare lassen sich nicht
 * verschachteln). Der Rahmen umschliesst sie alle; jede Gruppe traegt
 * `data-card="..."`, und welche zu sehen ist, steuert `data-active` am Rahmen
 * zusammen mit einer Regel in globals.css (`.idcards`). So stimmt der
 * Server-Render von Anfang an.
 *
 * "SPEICHERN" GILT NUR FUER DAS IDENTITAETSFORMULAR und steht auf dessen Karten
 * (`form="identity-form"`). Foto und Interessen haben ihre eigenen Knoepfe in
 * ihrer Karte - ein gemeinsamer Knopf ueber drei Aktionen waere eine Falle.
 */
export function IdentityCardFlow({
  ids,
  initialStep,
  formId,
  copy,
  children,
}: {
  ids: IdentityCardId[];
  initialStep: number;
  formId: string;
  copy: Copy;
  children: ReactNode;
}) {
  const total = ids.length;
  const [index, setIndex] = useState(Math.min(Math.max(initialStep, 0), total - 1));
  const root = useRef<HTMLDivElement>(null);
  const active = ids[index];
  const savesForm = FORM_CARDS.includes(active);

  function go(to: number) {
    setIndex(Math.max(0, Math.min(total - 1, to)));
    root.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <div ref={root} data-active={active} className="idcards mt-8 grid gap-5 scroll-mt-24">
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5">
        <span className="text-[13px] font-bold text-slate-500">
          {copy.stepOf.replace("{current}", String(index + 1)).replace("{total}", String(total))}
        </span>
        {/* Eine Leiste statt Prozente: Sie zeigt nur, wo man in der Reihe steht. */}
        <div className="h-[5px] overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-sky-500 transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <nav aria-label={copy.label} className="flex flex-wrap gap-1.5">
          {ids.map((id, position) => (
            <button
              key={id}
              type="button"
              aria-current={position === index ? "step" : undefined}
              onClick={() => go(position)}
              className={`min-h-9 rounded-xl px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                position === index ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {copy.titles[id]}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[12rem]">{children}</div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:text-slate-950 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          {copy.back}
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {savesForm ? (
            <button type="submit" form={formId} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              {copy.save}
            </button>
          ) : null}
          {index < total - 1 ? (
            <button type="button" onClick={() => go(index + 1)} className="brand-cta inline-flex min-h-11 items-center rounded-2xl px-6 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
              {copy.next}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
