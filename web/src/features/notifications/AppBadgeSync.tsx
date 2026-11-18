"use client";

import { useEffect } from "react";

/**
 * Haelt die Zahl am App-Symbol auf dem Stand der Hinweise (18.11.2026).
 *
 * Der Service Worker setzt sie, wenn eine Mitteilung ankommt; hier wird sie
 * beim Oeffnen und beim Zurueckkehren in die App nachgezogen und geloescht,
 * wenn nichts mehr wartet oder die Person sie abgeschaltet hat. Ohne
 * Unterstuetzung des Browsers (kein `setAppBadge`) passiert gar nichts - das
 * ist kein Fehler, nur ein Geraet ohne Symbol-Zahl.
 */
export function AppBadgeSync({ count, enabled }: { count: number; enabled: boolean }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (value?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (typeof nav.setAppBadge !== "function") return;
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      const run = enabled && count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
      void run?.catch(() => {});
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [count, enabled]);
  return null;
}
