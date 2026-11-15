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

export type ParsedThanks = { requestId: string; helpTypes: HelpType[]; outcome: ThanksOutcome | null; body: string | null; show: boolean };

/** Liest das Formular. null = unbrauchbar (keine Art der Hilfe, fremde Werte, zu langer Text). */
export function parseThanksForm(formData: FormData): ParsedThanks | null {
  const requestId = String(formData.get("request_id") ?? "").trim();
  const helpTypes = formData.getAll("help_type").map(String).filter((value): value is HelpType => (HELP_TYPES as readonly string[]).includes(value));
  const unique = [...new Set(helpTypes)];
  const outcomeRaw = String(formData.get("outcome") ?? "");
  const outcome = (THANKS_OUTCOMES as readonly string[]).includes(outcomeRaw) ? (outcomeRaw as ThanksOutcome) : null;
  const body = String(formData.get("body") ?? "").trim() || null;
  if (!requestId || unique.length === 0) return null;
  if (body && body.length > THANKS_BODY_MAX) return null;
  // Freigeben geht nur mit Worten - ohne Worte gibt es nichts zu zeigen.
  const show = formData.get("show") === "on" && body !== null;
  return { requestId, helpTypes: unique, outcome, body, show };
}
