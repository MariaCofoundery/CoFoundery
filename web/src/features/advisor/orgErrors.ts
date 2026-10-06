/**
 * Phase 12C.1C: Datenbankfehler -> verstaendliche Meldung. Der Text der
 * Datenbank erscheint nie auf der Seite; nur diese Codes gehen in die URL und
 * werden im Org-Abschnitt uebersetzt (advisor.org.errors).
 */
export type OrgActionErrorCode =
  | "org_last_owner"
  | "org_not_member"
  | "org_forbidden"
  | "org_suspended"
  | "org_name"
  | "email"
  | "org_failed";

export function orgErrorCode(message: string | null | undefined): OrgActionErrorCode {
  const text = message ?? "";
  if (/advisor_org_needs_an_owner/.test(text)) return "org_last_owner";
  if (/advisor_org_not_a_member/.test(text)) return "org_not_member";
  if (/advisor_org_not_yours|advisor_org_owner_required/.test(text)) return "org_forbidden";
  if (/invalid_email/.test(text)) return "email";
  return "org_failed";
}

const KNOWN_CODES: readonly OrgActionErrorCode[] = [
  "org_last_owner",
  "org_not_member",
  "org_forbidden",
  "org_suspended",
  "org_name",
  "email",
  "org_failed",
];

/** Aus `?orgError=` - Unbekanntes (auch aeltere Codes) wird zur allgemeinen Meldung. */
export function readOrgErrorCode(value: string | null | undefined): OrgActionErrorCode | null {
  if (!value) return null;
  return (KNOWN_CODES as readonly string[]).includes(value) ? (value as OrgActionErrorCode) : "org_failed";
}
