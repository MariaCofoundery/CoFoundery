import { normalizeSafeInternalPath } from "@/features/auth/safeInternalPath";

/**
 * Die App auf dem Startbildschirm oeffnet dort, wo man zuletzt war (Wunsch von Maria, 05.11.2026:
 * "wenn ich da reingehe, auch immer da wieder so landen, wo ich das letzte Mal war").
 *
 * Gemerkt wird nur IN DER INSTALLIERTEN APP (RememberLastPlace) - auf dem iPhone hat sie ihren
 * eigenen Cookie-Speicher, der Browser bleibt davon unberuehrt. `/start` ohne eigenes Ziel fuehrt
 * dorthin zurueck. Zurueck geht es nur in Produktbereiche aus der Liste hier, nie in Anmeldung,
 * Einladungen, Debug oder Schnittstellen; ob die Person die Seite sehen darf, entscheidet wie immer
 * die Seite selbst.
 */

export const LAST_PLACE_COOKIE = "cofoundery_last_place";
export const LAST_PLACE_MAX_AGE = 60 * 60 * 24 * 30;

const RESUMABLE = [
  "/dashboard",
  "/align",
  "/advisor",
  "/teams",
  "/me",
  "/profile",
  "/connect",
  "/connections",
  "/discovery",
  "/programm",
  "/messages",
  "/founder-alignment/vorhaben",
];

/** Der gemerkte Ort, wenn er einer ist, zu dem man zurueckkehren darf - sonst null. */
export function resumablePath(value: string | null | undefined): string | null {
  if (!value || value.length > 400) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  const safe = normalizeSafeInternalPath(decoded, "");
  if (!safe || safe !== decoded) return null;
  const pathname = safe.split(/[?#]/)[0];
  // Druck- und Download-Adressen sind kein Ort, an dem man weiterarbeitet.
  if (/\/(document|csv)(\/|$)/.test(pathname)) return null;
  return RESUMABLE.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ? safe : null;
}
