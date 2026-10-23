/**
 * Welche Fassung des Begruessungsbriefs aktuell ist.
 *
 * Wer eine aeltere (oder gar keine) Fassung bestaetigt hat, bekommt den Brief
 * beim naechsten Besuch noch einmal, genau einmal. Aendert sich der Brief
 * inhaltlich, die Zahl um eins erhoehen - eine Aenderung an der Datenbank ist
 * dafuer nicht noetig.
 *
 * 1 = erste Fassung (Marias Geschichte mit 17 Jahren, 23.10.2026)
 * 2 = Fassung aus dem Konzeptboard 29 (Achterbahn, geschuetzter Raum), 24.10.2026
 */
export const WELCOME_LETTER_VERSION = 2;
