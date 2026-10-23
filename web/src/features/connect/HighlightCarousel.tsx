"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const AUTO_ADVANCE_MS = 6000;

/**
 * Auf dem Telefon laufen die Highlights nebeneinander durch: wischen oder
 * Punkt antippen, und alle paar Sekunden springt es von selbst weiter.
 * Am Bildschirm stehen die Karten wie bisher in drei Spalten.
 *
 * Das Weiterlaufen stoppt, sobald jemand das Feld beruehrt oder darin
 * fokussiert, und es laeuft gar nicht, wenn das System Bewegung reduziert.
 */
export function HighlightCarousel({ children, dotLabels }: { children: ReactNode; dotLabels: string[] }) {
  const items = Children.toArray(children);
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number) => {
    const el = scroller.current;
    const target = el?.children[index] as HTMLElement | undefined;
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.children.length) return;
    const step = (el.children[0] as HTMLElement).offsetWidth;
    setActive(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / Math.max(step, 1)))));
  };

  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const el = scroller.current;
      // Am Bildschirm liegt alles nebeneinander, dort gibt es nichts weiterzuschieben.
      if (paused.current || !el || el.scrollWidth <= el.clientWidth + 1) return;
      setActive((current) => {
        const next = (current + 1) % items.length;
        goTo(next);
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [items.length, goTo]);

  const pause = () => { paused.current = true; };

  return (
    <div className="mt-4">
      <div
        ref={scroller}
        onScroll={onScroll}
        onTouchStart={pause}
        onPointerEnter={pause}
        onFocusCapture={pause}
        className="connect-highlight-track -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0"
      >
        {items.map((item, index) => (
          <div key={index} className="w-[86%] shrink-0 snap-center md:w-auto md:shrink">{item}</div>
        ))}
      </div>
      {items.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1 md:hidden">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={dotLabels[index]}
              aria-current={index === active ? "true" : undefined}
              onClick={() => { pause(); goTo(index); }}
              className="flex h-8 w-8 items-center justify-center"
            >
              <span className={`block h-2 rounded-full transition-all ${index === active ? "w-5 bg-violet-600" : "w-2 bg-violet-200"}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
