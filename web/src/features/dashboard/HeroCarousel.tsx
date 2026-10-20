"use client";

import Link from "next/link";
import { useState } from "react";
import { IconTile } from "@/features/ui/Icons";

export type HeroItem = {
  key: string;
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  action: string;
};

/**
 * Eine Sache auf einmal in der Marken-Fläche der Startseite: der nächste
 * Schritt, danach die Aufgaben, durch die man mit Pfeilen oder Punkten
 * weiterklicken kann. Ohne JavaScript steht der erste Eintrag da.
 *
 * Keine Zählung "x von y" und kein Fortschritt: Die Punkte sind nur
 * Navigation. Der Wechsel wird für Screenreader angesagt (aria-live).
 */
export function HeroCarousel({
  items,
  secondary,
  labels,
}: {
  items: HeroItem[];
  secondary: { href: string; label: string } | null;
  labels: { previous: string; next: string; goTo: string };
}) {
  const [index, setIndex] = useState(0);
  const count = items.length;
  const item = items[Math.min(index, count - 1)]!;
  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div className="relative flex flex-1 flex-col gap-3">
      <div aria-live="polite" className="flex flex-1 flex-col gap-3">
        <span className="flex items-center gap-3">
          <IconTile name="check" tone="white" />
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{item.eyebrow}</span>
        </span>
        <h2 className="text-2xl font-semibold leading-snug sm:text-[1.9rem]">{item.title}</h2>
        <p className="max-w-xl text-sm leading-6 text-white sm:text-base">{item.text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Link
            href={item.href}
            className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
          >
            {item.action}
          </Link>
          {secondary ? (
            <Link href={secondary.href} className="text-sm text-white underline underline-offset-4">
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
      {count > 1 ? (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label={labels.previous}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span aria-hidden="true">←</span>
          </button>
          <ul className="flex items-center gap-1">
            {items.map((entry, position) => (
              <li key={entry.key}>
                <button
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-label={`${labels.goTo} ${position + 1}`}
                  aria-current={position === index ? "true" : undefined}
                  className="inline-flex h-11 w-6 items-center justify-center focus-visible:outline-none"
                >
                  <span aria-hidden="true" className={`h-2 rounded-full transition-all ${position === index ? "w-5 bg-white" : "w-2 bg-white/50"}`} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label={labels.next}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
