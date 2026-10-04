/**
 * Der Arbeitskontext in der Leiste: als Founder oder als Advisor.
 *
 * NUR DARSTELLUNG. Der Kontext entscheidet, welcher Menuebaum steht und wohin
 * Logo und "Start" fuehren - sonst nichts. Jede Seite prueft ihren Zugang
 * weiterhin selbst (Grants, RPCs, RLS). Deshalb darf dieser Wert nirgends in
 * Datenlesern, Actions oder Berechtigungspruefungen auftauchen; ein Test haelt
 * das fest.
 *
 * Das Cookie bedeutet "zuletzt in diesem Kontext gearbeitet": Eindeutige
 * Founder- oder Advisor-Seiten schreiben es, gemeinsam genutzte Seiten
 * (Postfach, Konto, Connect, Team-Intake ...) lesen es nur. Es zaehlt nur bei
 * Menschen mit beiden Rollen - bei einer Rolle steht die Ansicht ohnehin fest,
 * und ein veraltetes Cookie nach einem Rollenwechsel wirkt nicht.
 */

export const WORK_CONTEXT_COOKIE = "ui_work_context";

export type WorkContext = "founder" | "advisor";

type PathKind = WorkContext | "shared";

export function parseWorkContext(value: string | null | undefined): WorkContext | null {
  return value === "founder" || value === "advisor" ? value : null;
}

function isUnder(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Welchem Kontext eine Seite eindeutig gehoert.
 *
 * `/team-intake` ist ausdruecklich GEMEINSAM: Advisor legen Intakes an, Founder
 * nehmen daran teil (`list_team_intakes` liefert beide Seiten).
 */
export function classifyWorkContextPath(pathname: string): PathKind {
  if (isUnder(pathname, "/advisor")) return "advisor";
  if (
    pathname === "/dashboard" ||
    pathname === "/connections" ||
    pathname === "/invite/new" ||
    isUnder(pathname, "/teams") ||
    isUnder(pathname, "/me") ||
    isUnder(pathname, "/discovery") ||
    isUnder(pathname, "/founder-alignment") ||
    isUnder(pathname, "/founder-library") ||
    isUnder(pathname, "/report") ||
    isUnder(pathname, "/research/workstyle-pretest")
  ) {
    return "founder";
  }
  return "shared";
}

export function resolveActiveView(params: {
  pathname: string;
  override?: WorkContext | null;
  hasFounder: boolean;
  hasAdvisor: boolean;
  stored: WorkContext | null;
}): WorkContext {
  const kind = classifyWorkContextPath(params.pathname);
  // /advisor/* gewinnt immer.
  if (kind === "advisor") return "advisor";
  // Eine Rolle: Die Ansicht steht fest, das Cookie zaehlt nicht.
  if (params.hasAdvisor && !params.hasFounder) return "advisor";
  if (!params.hasAdvisor) return "founder";
  // Beide Rollen.
  if (params.override) return params.override;
  if (kind === "founder") return "founder";
  return params.stored ?? "founder";
}

/** Was nach dem Besuch dieser Seite gespeichert werden soll - oder nichts. */
export function workContextToStore(params: {
  pathname: string;
  hasFounder: boolean;
  hasAdvisor: boolean;
}): WorkContext | null {
  if (!(params.hasFounder && params.hasAdvisor)) return null;
  const kind = classifyWorkContextPath(params.pathname);
  return kind === "shared" ? null : kind;
}

/** Clientseitig geschrieben, wie die Sprachwahl. Kein httpOnly noetig: reine UI-Praeferenz. */
export function writeWorkContextCookie(value: WorkContext) {
  document.cookie = [
    `${WORK_CONTEXT_COOKIE}=${value}`,
    "path=/",
    "max-age=31536000",
    "samesite=lax",
  ].join("; ");
}
