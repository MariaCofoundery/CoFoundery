import { getItemsV22, type RegistryItemV22 } from "@/features/instruments/align/registries";

/**
 * Was sich mit der Zeit ändert - und deshalb zuerst gezeigt wird.
 *
 * ---------------------------------------------------------------------------
 * WOZU
 * ---------------------------------------------------------------------------
 *
 * Wenn jemand allein angefangen hat und später eine Verbindung entsteht, soll
 * er sehen, was er damals gesagt hat, bevor es in einen Vergleich geht. Maria
 * am 29.09.2026: „Gerade zum Beispiel mit den Stunden oder sowas, kann sich ja
 * vielleicht verändern.“
 *
 * Alle 36 Fragen noch einmal vorzulegen wäre eine zweite Runde Fragebogen.
 * Deshalb zuerst das, was wirklich altert - und ein Knopf daneben für alles.
 *
 * ---------------------------------------------------------------------------
 * ABGELEITET, NICHT AUFGEZÄHLT
 * ---------------------------------------------------------------------------
 *
 * Eine feste Liste wäre nach der ersten Umformulierung falsch. Die Regel
 * stattdessen: Wer eine ZAHL, einen BETRAG, ein DATUM oder ein ZEITFENSTER
 * angibt, hat etwas gesagt, das in drei Monaten anders sein kann. Eine
 * Handlungspräferenz („wie sprichst du Einwände an“) ändert sich nicht, weil
 * ein Quartal vergeht.
 *
 * Dazu eine kleine ausdrückliche Liste für das, was altert, ohne eine Zahl zu
 * sein: Ziele, der Zeitpunkt für die nächste Überprüfung, und ab wann jemand
 * Geld braucht. Sie steht hier mit Begründung und nicht verstreut.
 */

/** Formate, deren Antwort eine Menge, ein Betrag, ein Datum oder eine Zeit ist. */
const FORMATE_DIE_ALTERN = new Set([
  "number_range",
  "money_range",
  "person_number_range",
  "time_windows",
]);

/**
 * Was altert, ohne eine Zahl zu sein.
 *
 * `S01` Ziele fuer die naechsten drei Jahre - die verschieben sich.
 * `S04` das konkrete Ergebnis fuer zwoelf Monate - es wird erreicht oder nicht.
 * `R04` ab wann Auszahlungen gebraucht werden - haengt am Leben, nicht am Vorhaben.
 * `R12` wann das alles ueberprueft werden soll - altert per Definition.
 */
const ALTERT_AUCH = new Set(["S01", "S04", "R04", "R12"]);

export function agesWithTime(item: RegistryItemV22): boolean {
  return FORMATE_DIE_ALTERN.has(item.answerFormat) || ALTERT_AUCH.has(item.itemId);
}

/**
 * Die Fragen, die beim Bestätigen zuerst kommen - in der Reihenfolge des
 * Bogens.
 *
 * KEINE SORTIERUNG NACH WICHTIGKEIT. „Wichtig“ hiesse hier: Wir wüssten, was
 * dieser Person am meisten zu schaffen macht. Wissen wir nicht.
 */
export function itemsThatAge(): RegistryItemV22[] {
  return getItemsV22("venture_alignment").filter(agesWithTime);
}

/** Und alles Übrige - für den Knopf „alle ansehen“. */
export function itemsThatKeep(): RegistryItemV22[] {
  return getItemsV22("venture_alignment").filter((item) => !agesWithTime(item));
}
