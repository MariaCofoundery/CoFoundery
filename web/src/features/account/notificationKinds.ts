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
  { kind: "connect_suggestions", area: "connect" },
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

/**
 * Arten, die zusaetzlich eine ausdrueckliche Zustimmung fuer den MAILWEG
 * brauchen.
 *
 * WARUM DAS EINE ZWEITE LISTE IST: Der Schalter oben sagt "diese Art ja oder
 * nein" und gilt fuer beide Wege. Fuer Vorschlaege reicht das nicht: Alle
 * uebrigen Arten entstehen, weil ein MENSCH sich gemeldet hat - da war die
 * Mail von Anfang an der Weg. Ein Vorschlag entsteht, weil eine
 * Mengenschnittmenge etwas gefunden hat. Ungefragte Post in ein fremdes
 * Postfach darf davon nicht ausgehen, also ist dieser Haken leer, bis jemand
 * ihn setzt.
 *
 * Gespeichert in `notification_opt_ins` - einer eigenen Tabelle, weil dort die
 * ABWESENHEIT einer Zeile "nein" heisst und in `notification_opt_outs`
 * umgekehrt "ja". Zwei Bedeutungen in einer Tabelle waere eine Spalte, deren
 * Sinn je Zeile kippt.
 *
 * Muss mit `notification_opt_ins_kind_check` uebereinstimmen
 * (20261020120000_suggestion_notifications.sql); ein Test vergleicht beide.
 */
export const NOTIFICATION_EMAIL_OPT_INS = [
  { kind: "connect_suggestions_email", parent: "connect_suggestions" },
] as const;

export type NotificationEmailOptIn = (typeof NOTIFICATION_EMAIL_OPT_INS)[number]["kind"];

export function isNotificationEmailOptIn(value: unknown): value is NotificationEmailOptIn {
  return NOTIFICATION_EMAIL_OPT_INS.some((entry) => entry.kind === value);
}

export function emailOptInForKind(kind: NotificationKind) {
  return NOTIFICATION_EMAIL_OPT_INS.find((entry) => entry.parent === kind) ?? null;
}
