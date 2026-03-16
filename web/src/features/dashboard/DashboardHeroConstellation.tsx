"use client";

import { useEffect, useRef } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DashboardHeroConstellation() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const heroSection = root.closest("[data-dashboard-hero]");

    let frameId = 0;

    const updateScrollState = () => {
      frameId = 0;
      const rect = heroSection instanceof HTMLElement ? heroSection.getBoundingClientRect() : null;
      const progress = rect
        ? clamp((window.innerHeight - rect.top) / Math.max(rect.height + window.innerHeight * 0.2, 1), 0, 1)
        : clamp(window.scrollY / 520, 0, 1);
      root.style.setProperty("--constellation-progress", progress.toFixed(3));
      root.style.setProperty("--constellation-shift", `${progress * -24}px`);
      root.style.setProperty("--constellation-glow", `${0.24 + progress * 0.28}`);
      root.style.setProperty("--constellation-link-boost", `${0.14 + progress * 0.34}`);
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
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

  return (
    <div className="dashboard-constellation-shell" aria-hidden="true">
      <div ref={rootRef} className="dashboard-constellation-anchor">
        <div className="dashboard-constellation">
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none">
          <defs>
            <radialGradient id="dashboard-constellation-glow-a" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dashboard-constellation-glow-b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
            <filter id="dashboard-constellation-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <g className="field">
            <path
              className="link"
              d="M118 118 L254 88 L396 120 L542 76"
              fill="none"
              stroke="#67e8f9"
              strokeOpacity="0.22"
              strokeWidth="1"
            />
            <path
              className="link link-delayed"
              d="M690 80 L842 112 L1004 84"
              fill="none"
              stroke="#7c3aed"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
            <path
              className="link link-soft"
              d="M542 76 L690 80"
              fill="none"
              stroke="#67e8f9"
              strokeOpacity="0.16"
              strokeWidth="0.9"
            />
            <path
              className="link link-highlight"
              d="M396 120 L542 76 L690 80"
              fill="none"
              stroke="#67e8f9"
              strokeOpacity="0.3"
              strokeWidth="1.15"
            />
            <path
              className="link link-progressive"
              d="M254 88 C318 52 422 54 542 76"
              fill="none"
              stroke="#7c3aed"
              strokeOpacity="0.26"
              strokeWidth="1.05"
            />
            <path
              className="link link-progressive link-progressive-delayed"
              d="M542 76 C652 52 778 52 904 96"
              fill="none"
              stroke="#67e8f9"
              strokeOpacity="0.26"
              strokeWidth="1.05"
            />

            <circle cx="118" cy="118" r="2.6" fill="rgba(103,232,249,0.62)" className="orb" />
            <circle cx="254" cy="88" r="2.3" fill="rgba(124,58,237,0.48)" className="orb orb-delayed" />
            <circle cx="396" cy="120" r="2.5" fill="rgba(103,232,249,0.54)" className="orb" />
            <circle cx="542" cy="76" r="2.3" fill="rgba(124,58,237,0.46)" className="orb orb-delayed" />
            <circle cx="690" cy="80" r="2.4" fill="rgba(103,232,249,0.52)" className="orb" />
            <circle cx="842" cy="112" r="2.5" fill="rgba(124,58,237,0.44)" className="orb orb-delayed" />
            <circle cx="1004" cy="84" r="2.7" fill="rgba(103,232,249,0.6)" className="orb" />
          </g>

          <g className="field field-delayed">
            <circle cx="256" cy="90" r="34" fill="url(#dashboard-constellation-glow-a)" filter="url(#dashboard-constellation-blur)" />
            <circle cx="690" cy="78" r="30" fill="url(#dashboard-constellation-glow-b)" filter="url(#dashboard-constellation-blur)" />
            <circle cx="1004" cy="82" r="28" fill="url(#dashboard-constellation-glow-a)" filter="url(#dashboard-constellation-blur)" />
          </g>

          <g className="orbit-layer">
            <path
              className="orbit-track"
              d="M365 152 C420 42 640 28 790 90 C880 128 934 144 1046 108"
              fill="none"
              stroke="#94a3b8"
              strokeOpacity="0.18"
              strokeWidth="0.9"
            />
            <path
              className="orbit-glow"
              d="M365 152 C420 42 640 28 790 90 C880 128 934 144 1046 108"
              fill="none"
              stroke="#67e8f9"
              strokeOpacity="0.3"
              strokeWidth="1.1"
            />
            <circle className="orbit-spark" cx="790" cy="90" r="2.4" fill="rgba(124,58,237,0.58)" />
          </g>

          <g className="spark-layer">
            <circle className="spark spark-a" cx="438" cy="54" r="1.8" fill="rgba(103,232,249,0.62)" />
            <circle className="spark spark-b" cx="772" cy="48" r="1.6" fill="rgba(124,58,237,0.58)" />
            <circle className="spark spark-c" cx="928" cy="126" r="1.7" fill="rgba(103,232,249,0.56)" />
          </g>
        </svg>
        </div>
      </div>
    </div>
  );
}
