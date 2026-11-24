"use client";

import { useEffect } from "react";
import styles from "./landing.module.css";

/**
 * Leichte Scroll-Effekte fuer die Seite unter der Scrollreise.
 *
 * - `data-rv`: das Element steigt beim Erscheinen sanft auf und blendet ein (`data-rv="scale"` waechst
 *   dabei leicht). Nur Elemente, die beim Laden noch unter dem sichtbaren Bereich liegen, werden
 *   ueberhaupt versteckt; was beim Laden zu sehen ist, bleibt sichtbar. Ohne JS ist alles sichtbar.
 * - `data-par`: das Element (ein App-Fenster) bewegt sich beim Scrollen minimal langsamer als die
 *   Seite und wirkt dadurch vor der Flaeche.
 *
 * Elemente mit `data-rv` duerfen keine Client-Komponenten mit wechselndem `className` sein: React
 * wuerde die hier gesetzten Klassen beim naechsten Rendern ueberschreiben.
 * Bei "weniger Bewegung" im Geraet passiert nichts.
 */
export function LandingEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const vh = window.innerHeight;
    const hidden = Array.from(document.querySelectorAll<HTMLElement>("[data-rv]")).filter((el) => el.getBoundingClientRect().top >= vh * 0.9);
    for (const el of hidden) {
      el.classList.add(styles.rv);
      if (el.dataset.rv === "scale") el.classList.add(styles.rs);
      const index = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
      el.style.setProperty("--d", `${Math.min(index, 6) * 90}ms`);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add(styles.isIn);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    hidden.forEach((el) => io.observe(el));

    const parallax = Array.from(document.querySelectorAll<HTMLElement>("[data-par]"));
    let ticking = false;
    function update() {
      ticking = false;
      const h = window.innerHeight;
      for (const el of parallax) {
        const box = (el.parentElement ?? el).getBoundingClientRect();
        if (box.bottom < -100 || box.top > h + 100) continue;
        const offset = box.top + box.height / 2 - h / 2;
        el.style.transform = `translateY(${Math.max(-20, Math.min(20, offset * -0.04)).toFixed(1)}px)`;
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      for (const el of parallax) el.style.transform = "";
    };
  }, []);

  return null;
}
