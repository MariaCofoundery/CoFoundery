/**
 * Connect Stufe 1: Danke und Herz.
 *
 * Das Herz ist ein Zeichen, keine Zahl: Es gibt hier absichtlich nichts, das Dankeschoens zaehlt, ordnet oder vergleicht.
 */
export const HELP_TYPES = ["knowledge", "feedback", "contact", "time", "resource", "collaboration"] as const;
export type HelpType = (typeof HELP_TYPES)[number];
export const THANKS_OUTCOMES = ["meeting", "introduction", "open"] as const;
export type ThanksOutcome = (typeof THANKS_OUTCOMES)[number];
export const THANKS_BODY_MAX = 280;

export const DIRECT_VIA = ["person", "listing", "problem", "venture"] as const;
export type DirectVia = (typeof DIRECT_VIA)[number];

type ThanksContent = { helpTypes: HelpType[]; outcome: ThanksOutcome | null; body: string | null; show: boolean };
export type ParsedThanks = ThanksContent & { conversationId: string };
export type ParsedDirectThanks = ThanksContent & { helperUserId: string; via: DirectVia; viaId: string | null };

/** Der gemeinsame Teil beider Formulare. null = unbrauchbar (keine Art der Hilfe, fremde Werte, zu langer Text). */
function parseContent(formData: FormData): ThanksContent | null {
  const helpTypes = formData.getAll("help_type").map(String).filter((value): value is HelpType => (HELP_TYPES as readonly string[]).includes(value));
  const unique = [...new Set(helpTypes)];
  const outcomeRaw = String(formData.get("outcome") ?? "");
  const outcome = (THANKS_OUTCOMES as readonly string[]).includes(outcomeRaw) ? (outcomeRaw as ThanksOutcome) : null;
  const body = String(formData.get("body") ?? "").trim() || null;
  if (unique.length === 0) return null;
  if (body && body.length > THANKS_BODY_MAX) return null;
  // Freigeben geht nur mit Worten - ohne Worte gibt es nichts zu zeigen.
  const show = formData.get("show") === "on" && body !== null;
  return { helpTypes: unique, outcome, body, show };
}

/** Dank nach einem Gespraech. */
export function parseThanksForm(formData: FormData): ParsedThanks | null {
  const conversationId = String(formData.get("conversation_id") ?? "").trim();
  const content = parseContent(formData);
  if (!conversationId || !content) return null;
  return { conversationId, ...content };
}

/** Dank ohne Gespraech: an ein Mitglied, von einem Profil, Gesuch, Problem oder Unternehmen aus. */
export function parseDirectThanksForm(formData: FormData): ParsedDirectThanks | null {
  const helperUserId = String(formData.get("helper_user_id") ?? "").trim();
  const viaRaw = String(formData.get("via") ?? "person");
  const via = (DIRECT_VIA as readonly string[]).includes(viaRaw) ? (viaRaw as DirectVia) : null;
  const viaId = String(formData.get("via_id") ?? "").trim() || null;
  const content = parseContent(formData);
  if (!helperUserId || !via || !content) return null;
  if (via !== "person" && !viaId) return null;
  return { helperUserId, via, viaId: via === "person" ? null : viaId, ...content };
}

/** Wohin das Herz fuehrt. */
export function thanksHref(userId: string, via: DirectVia = "person", viaId?: string | null): string {
  const query = via === "person" || !viaId ? "" : `?via=${via}&id=${encodeURIComponent(viaId)}`;
  return `/connect/danke/an/${encodeURIComponent(userId)}${query}`;
}
