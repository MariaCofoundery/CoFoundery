"use client";

import { useEffect } from "react";

/**
 * Beim Drucken ist alles aufgeklappt.
 *
 * DER GRUND, WARUM ES DIESES BAUTEIL GIBT: Das Gesamtbild ist die Fassung, die
 * weitergegeben wird - ein Accelerator hat danach gefragt. Seit Teile davon
 * eingeklappt sind, wuerde ein Ausdruck genau die Teile verlieren, die man
 * weitergeben wollte. Ein zugeklapptes `details` im PDF waere kein
 * Schoenheitsfehler, sondern ein leeres Profil.
 *
 * WARUM NICHT IN CSS: Ein zugeklapptes `details` verbirgt seinen Inhalt ueber
 * den Browser selbst, nicht ueber eine Regel, die eine Druckregel ueberschreiben
 * koennte. Die Browser sind sich darin bis heute nicht einig. Das Attribut zu
 * setzen ist der Weg, der ueberall funktioniert.
 *
 * UND ES WIRD ZURUECKGENOMMEN. Nach dem Drucken steht die Seite wieder so da,
 * wie sie vorher stand - wer nur die Zusammenfassung sehen wollte, hat sonst
 * nach einem Ausdruck plotzlich alles offen und weiss nicht, warum.
 *
 * `beforeprint` faengt beide Wege: den Knopf (er ruft `window.print()`) und
 * Strg+P. Ohne JavaScript bleibt die Seite benutzbar - nur der Ausdruck
 * enthaelt dann die Zusammenfassungen statt der ganzen Tiefe, und gedruckt
 * wird ohnehin nur mit JavaScript.
 */
export function OpenDetailsForPrint() {
  useEffect(() => {
    // Nur die, die WIR zugeklappt haben - fremde `details` auf der Seite
    // gehen uns nichts an.
    const selector = "details[data-profile-details]:not([open])";
    let openedForPrint: HTMLDetailsElement[] = [];

    const openAll = () => {
      openedForPrint = Array.from(document.querySelectorAll<HTMLDetailsElement>(selector));
      for (const element of openedForPrint) element.open = true;
    };

    const closeAgain = () => {
      for (const element of openedForPrint) element.open = false;
      openedForPrint = [];
    };

    window.addEventListener("beforeprint", openAll);
    window.addEventListener("afterprint", closeAgain);
    return () => {
      window.removeEventListener("beforeprint", openAll);
      window.removeEventListener("afterprint", closeAgain);
    };
  }, []);

  return null;
}
