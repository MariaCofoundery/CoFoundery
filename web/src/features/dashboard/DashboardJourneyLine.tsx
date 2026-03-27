"use client";

import { useEffect, useMemo, useState } from "react";

const TENSION_POINT_COUNT = 7;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DashboardJourneyLine() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let frameId = 0;

    const updateActiveIndex = () => {
      frameId = 0;
      const scrollableHeight = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const progress = clamp(window.scrollY / scrollableHeight, 0, 1);
      const nextIndex = Math.round(progress * (TENSION_POINT_COUNT - 1));
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
  }, []);

  const points = useMemo(
    () =>
      Array.from({ length: TENSION_POINT_COUNT }, (_, index) => ({
        id: `tension-point-${index}`,
        active: index === activeIndex,
      })),
    [activeIndex]
  );

  return (
    <aside
      aria-hidden="true"
      className="dashboard-journey fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 xl:block"
    >
      <div className="relative flex h-[332px] w-[52px] items-center justify-center rounded-full border border-slate-200/70 bg-white/58 shadow-[0_14px_34px_rgba(15,23,42,0.07)] backdrop-blur-sm">
        <div className="absolute inset-y-7 left-1/2 w-px -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(148,163,184,0.14),rgba(124,58,237,0.16),rgba(103,232,249,0.16))]" />

        <div
          className="dashboard-journey-glow absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-white/75 bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.95),rgba(124,58,237,0.5))] shadow-[0_0_14px_rgba(34,211,238,0.18)] transition-transform duration-500 ease-out"
          style={{
            top: `calc(28px + ${activeIndex} * ((100% - 56px) / ${TENSION_POINT_COUNT - 1}))`,
            transform: "translate(-50%, -50%)",
          }}
        />

        <ol className="relative flex h-[calc(100%-56px)] w-full flex-col items-center justify-between py-7">
          {points.map((point) => (
            <li key={point.id} className="flex h-4 w-4 items-center justify-center">
              <span
                className={`block rounded-full border transition-all duration-500 ${
                  point.active
                    ? "dashboard-journey-node-active h-3.5 w-3.5 border-[color:var(--brand-primary)] bg-[linear-gradient(180deg,rgba(103,232,249,0.92),rgba(124,58,237,0.65))]"
                    : "h-2 w-2 border-slate-300/90 bg-white/92"
                }`}
              />
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
