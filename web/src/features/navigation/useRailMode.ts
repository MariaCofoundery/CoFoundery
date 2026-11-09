"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "m2f_nav_rail_expanded";
const WIDE = "(min-width: 1100px)";

/**
 * Die Seitenleiste in drei Stufen (Entwurf 09.11.2026): bis 699 Pixel die Leiste unten (Handy), von 700 bis 1099 Pixel
 * eine schmale Leiste mit Symbolen, ab 1100 Pixel die volle. `compact` heisst: schmal und nicht ausgeklappt. Die Breite der
 * Leiste setzt CSS (kein Flackern); dieser Haken entscheidet nur, ob Beschriftungen im Dokument stehen. Die Wahl
 * "ausgeklappt" merkt sich der Browser - ein Komfort, nichts Wichtiges, darum jeder Zugriff abgesichert.
 */
export function useRailMode() {
  const [wide, setWide] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const read = () => setWide(query.matches);
    read();
    query.addEventListener("change", read);
    try {
      setExpanded(window.localStorage.getItem(KEY) === "1");
    } catch {
      // Ohne Speicher bleibt es beim Standard.
    }
    return () => query.removeEventListener("change", read);
  }, []);

  const toggle = useCallback(() => {
    setExpanded((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        // egal
      }
      return next;
    });
  }, []);

  return { compact: !wide && !expanded, expanded, toggle };
}

/**
 * Breite der Leiste ab 700 Pixel: schmal, bis die Breite reicht - oder bis jemand sie ausklappt. Die Klassen stehen als
 * ganze Woerter da, weil Tailwind nur findet, was im Quelltext ausgeschrieben ist (ein zusammengesetzter Name wird nie erzeugt).
 */
const RAIL_WIDTHS = {
  "w-[248px]": { expanded: "min-[700px]:w-[248px]", auto: "min-[700px]:w-[72px] min-[1100px]:w-[248px]" },
  "w-[260px]": { expanded: "min-[700px]:w-[260px]", auto: "min-[700px]:w-[72px] min-[1100px]:w-[260px]" },
} as const;

export const railWidthClass = (expanded: boolean, fullWidth: keyof typeof RAIL_WIDTHS) => (expanded ? RAIL_WIDTHS[fullWidth].expanded : RAIL_WIDTHS[fullWidth].auto);
