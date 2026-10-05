/** Current journey only. Historical instrument readers retain their own IDs. */
export const CURRENT_WORKSTYLE_INSTRUMENT = "founder-workstyle-pretest-8-5a-v3";
export const CURRENT_WORKSTYLE_VERSION = "8.5a-v3";
export const CURRENT_WORKSTYLE_HREF = "/research/workstyle-pretest?version=8.5a-v3";
export const CURRENT_WORKSTYLE_REPORT_HREF = "/me/profile/workstyle";

/**
 * Phase 10 - Cutover: Wohin die frueheren Fragebogen-Einstiege (/me/base,
 * /me/values) fuehren. Mit Einladung ueber /join/start (der entscheidet, ob
 * Arbeitsprofil oder Teamreport dran ist), sonst direkt ins aktuelle
 * Arbeitsprofil. Frueher abgegebene Antworten bleiben unangetastet und als
 * historischer Stand lesbar; es entsteht kein neuer Entwurf der alten Fassung.
 */
export function currentPathForLegacyQuestionnaire(invitationId?: string | null) {
  const id = invitationId?.trim();
  return id ? `/join/start?invitationId=${encodeURIComponent(id)}` : CURRENT_WORKSTYLE_HREF;
}
