/**
 * Die Leitfragen fuer ein Gesuch ("Ich suche ...").
 *
 * Sie bekommen keine eigenen Spalten: Sie werden als beschriftete Zeilen an den
 * Kontext gehaengt, der ohnehin im Feld `summary` steht. Es braucht keine
 * Migration, und es gelten dieselbe Sichtbarkeit und dieselbe Loeschung wie fuer
 * den Kontext selbst. Der Nachteil ist bewusst in Kauf genommen: Man kann nicht
 * nach Hilfeart oder Zeitrahmen filtern. Wenn das genutzt wird, wird daraus ein
 * eigenes Feld.
 */
export const LISTING_SUMMARY_MAX = 800;
export const LISTING_SUMMARY_MIN = 20;

/** Laengen der Felder, so gewaehlt, dass alles zusammen unter die Grenze passt. */
export const LISTING_GUIDED_LIMITS = { main: 400, tried: 120, stuck: 120 } as const;

export const LISTING_HELP_KINDS = ["counter_view", "experience", "contact", "material"] as const;
export type ListingHelpKind = (typeof LISTING_HELP_KINDS)[number];
export const LISTING_TIME_KINDS = ["five_minutes", "fifteen_minutes", "conversation"] as const;
export type ListingTimeKind = (typeof LISTING_TIME_KINDS)[number];

export type ListingSummaryLabels = {
  tried: string;
  stuck: string;
  help: string;
  time: string;
  helpKinds: Record<ListingHelpKind, string>;
  timeKinds: Record<ListingTimeKind, string>;
};

export type GuidedListingInput = {
  main: string;
  tried: string;
  stuck: string;
  help: readonly string[];
  time: string;
};

export type ComposedListingSummary =
  | { ok: true; summary: string; mainLength: number }
  | { ok: false; reason: "too_long" };

const isHelp = (value: string): value is ListingHelpKind =>
  (LISTING_HELP_KINDS as readonly string[]).includes(value);
const isTime = (value: string): value is ListingTimeKind =>
  (LISTING_TIME_KINDS as readonly string[]).includes(value);

/**
 * Setzt Kontext und Leitfragen zusammen. Leere Felder fallen weg. Unbekannte
 * Werte bei Hilfe und Zeit werden ignoriert, nichts davon wird ungeprueft in
 * den Text uebernommen. Zu lang wird abgewiesen und nie still gekuerzt.
 */
export function composeSeekingSummary(
  input: GuidedListingInput,
  labels: ListingSummaryLabels
): ComposedListingSummary {
  const main = input.main.trim();
  const tried = input.tried.trim();
  const stuck = input.stuck.trim();

  const parts: string[] = [main];
  if (tried) parts.push(`${labels.tried}: ${tried}`);
  if (stuck) parts.push(`${labels.stuck}: ${stuck}`);

  const helpKinds = LISTING_HELP_KINDS.filter((kind) => input.help.includes(kind) && isHelp(kind));
  const tail: string[] = [];
  if (helpKinds.length) tail.push(`${labels.help}: ${helpKinds.map((kind) => labels.helpKinds[kind]).join(", ")}`);
  if (isTime(input.time)) tail.push(`${labels.time}: ${labels.timeKinds[input.time]}`);
  if (tail.length) parts.push(tail.join(" · "));

  const summary = parts.join("\n\n");
  if (summary.length > LISTING_SUMMARY_MAX) return { ok: false, reason: "too_long" };
  return { ok: true, summary, mainLength: main.length };
}
