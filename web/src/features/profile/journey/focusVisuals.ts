/**
 * Symbole und Farbtoene der Schwerpunkte - eine Quelle fuer die Einstiegsreise
 * und das Find-Profil, damit "Produkt" an beiden Orten gleich aussieht.
 * Die Schluessel sind die Find-Rollen (`tech`, `product`, ...).
 */
export const FOCUS_ICONS: Record<string, string> = {
  product: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5",
  tech: "M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 6l-3 12",
  design: "M4 20l4-1 11-11-3-3L5 16z M14 6l3 3",
  sales: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  marketing: "M4 10v4h3l8 4V6L7 10z M18 9a4 4 0 010 6",
  finance: "M5 20V10 M12 20V4 M19 20v-7",
  operations: "M3 19c0-3 3-5 6-5s6 2 6 5 M16 14c3 0 5 1.5 5 4 M9 5a3 3 0 100 6 3 3 0 000-6z M17 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
  strategy: "M5 21V4 M5 4h11l-2 4 2 4H5",
  research: "M11 5a6 6 0 100 12 6 6 0 000-12z M20 20l-4.5-4.5",
  other: "M12 5v14 M5 12h14",
};

export const FOCUS_HUES: Record<string, string> = {
  product: "#5b3df5", tech: "#0a88c2", design: "#d4531a", sales: "#0a8a68", marketing: "#c4287c",
  finance: "#a8620a", operations: "#3f61e0", strategy: "#8a3ff0", research: "#0f8296", other: "#5b6477",
};
