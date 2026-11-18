"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Esc schliesst das offene Blatt "Neue Aufgabe" / "Diktieren" (18.11.2026).
 * Es geht dorthin, wohin auch "Abbrechen" fuehrt - nichts wird gespeichert, nichts geraten.
 * Aus einem Eingabefeld heraus zaehlt Esc nur, wenn dort noch nichts getippt wurde, damit ein Entwurf nicht
 * durch einen versehentlichen Tastendruck verschwindet.
 */
export function EscapeToClose({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
        if (target.value.trim() !== "") return;
      }
      router.push(href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, router]);
  return null;
}
