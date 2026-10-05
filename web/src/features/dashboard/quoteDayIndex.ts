/** Anzahl der kuratierten Saetze in `common.quoteOfTheDay.quotes`. */
export const QUOTE_COUNT = 10;

/**
 * Tag als stabile Zahl - nach Berliner Datum, damit alle am selben Tag denselben
 * Satz sehen, unabhaengig von Serverzeit oder Rolle.
 */
export function quoteIndexFor(date: Date): number {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(date);
  const days = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return ((days % QUOTE_COUNT) + QUOTE_COUNT) % QUOTE_COUNT;
}
