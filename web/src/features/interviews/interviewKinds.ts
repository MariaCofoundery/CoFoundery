/**
 * Welche Gespraeche es gibt.
 *
 * SCHRITT S1 aus `web/docs/direction-interview-technical-brief.md`: Die
 * Gespraechsmechanik wird geteilt, die Auswertung bleibt getrennt. Die Art
 * steht seit der Migration 20261035120000 in einer Spalte, und diese Liste ist
 * ihr Gegenstueck im Code - wie `IN_APP_NOTICE_KINDS` bei den Hinweisen. Ein
 * Test vergleicht beide.
 *
 * WARUM DIE ART UEBERALL MITGEGEBEN WERDEN MUSS, und zwar ausnahmslos: Bis
 * zum 22.09.2026 holte `getActiveInterview` "das" aktive Gespraech mit
 * `maybeSingle()`. Sobald eine Person zwei Gespraeche verschiedener Art
 * gleichzeitig offen hat, liefert diese Abfrage einen Fehler - und der Code
 * liest daraus "kein Gespraech vorhanden". Das Capability-Interview waere
 * also nicht falsch geworden, sondern verschwunden, sobald jemand ein
 * Direction-Interview startet. Das ist der eine Weg, auf dem dieses Teilen
 * Schaden anrichten kann; deshalb filtert jeder Leser und jede Aktion.
 */
export const INTERVIEW_KINDS = ["capability", "direction"] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];

export const CAPABILITY_INTERVIEW: InterviewKind = "capability";
export const DIRECTION_INTERVIEW: InterviewKind = "direction";
