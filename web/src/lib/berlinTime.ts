/**
 * Wanduhrzeit in Deutschland. Formulare schicken "2026-11-12" und "18:00" ohne Zone; der Server laeuft bei Vercel
 * in UTC. Ohne diese Umrechnung landete eine Veranstaltung um 18:00 als 19:00 (Winter) oder 20:00 (Sommer).
 */
const ZONE = "Europe/Berlin";

function offsetAt(instant: number) {
  const format = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const parts = Object.fromEntries(format.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)) - instant;
}

/** "2026-11-12" + "18:00" (Berlin) als ISO-Zeitpunkt. Ungueltig: null. */
export function berlinToIso(day: string, time = "00:00"): string | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time) ?? ["", "00", "00"];
  if (!date) return null;
  const guess = Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]), Number(clock[1]), Number(clock[2]));
  const first = guess - offsetAt(guess);
  const at = new Date(guess - offsetAt(first));
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** Ein datetime-local-Wert ("2026-11-12T18:00") als Berliner Zeit. */
export function berlinLocalToIso(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return match ? berlinToIso(match[1], match[2]) : null;
}

/** Ein Zeitpunkt als datetime-local-Wert in Berliner Zeit. */
export function isoToBerlinLocal(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Der Tag (Berlin) eines Zeitpunkts als JJJJ-MM-TT. */
export function berlinDayOf(iso: string): string {
  return isoToBerlinLocal(iso).slice(0, 10);
}
