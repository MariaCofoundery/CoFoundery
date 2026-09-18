/**
 * Die Rueckmeldungen der Kontoseite, an einer Stelle.
 *
 * Eine Liste und nicht drei: Die Seite prueft den Parameter genau einmal gegen
 * diese Liste, bevor er an t() geht. next-intl wirft bei einem unbekannten
 * Schluessel nicht - es rendert den Pfad selbst, und ein manipulierter
 * Parameter stuende als "dashboard.account.foo" auf der Seite.
 *
 * Gezeigt wird die Meldung jeweils in dem Abschnitt, zu dem sie gehoert. Eine
 * Bestaetigung am Seitenkopf, waehrend der Knopf zwei Bildschirme weiter
 * unten steht, liest niemand.
 */
export const ACCOUNT_STATUS_KEYS = [
  "email_sent",
  "email_invalid",
  "email_unchanged",
  "email_failed",
  "locale_saved",
  "locale_failed",
  "notifications_saved",
  "notifications_failed",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUS_KEYS)[number];

export function isAccountStatus(value: unknown): value is AccountStatus {
  return ACCOUNT_STATUS_KEYS.includes(value as AccountStatus);
}

/** Ein Fehlschlag faerbt rot, eine Bestaetigung gruen. */
export function isAccountStatusFailure(status: AccountStatus) {
  return status.endsWith("_failed") || status === "email_invalid" || status === "email_unchanged";
}

export function accountStatusSection(status: AccountStatus) {
  if (status.startsWith("email_")) return "access" as const;
  if (status.startsWith("locale_")) return "locale" as const;
  return "notifications" as const;
}
