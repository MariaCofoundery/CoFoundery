import { normalizeSafeInternalPath } from "@/features/auth/safeInternalPath";

type QueryValue = string | string[] | null | undefined;

/**
 * Phase 12C.1C: Der Login-Weg zu einer Seite - mit ihrem Kontext.
 *
 * Bis hierhin bauten die Seiten `next` selbst und liessen dabei die
 * Query-Parameter weg: Wer abgemeldet einen Link auf ein bestimmtes Vorhaben
 * (`?venture=`) oder einen gesicherten Bericht (`?snapshot=`) oeffnete, landete
 * nach dem Login in der Auswahl oder im aktuellen Bericht.
 *
 * Nur die ausdruecklich uebergebenen Parameter gehen mit, als Zeichenketten.
 * `next` bleibt ein interner Pfad: Was `normalizeSafeInternalPath`
 * ablehnt, faellt auf die Seite selbst zurueck - nie auf eine fremde Adresse.
 */
export function buildLoginRedirectPath(path: string, query: Record<string, QueryValue> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // Mehrfachwerte (z. B. ?p=a&p=b bei der Gruppenauswahl) bleiben erhalten.
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (typeof entry === "string" && entry.trim()) params.append(key, entry.trim());
    }
  }
  const qs = params.toString();
  const safePath = normalizeSafeInternalPath(path, "/dashboard");
  const next = normalizeSafeInternalPath(qs ? `${safePath}?${qs}` : safePath, safePath);
  return `/login?next=${encodeURIComponent(next)}`;
}
