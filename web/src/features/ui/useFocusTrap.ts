"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Die Elemente in `container`, die man mit Tab erreicht (sichtbar, nicht gesperrt). */
export function focusableIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => !element.hasAttribute("hidden") && element.getClientRects().length > 0);
}

/**
 * Tastatur in einem Dialog: Beim Oeffnen landet der Fokus darin (nicht auf der Seite dahinter), Tab und Umschalt+Tab
 * kreisen im Dialog, und beim Schliessen kehrt der Fokus dorthin zurueck, wo er war. Ohne das bleibt die Seite hinter
 * einem Dialog per Tab erreichbar und ein Screenreader liest sie weiter vor.
 *
 * `trap` false: nur hineinspringen und zurueckkehren (ein Panel neben dem Inhalt, kein Modal).
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>, trap = true) {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!container.contains(document.activeElement)) (focusableIn(container)[0] ?? container).focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (!trap || event.key !== "Tab") return;
      const items = focusableIn(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    container.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [active, containerRef, trap]);
}
