"use client";

import { useEffect, useRef } from "react";
import { focusableIn } from "@/features/ui/useFocusTrap";

/**
 * Fokus fuer ein Seitenpanel (SidePanel, ein serverseitig gebautes Dialog-Element): Beim Oeffnen springt der Fokus hinein,
 * als Modal kreist Tab darin, beim Schliessen kehrt er zurueck. Steht im Panel und findet es ueber `titleId`.
 */
export function FocusPanel({ titleId, trap }: { titleId: string; trap: boolean }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const dialog = document.getElementById(titleId)?.closest<HTMLElement>('[role="dialog"]') ?? marker.current?.closest<HTMLElement>('[role="dialog"]') ?? null;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.tabIndex = -1;
    // Erst das Feld/der Knopf im Inhalt, nicht das Schliessen-Kreuz oben.
    const items = focusableIn(dialog);
    (items.find((item) => item.matches("input, textarea, select")) ?? items.find((item) => item.matches("button, a[href]") && !item.getAttribute("aria-label")) ?? items[0] ?? dialog).focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (!trap || event.key !== "Tab") return;
      const list = focusableIn(dialog);
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKey);
    return () => {
      dialog.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [titleId, trap]);
  return <span ref={marker} hidden />;
}
