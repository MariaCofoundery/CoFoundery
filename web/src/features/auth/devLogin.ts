/**
 * Zeigt diese Adresse auf eine lokale Datenbank?
 *
 * Die Frage steht als eigene, reine Funktion da, weil an ihr die Sperre der
 * Entwicklungs-Anmeldung haengt (`/dev-login`) und die des Testprofil-Skripts.
 * Eine Sperre, die man nicht fuer sich pruefen kann, prueft niemand.
 *
 * WARUM NICHT `NODE_ENV`: Das sagt, wofuer man den Lauf HAELT - und das kann
 * falsch sein, eine vergessene Variable, ein falsches Terminal. Die Adresse
 * sagt, wohin man sich wirklich anmeldet.
 *
 * STRENG UND NICHT GROSSZUEGIG: Kein `includes("localhost")`, kein Praefix-
 * Vergleich. `https://localhost.angreifer.example` enthaelt "localhost", und
 * `127.0.0.1.angreifer.example` faengt sogar damit an. Verglichen wird der
 * Hostname als Ganzes gegen eine Liste.
 */

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function isLocalSupabaseUrl(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;

  try {
    // Klammern um eine IPv6-Adresse gehoeren zur Adresse, nicht zum Namen.
    const hostname = new URL(raw).hostname.replace(/^\[|\]$/g, "");
    return LOCAL_HOSTS.has(hostname);
  } catch {
    // Keine gueltige Adresse heisst nicht lokal. Im Zweifel zu.
    return false;
  }
}
