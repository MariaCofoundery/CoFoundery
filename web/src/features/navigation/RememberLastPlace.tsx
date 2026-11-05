"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LAST_PLACE_COOKIE, LAST_PLACE_MAX_AGE, resumablePath } from "@/features/navigation/lastPlace";

/**
 * Merkt sich in der installierten App die zuletzt offene Seite, damit `/start` beim naechsten
 * Oeffnen dorthin fuehrt (lastPlace.ts). Im Browser tut es nichts.
 *
 * Gemerkt wird bei jedem Seitenwechsel UND wenn die App in den Hintergrund geht: Ein Wechsel nur
 * hinter dem "?" (anderer Reiter) aendert den Pfad nicht, ist aber genau der Ort, an dem man war.
 */
export function RememberLastPlace() {
  const pathname = usePathname();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;
    const remember = () => {
      const place = resumablePath(`${window.location.pathname}${window.location.search}`);
      if (!place) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${LAST_PLACE_COOKIE}=${encodeURIComponent(place)}; Path=/; Max-Age=${LAST_PLACE_MAX_AGE}; SameSite=Lax${secure}`;
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") remember();
    };
    remember();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", remember);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", remember);
    };
  }, [pathname]);

  return null;
}
