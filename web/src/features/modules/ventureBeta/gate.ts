/**
 * Beta-Gate fuer Venture Alignment v2 (Beta 1).
 *
 * KEIN VERSTECKTER WECHSEL. Die Beta ist live nutzbar, ersetzt `venture-alignment-v1` aber fuer
 * niemanden: Wer nicht freigeschaltet ist, sieht die Beta nicht und bleibt auf v1. Eine
 * Umgebungsvariable reicht - wie bei `BETA_ACCESS_CODES` und `REPORT_ACCESS_MODE`, keine
 * Flag-Plattform, kein Schalter in der Datenbank.
 *
 *   VENTURE_ALIGNMENT_V2_BETA
 *     (leer / `off`)        aus - fuer niemanden sichtbar (Standard)
 *     `all`                 fuer alle angemeldeten Personen
 *     `a@x.de, <user-id>`   nur diese Konten (E-Mail oder Nutzer-ID, durch Komma oder Zeilenumbruch getrennt)
 *
 * Das Gate steuert nur die SICHTBARKEIT (Seiten, Karten, Aktionen). Es ist keine Berechtigung: Die
 * Daten liegen unter denselben Regeln wie jede andere Antwort (Mitgliedschaft, Eigentuemer, RLS).
 */
export type BetaGate = { mode: "off" } | { mode: "all" } | { mode: "list"; entries: Set<string> };

export const VENTURE_BETA_ENV = "VENTURE_ALIGNMENT_V2_BETA";

export function parseBetaGate(raw: string | null | undefined): BetaGate {
  const value = (raw ?? "").trim();
  if (!value || value.toLowerCase() === "off") return { mode: "off" };
  if (value.toLowerCase() === "all") return { mode: "all" };
  const entries = new Set(
    value
      .split(/[\n,;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
  return entries.size > 0 ? { mode: "list", entries } : { mode: "off" };
}

export function isVentureBetaEnabled(
  user: { id?: string | null; email?: string | null } | null | undefined,
  raw: string | null | undefined = process.env[VENTURE_BETA_ENV]
): boolean {
  if (!user?.id) return false;
  const gate = parseBetaGate(raw);
  if (gate.mode === "off") return false;
  if (gate.mode === "all") return true;
  return gate.entries.has(user.id.toLowerCase()) || (!!user.email && gate.entries.has(user.email.toLowerCase()));
}
