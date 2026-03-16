"use client";

import { useEffect, useMemo, useState } from "react";

type DashboardJourneyItem = {
  id: string;
  label: string;
  completed: boolean;
};

type Props = {
  items: DashboardJourneyItem[];
};

const NODE_SPACING = 56;

export function DashboardJourneyLine({ items }: Props) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) {
      return;
    }

    const sections = items
      .map((item) => ({
        id: item.id,
        element: document.getElementById(item.id),
      }))
      .filter((entry): entry is { id: string; element: HTMLElement } => Boolean(entry.element));

    if (sections.length === 0) {
      return;
    }

    const resolveActiveSection = () => {
      const anchor = window.innerHeight * 0.32;
      let nextActiveId = sections[0]?.id ?? "";
      let closestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section) => {
        const rect = section.element.getBoundingClientRect();
        const distance = Math.abs(rect.top - anchor);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextActiveId = section.id;
        }
      });

      setActiveId(nextActiveId);
    };

    const observer = new IntersectionObserver(resolveActiveSection, {
      root: null,
      rootMargin: "-18% 0px -55% 0px",
      threshold: [0, 0.15, 0.35, 0.6, 0.9],
    });

    sections.forEach((section) => observer.observe(section.element));
    resolveActiveSection();

    window.addEventListener("scroll", resolveActiveSection, { passive: true });
    window.addEventListener("resize", resolveActiveSection);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", resolveActiveSection);
      window.removeEventListener("resize", resolveActiveSection);
    };
  }, [items]);

  const activeIndex = useMemo(() => {
    const resolvedIndex = items.findIndex((item) => item.id === activeId);
    return resolvedIndex >= 0 ? resolvedIndex : 0;
  }, [activeId, items]);

  const trackHeight = Math.max(0, (items.length - 1) * NODE_SPACING);

  return (
    <aside
      aria-label="Founder Journey"
      className="dashboard-journey fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 xl:block"
    >
      <div className="relative w-[172px] rounded-[24px] border border-slate-200/70 bg-white/78 px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div
          className="absolute right-[28px] top-8 w-px rounded-full bg-[linear-gradient(180deg,rgba(103,232,249,0.2),rgba(124,58,237,0.18))]"
          style={{ height: `${trackHeight}px` }}
        />
        <div
          className="dashboard-journey-glow absolute right-[22px] top-[26px] h-3.5 w-3.5 rounded-full border border-white/70 bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.95),rgba(124,58,237,0.5))] shadow-[0_0_18px_rgba(34,211,238,0.22)] transition-transform duration-500 ease-out"
          style={{ transform: `translateY(${activeIndex * NODE_SPACING}px)` }}
        />

        <ol className="relative grid gap-4">
          {items.map((item, index) => {
            const isActive = item.id === activeId;
            const stateClass = isActive
              ? "dashboard-journey-node-active border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/22"
              : item.completed
                ? "border-[color:var(--brand-accent)]/28 bg-[color:var(--brand-accent)]/14"
                : "border-slate-300 bg-white";

            return (
              <li
                key={item.id}
                className="grid min-h-[40px] grid-cols-[1fr_auto] items-center gap-4"
              >
                <span
                  className={`text-sm leading-6 transition-colors ${
                    isActive
                      ? "text-slate-950"
                      : item.completed
                        ? "text-slate-700"
                        : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`relative z-10 h-4 w-4 rounded-full border transition-all ${stateClass}`}
                  style={{ marginTop: index === items.length - 1 ? 0 : 0 }}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
