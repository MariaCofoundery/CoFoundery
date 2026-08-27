"use client";

import { useEffect, useState } from "react";

type DashboardJourneySection = {
  id: string;
  label: string;
};

export function DashboardJourneyLine({
  label,
  sections,
}: {
  label: string;
  sections: DashboardJourneySection[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId = 0;

    const updateActiveIndex = () => {
      frameId = 0;
      const targetLine = window.innerHeight * 0.34;
      const nextIndex = sections.reduce((closestIndex, section, index) => {
        const element = document.getElementById(section.id);
        const closestElement = document.getElementById(sections[closestIndex]?.id ?? "");
        if (!element) return closestIndex;
        if (!closestElement) return index;
        return Math.abs(element.getBoundingClientRect().top - targetLine) <
          Math.abs(closestElement.getBoundingClientRect().top - targetLine)
          ? index
          : closestIndex;
      }, 0);
      setActiveIndex(nextIndex);
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateActiveIndex);
    };

    updateActiveIndex();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [sections]);

  return (
    <nav
      aria-label={label}
      className="dashboard-journey fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 xl:block"
    >
      <div className="relative flex min-h-[220px] w-[52px] items-center justify-center rounded-full border border-slate-200/70 bg-white/58 shadow-[0_14px_34px_rgba(15,23,42,0.07)] backdrop-blur-sm">
        <div className="absolute inset-y-7 left-1/2 w-px -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(148,163,184,0.14),rgba(124,58,237,0.16),rgba(103,232,249,0.16))]" />
        <ol className="relative flex min-h-[220px] w-full flex-col items-center justify-between py-7">
          {sections.map((section, index) => (
            <li key={section.id} className="flex h-8 w-8 items-center justify-center">
              <a
                href={`#${section.id}`}
                aria-current={index === activeIndex ? "location" : undefined}
                aria-label={section.label}
                title={section.label}
                className={`block rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 ${
                  index === activeIndex
                    ? "dashboard-journey-node-active h-3.5 w-3.5 border-[color:var(--brand-primary)] bg-[linear-gradient(180deg,rgba(103,232,249,0.92),rgba(124,58,237,0.65))] shadow-[0_0_14px_rgba(34,211,238,0.18)]"
                    : "h-2.5 w-2.5 border-slate-300/90 bg-white/92 hover:h-3 hover:w-3"
                }`}
              />
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
