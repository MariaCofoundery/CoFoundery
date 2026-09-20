/**
 * Die Mailarten, die sich abbestellen lassen.
 *
 * Muss mit der Werteliste in notification_opt_outs_kind_check
 * uebereinstimmen (20261001120000_account_locale_and_notifications.sql); ein
 * Test vergleicht beide. Waere die Liste hier laenger, liefe eine Abbestellung
 * in einen Constraint-Fehler; waere sie kuerzer, gaebe es eine Mailart ohne
 * Schalter - genau der Zustand, aus dem das hier entstanden ist.
 *
 * EINLADUNGEN STEHEN NICHT HIER.
 *   Eine Einladung IST die Nachricht. Sie abzubestellen hiesse, sie nie zu
 *   bekommen, und sie geht oft an Menschen ohne Konto.
 *
 * `approach_interest` STEHT AUCH NICHT HIER.
 *   Es ist eine eigene Mailart mit eigenem Text, aber kein eigener Schalter:
 *   Es haengt an `problem_interest`, dessen Beschreibung beide Faelle nennt.
 *   Die Zuordnung steht in `wants_email_notification`
 *   (20261012120000_discovery_intro_notifications.sql). Bis dahin liess sich
 *   diese Art gar nicht abbestellen - die Zeile waere am Constraint
 *   gescheitert, und der Schalter log.
 *
 * `area` gruppiert die Liste in der Oberflaeche nach den drei Bereichen, in
 * denen die Mail entsteht - man sucht eine Einstellung dort, wo man die Sache
 * erlebt hat.
 */
export const NOTIFICATION_KINDS = [
  { kind: "contact_request", area: "connect" },
  { kind: "message", area: "connect" },
  { kind: "problem_interest", area: "connect" },
  { kind: "connect_saved_search", area: "connect" },
  { kind: "discovery_intro_request", area: "find" },
  { kind: "discovery_intro_accepted", area: "find" },
  { kind: "discovery_saved_search", area: "find" },
  { kind: "read_my_mind", area: "align" },
  { kind: "founder_in_the_wild", area: "align" },
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]["kind"];
export type NotificationArea = (typeof NOTIFICATION_KINDS)[number]["area"];

export const NOTIFICATION_AREAS = ["align", "find", "connect"] as const;

export function isNotificationKind(value: unknown): value is NotificationKind {
  return NOTIFICATION_KINDS.some((entry) => entry.kind === value);
}

export function notificationKindsByArea(area: NotificationArea) {
  return NOTIFICATION_KINDS.filter((entry) => entry.area === area).map((entry) => entry.kind);
}
