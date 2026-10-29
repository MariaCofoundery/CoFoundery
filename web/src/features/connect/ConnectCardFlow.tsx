"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CardId = "role" | "reach" | "open";
type IdentityGap = "displayName" | "headline" | "bio";

type Copy = {
  back: string;
  next: string;
  /** Mit den Platzhaltern {current} und {total}. */
  stepOf: string;
  cardTitles: Record<CardId | "show", string>;
  showTitle: string;
  missingTitle: string;
  missingNote: string;
  allSet: string;
  fix: string;
  identityFix: string;
  roleMissing: string;
  identityLabels: Record<IdentityGap, string>;
};

/**
 * Das Connect-Profil als Karten: eine Frage pro Schritt.
 *
 * Dasselbe Prinzip wie `FindCardFlow`: DAS FORMULAR BLEIBT EINS. Alle Felder
 * stehen die ganze Zeit im Dokument, nicht gezeigte Karten sind nur versteckt
 * (`hidden`) und werden trotzdem mitgeschickt; das Formular traegt `noValidate`.
 * Speichern und Veroeffentlichen laufen ueber `saveConnectProfileAction`, die
 * Pruefungen (`profilePublishable`) sind die des Servers.
 *
 * DIE PFLICHT-BOX (letzte Karte) liest die Rolle live aus dem Formular und
 * nennt dazu die Luecken im Kernprofil (Name, Headline, Text ueber dich - die
 * kommen vom Server, weil sie ausserhalb dieses Formulars gepflegt werden).
 * Solange etwas fehlt, ist der Knopf gesperrt, der das Profil sichtbar macht;
 * Entwurf speichern geht immer. Die drei Zustimmungen (sichtbar fuer
 * Mitglieder, vorgeschlagen werden, Highlight) bleiben getrennt und
 * unveraendert: Dieses Modul verknuepft keine mit einer anderen.
 */
export function ConnectCardFlow({
  cards,
  initialStep,
  identityGaps,
  showNode,
  draftNode,
  publishNode,
  copy,
}: {
  cards: { id: CardId; node: ReactNode }[];
  initialStep: number;
  identityGaps: IdentityGap[];
  showNode: ReactNode;
  draftNode: ReactNode;
  publishNode: ReactNode;
  copy: Copy;
}) {
  const total = cards.length + 1;
  const [index, setIndex] = useState(Math.min(Math.max(initialStep, 0), total - 1));
  const root = useRef<HTMLDivElement>(null);
  const [roleMissing, setRoleMissing] = useState(false);
  const isShow = index === cards.length;

  useEffect(() => {
    if (!isShow) return;
    const form = root.current?.closest("form");
    if (!form) return;
    const read = () => setRoleMissing(new FormData(form).getAll("network_roles").length === 0);
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("change", read);
    };
  }, [isShow]);

  const missingCount = identityGaps.length + (roleMissing ? 1 : 0);

  function go(to: number) {
    setIndex(Math.max(0, Math.min(total - 1, to)));
    root.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <div ref={root} className="grid gap-5 scroll-mt-24">
      <div className="grid gap-3">
        <span className="text-[13px] font-bold text-slate-500">
          {copy.stepOf.replace("{current}", String(index + 1)).replace("{total}", String(total))}
        </span>
        {/* Eine Leiste statt Prozente: Sie zeigt nur, wo man in der Reihe steht. */}
        <div className="h-[5px] overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-sky-500 transition-[width] duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <nav aria-label={copy.showTitle} className="flex flex-wrap gap-1.5">
          {[...cards.map((card) => card.id), "show" as const].map((id, position) => (
            <button
              key={id}
              type="button"
              aria-current={position === index ? "step" : undefined}
              onClick={() => go(position)}
              className={`min-h-9 rounded-xl px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                position === index ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {copy.cardTitles[id]}
            </button>
          ))}
        </nav>
      </div>

      {cards.map((card, position) => (
        <div key={card.id} hidden={position !== index} className="min-h-[14rem]">
          {card.node}
        </div>
      ))}

      <div hidden={!isShow} className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-950">{copy.showTitle}</h2>
        {missingCount > 0 ? (
          <div className="grid gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-amber-900">{copy.missingTitle}</p>
            <ul className="grid gap-1.5 text-sm text-amber-950">
              {identityGaps.map((gap) => (
                <li key={gap} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>{copy.identityLabels[gap]}</span>
                  <a href="#identity" className="font-bold text-violet-800 underline underline-offset-2">{copy.identityFix}</a>
                </li>
              ))}
              {roleMissing ? (
                <li className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>{copy.roleMissing}</span>
                  <button type="button" onClick={() => go(0)} className="font-bold text-violet-800 underline underline-offset-2">{copy.fix}</button>
                </li>
              ) : null}
            </ul>
            <p className="text-xs leading-5 text-amber-900">{copy.missingNote}</p>
          </div>
        ) : (
          <p role="status" className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{copy.allSet}</p>
        )}
        {showNode}
        <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
          {/* Entwurf speichern steht zuerst und ist nie gesperrt - die Eingabetaste loest den ersten Knopf aus. */}
          {draftNode}
          <fieldset disabled={missingCount > 0} className="contents">
            {publishNode}
          </fieldset>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:text-slate-950 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
          {copy.back}
        </button>
        {!isShow ? (
          <button type="button" onClick={() => go(index + 1)} className="brand-cta inline-flex min-h-11 items-center rounded-2xl px-6 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
            {copy.next}
          </button>
        ) : null}
      </div>
    </div>
  );
}
