import type { AppLocale } from "@/i18n/config";

/**
 * Schrittwechsel im Fragebogen (Phase 1.1).
 *
 * ---------------------------------------------------------------------------
 * WARUM DER SPRUNG NACH OBEN NUR MANCHMAL KLAPPTE
 * ---------------------------------------------------------------------------
 *
 * Gemeldet: 1→2, 3→4, 4→5 und 6→7 blieben unten stehen, 2→3, 5→6 und 7→8
 * landeten oben. Zwei Dinge zusammen:
 *
 *   1. `globals.css` setzt `scroll-behavior: smooth` auf <html>, und
 *      `scrollTo({ behavior: "auto" })` heisst laut Spezifikation „nimm, was
 *      CSS sagt" - also eine Animation.
 *   2. Sie startete VOR dem Rendern des neuen Schritts, noch mit der Hoehe
 *      des alten. Der Inhaltstausch mitten in der Animation brach sie ab oder
 *      lenkte sie um; ob man oben ankam, hing davon ab, wie hoch der alte und
 *      der neue Schritt waren - daher das scheinbar zufaellige Muster.
 *
 * Jetzt: NACH dem Rendern (`useLayoutEffect`), ausdruecklich `instant`, und
 * der Zielwert wird zusaetzlich direkt gesetzt - der Router oder der Browser
 * muessen nichts dazutun.
 */
export function scrollViewportToTop(win: Pick<Window, "scrollTo" | "document"> = window): void {
  win.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  win.document.documentElement.scrollTop = 0;
  if (win.document.body) win.document.body.scrollTop = 0;
}

/** Eine Frage anspringen: sichtbar machen und ihr erstes Feld fokussieren, ohne zweiten Sprung. */
export function revealQuestion(
  itemId: string,
  doc: Pick<Document, "querySelector"> = document,
): boolean {
  // Item-IDs bestehen nur aus Buchstaben, Ziffern und `_` (Registratur) - alles
  // andere wird gar nicht erst gesucht.
  if (!/^[A-Za-z0-9_-]+$/.test(itemId)) return false;
  const card = doc.querySelector<HTMLElement>(`[data-item-id="${itemId}"]`);
  if (!card) return false;
  card.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
  const field = card.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])");
  (field ?? card).focus({ preventScroll: true });
  return true;
}

/** „Es fehlt noch 1 Antwort." / „Es fehlen noch 3 Antworten." */
export function missingAnswersText(count: number, locale: AppLocale): string {
  if (locale === "en") return count === 1 ? "1 answer is still missing." : `${count} answers are still missing.`;
  return count === 1 ? "Es fehlt noch 1 Antwort." : `Es fehlen noch ${count} Antworten.`;
}
