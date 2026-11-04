"use client";

import Link from "next/link";
import { useRef } from "react";

export type WaitingCard = {
  id: string;
  label: string;
  title: string;
  href: string;
  action: string;
};

export type RunningEntry = { id: string; title: string; href: string };

/**
 * "Wartet auf dich": kleine Karten nebeneinander, durch die man wischt (am
 * Rechner mit Pfeilen). Nichts ist versteckt - die Zahl steht neben der
 * Ueberschrift, und die naechste Karte schaut am Rand hervor.
 *
 * Bewusst ruhig: ein Hinweis, ein Satz, ein Textlink. Keine Knoepfe in Reihe,
 * keine Farben je Dringlichkeit, keine Rangfolge ausser "zuerst, was andere
 * aufhaelt". Darunter, nur wenn es etwas gibt, eine leise Zeile mit dem, was
 * gerade laeuft.
 */
export function DashboardWaiting({
  cards,
  running,
  labels,
}: {
  cards: WaitingCard[];
  running: RunningEntry[];
  labels: { title: string; count: string; previous: string; next: string; running: string };
}) {
  const list = useRef<HTMLUListElement>(null);
  if (cards.length === 0 && running.length === 0) return null;
  const scroll = (direction: 1 | -1) => list.current?.scrollBy({ left: direction * 264, behavior: "smooth" });

  return (
    <section
      id="dashboard-block-tasks"
      aria-labelledby={cards.length > 0 ? "dashboard-waiting-title" : undefined}
      aria-label={cards.length > 0 ? undefined : labels.running}
      className="scroll-mt-28 rounded-[24px] border border-[#e4e2f0] bg-white py-5 sm:py-6"
    >
      {cards.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3 px-5 sm:px-7">
            <h2 id="dashboard-waiting-title" className="text-lg font-semibold text-[#0b1f3a]">
              {labels.title}{" "}
              <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-100 px-2 align-[2px] text-sm font-semibold text-violet-800">
                <span aria-hidden="true">{cards.length}</span>
                <span className="sr-only">{labels.count}</span>
              </span>
            </h2>
            {cards.length > 2 ? (
              <div className="hidden gap-2 sm:flex">
                <button type="button" onClick={() => scroll(-1)} aria-label={labels.previous} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e2f0] bg-white text-[#0b1f3a] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                  <span aria-hidden="true">←</span>
                </button>
                <button type="button" onClick={() => scroll(1)} aria-label={labels.next} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e4e2f0] bg-white text-[#0b1f3a] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600">
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : null}
          </div>
          <ul
            ref={list}
            className="mt-4 flex snap-x snap-mandatory scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-1.5 [scrollbar-width:thin] sm:scroll-px-7 sm:px-7"
          >
            {cards.map((card) => (
              <li
                key={card.id}
                className="flex w-[260px] flex-none snap-start flex-col gap-1.5 rounded-[18px] border border-[#e4e2f0] bg-[#f8f9fc] px-4 py-3.5"
              >
                <span className="text-[13px] text-[#5f5e7a]">{card.label}</span>
                <span className="flex-1 text-base leading-snug text-[#0b1f3a]">{card.title}</span>
                <Link href={card.href} className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-violet-800 hover:underline">
                  {card.action} <span aria-hidden="true">&nbsp;→</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {running.length > 0 ? (
        <p className={`px-5 text-[15px] leading-6 text-[#5f5e7a] sm:px-7 ${cards.length > 0 ? "mx-5 mt-3.5 border-t border-[#ecebf5] px-0 pt-3.5 sm:mx-7 sm:px-0" : ""}`}>
          <span className="font-semibold">{labels.running}</span>{" "}
          {running.map((entry, index) => (
            <span key={entry.id}>
              {index > 0 ? " · " : null}
              <Link href={entry.href} className="text-violet-800 underline underline-offset-4">
                {entry.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
