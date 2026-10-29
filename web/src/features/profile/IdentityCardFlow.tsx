"use client";

import { useRef, useState, type ReactNode } from "react";

export type IdentityCardId = "who" | "where" | "what" | "links" | "roles";

type Copy = {
  back: string;
  next: string;
  /** Mit den Platzhaltern {current} und {total}. */
  stepOf: string;
  label: string;
  titles: Record<IdentityCardId, string>;
};

/**
 * "Ueber dich" als Karten: eine Frage pro Schritt, fuer Menschen, die schon ein
 * Profil haben und etwas aendern wollen.
 *
 * Dasselbe Prinzip wie `FindCardFlow` und `ConnectCardFlow`: DAS FORMULAR BLEIBT
 * EINS. Alle Felder stehen die ganze Zeit im Dokument, nicht gezeigte Karten
 * sind nur ausgeblendet und werden trotzdem mitgeschickt; gespeichert wird mit
 * derselben Aktion (`saveIdentityAction`) wie vorher.
 *
 * ANDERS ALS DORT kommen die Gruppen hier als `children`, jede in einem
 * `<div data-card="...">`; welche zu sehen ist, steuert `data-active` am
 * Rahmen und eine Regel in globals.css (`.idcards`). Das hat zwei Vorteile: Der
 * Server-Render stimmt von Anfang an (kein Aufblitzen des ganzen Formulars),
 * und die Gruppen muessen nicht aus dem Formular herausgeloest werden.
 *
 * SPEICHERN STEHT AUF JEDER KARTE. Wer nur die Headline aendern will, soll nicht
 * bis zur letzten Karte klicken muessen - es gibt hier keinen Veroeffentlichen-
 * Schritt, an dem etwas fehlen koennte.
 */
export function IdentityCardFlow({
  ids,
  initialStep,
  saveNode,
  copy,
  children,
}: {
  ids: IdentityCardId[];
  initialStep: number;
  saveNode: ReactNode;
  copy: Copy;
  children: ReactNode;
}) {
  const total = ids.length;
  const [index, setIndex] = useState(Math.min(Math.max(initialStep, 0), total - 1));
  const root = useRef<HTMLDivElement>(null);

  function go(to: number) {
    setIndex(Math.max(0, Math.min(total - 1, to)));
    root.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <div ref={root} data-active={ids[index]} className="idcards grid gap-5 scroll-mt-24">
      <div className="grid gap-3">
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
          {/* Speichern zuerst im Dokument - die Eingabetaste loest den ersten Knopf des Formulars aus. */}
          {saveNode}
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
