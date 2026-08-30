"use client";

import Link from "next/link";
import { useState } from "react";

export type DashboardSpotlightItem = {
  id: string;
  title: string;
  text: string;
  action: string;
  href: string;
};

type Props = {
  items: readonly DashboardSpotlightItem[];
  previousLabel: string;
  nextLabel: string;
  indicatorsLabel: string;
  positionLabel: string;
};

const CONTROL_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 motion-reduce:transition-none";

export function DashboardSpotlight({ items, previousLabel, nextLabel, indicatorsLabel, positionLabel }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex];
  if (!activeItem) return null;

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + items.length) % items.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % items.length);
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5 sm:p-6">
      <article key={activeItem.id} className="min-h-40">
        <h3 className="text-xl font-semibold text-slate-950">{activeItem.title}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{activeItem.text}</p>
        <Link
          href={activeItem.href}
          className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {activeItem.action}
        </Link>
      </article>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div className="flex items-center gap-2" role="group" aria-label={indicatorsLabel}>
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={positionLabel.replace("{position}", String(index + 1)).replace("{total}", String(items.length))}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={`min-h-8 min-w-8 rounded-full border text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 ${index === activeIndex ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={previousLabel} onClick={showPrevious} className={CONTROL_CLASS}>←</button>
          <button type="button" aria-label={nextLabel} onClick={showNext} className={CONTROL_CLASS}>→</button>
        </div>
      </div>
    </div>
  );
}
