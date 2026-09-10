/**
 * Was den Kernangaben noch fehlt, damit ein Kontextprofil damit
 * veroeffentlicht werden kann.
 *
 * Der Grund fuer dieses Modul ist ein Fehler, der sich als drei Fehler
 * anfuehlte:
 *
 *   Der Kern ist absichtlich permissiv - man soll ihn ausfuellen koennen, ohne
 *   irgendwo zu veroeffentlichen. Connect ist absichtlich streng, weil dort
 *   andere Menschen mitlesen. Beides ist richtig. Falsch war, dass niemand es
 *   sagt: Man fuellt die Identitaet auf /profile aus, bekommt "Gespeichert",
 *   geht nach Connect, will veroeffentlichen - und wird abgewiesen, ohne zu
 *   erfahren, welche Angabe zu kurz ist und wo man sie aendert.
 *
 * Die Schwellen stehen hier einmal und werden an beiden Enden benutzt: als
 * Hinweis dort, wo man die Angaben bearbeitet, und als Begruendung dort, wo
 * die Veroeffentlichung abgewiesen wird. Ein Test vergleicht sie mit
 * profilePublishable, damit sie nicht auseinanderlaufen.
 */

export const IDENTITY_THRESHOLDS = {
  displayName: 2,
  headline: 3,
  bio: 20,
} as const;

export type IdentityGap = "displayName" | "headline" | "bio";

export type IdentityCoreValues = {
  display_name?: string | null;
  headline?: string | null;
  bio?: string | null;
};

/**
 * Die Luecken in fester Reihenfolge - Name, Headline, Bio -, damit die
 * Aufzaehlung derselben Reihenfolge folgt wie das Formular.
 */
export function getIdentityGaps(core: IdentityCoreValues | null): IdentityGap[] {
  const length = (value: string | null | undefined) => (value ?? "").trim().length;
  const gaps: IdentityGap[] = [];

  if (length(core?.display_name) < IDENTITY_THRESHOLDS.displayName) gaps.push("displayName");
  if (length(core?.headline) < IDENTITY_THRESHOLDS.headline) gaps.push("headline");
  if (length(core?.bio) < IDENTITY_THRESHOLDS.bio) gaps.push("bio");

  return gaps;
}

export function isIdentityPublishReady(core: IdentityCoreValues | null) {
  return getIdentityGaps(core).length === 0;
}

/**
 * Wohin es nach dem Speichern zurueckgeht.
 *
 * Nur genau diese Pfade, und zwar als Allowlist statt als Praefixpruefung:
 * Ein Query-Parameter, der zu einem Redirect wird, ist eine offene
 * Weiterleitung, sobald er mehr zulaesst als noetig. Zwei Seiten schicken
 * Menschen zur Identitaet, also gibt es zwei erlaubte Rueckwege.
 */
const RETURN_PATHS = ["/connect/profile", "/discovery/profile"] as const;

export type IdentityReturnPath = (typeof RETURN_PATHS)[number];

export function parseIdentityReturnPath(value: unknown): IdentityReturnPath | null {
  const candidate = String(value ?? "").trim();
  return (RETURN_PATHS as readonly string[]).includes(candidate)
    ? (candidate as IdentityReturnPath)
    : null;
}

export const IDENTITY_RETURN_PATHS = RETURN_PATHS;
