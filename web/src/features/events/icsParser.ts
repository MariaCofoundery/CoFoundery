/**
 * Kalenderdateien (iCal, RFC 5545) lesen - nach Regeln, ohne Dienst. Uebernommen werden nur Fakten: Kennung,
 * Titel, Beginn, Ende, ganztaegig, Ort und Link. Beschreibungen und Anhaenge bleiben bewusst liegen
 * (20270323120000: nur Fakten).
 */

export type ImportedEvent = {
  external_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  place: string | null;
  online: boolean;
  organizer: string | null;
  url: string;
};

type Property = { name: string; params: Record<string, string>; value: string };

/** Zeilen entfalten (Fortsetzung beginnt mit Leerzeichen oder Tab) und in Eigenschaften zerlegen. */
function properties(text: string): Property[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const unfolded: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) unfolded[unfolded.length - 1] += line.slice(1);
    else if (line.trim() !== "") unfolded.push(line);
  }
  return unfolded.flatMap((line) => {
    const colon = findValueColon(line);
    if (colon < 0) return [];
    const [rawName, ...rawParams] = line.slice(0, colon).split(";");
    const params: Record<string, string> = {};
    for (const param of rawParams) {
      const eq = param.indexOf("=");
      if (eq > 0) params[param.slice(0, eq).toUpperCase()] = param.slice(eq + 1).replace(/^"|"$/g, "");
    }
    return [{ name: rawName.toUpperCase(), params, value: line.slice(colon + 1) }];
  });
}

/** Der Doppelpunkt vor dem Wert - nicht einer in einem Parameter in Anfuehrungszeichen. */
function findValueColon(line: string) {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    else if (char === ":" && !quoted) return index;
  }
  return -1;
}

const unescape = (value: string) => value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").replace(/\s+/g, " ").trim();

/** Wanduhrzeit in einer Zeitzone als UTC-Zeitpunkt (ohne Bibliothek, ueber Intl). */
function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone: string): Date | null {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  try {
    const format = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const offsetAt = (instant: number) => {
      const parts = Object.fromEntries(format.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
      return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)) - instant;
    };
    const first = guess - offsetAt(guess);
    return new Date(guess - offsetAt(first));
  } catch {
    return null;
  }
}

/** DTSTART/DTEND: Datum (ganztaegig), UTC (Z), mit TZID oder ohne Zone (dann die Zone des Kalenders, sonst Berlin). */
export function parseIcsDate(property: Property | undefined, calendarZone: string): { at: Date; allDay: boolean } | null {
  if (!property) return null;
  const value = property.value.trim();
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (date || property.params.VALUE === "DATE") {
    const match = date ?? /^(\d{4})(\d{2})(\d{2})/.exec(value);
    if (!match) return null;
    const at = zonedToUtc(Number(match[1]), Number(match[2]), Number(match[3]), 0, 0, 0, property.params.TZID ?? calendarZone);
    return at ? { at, allDay: true } : null;
  }
  const stamp = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!stamp) return null;
  const [, y, mo, d, h, mi, s, zulu] = stamp;
  const at = zulu
    ? new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)))
    : zonedToUtc(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(s), property.params.TZID ?? calendarZone);
  return at && !Number.isNaN(at.getTime()) ? { at, allDay: false } : null;
}

const httpsUrl = (value: string | undefined) => {
  const text = (value ?? "").trim();
  return /^https:\/\/[^\s]+$/.test(text) && text.length <= 500 ? text : null;
};
const ONLINE = /\b(online|virtuell|virtual|webinar|livestream|zoom|teams)\b/i;

/**
 * Alle Termine einer Kalenderdatei. Ohne Link zur offiziellen Seite (URL, sonst der Link der Quelle) und ohne
 * Beginn wird ein Termin nicht uebernommen. Wiederholungen (RRULE) werden nicht aufgeloest: nur der erste Termin.
 */
export function parseIcs(text: string, fallbackUrl: string | null, now = new Date()): ImportedEvent[] {
  const props = properties(text);
  const calendarZone = props.find((prop) => prop.name === "X-WR-TIMEZONE")?.value.trim() || "Europe/Berlin";
  const events: ImportedEvent[] = [];
  let current: Property[] | null = null;
  for (const prop of props) {
    if (prop.name === "BEGIN" && prop.value.toUpperCase() === "VEVENT") current = [];
    else if (prop.name === "END" && prop.value.toUpperCase() === "VEVENT" && current) {
      const get = (name: string) => current?.find((entry) => entry.name === name);
      const uid = get("UID")?.value.trim();
      const title = unescape(get("SUMMARY")?.value ?? "");
      const status = get("STATUS")?.value.trim().toUpperCase();
      const start = parseIcsDate(get("DTSTART"), calendarZone);
      const end = parseIcsDate(get("DTEND"), calendarZone);
      const place = unescape(get("LOCATION")?.value ?? "");
      const url = httpsUrl(get("URL")?.value) ?? httpsUrl(fallbackUrl ?? undefined);
      const organizer = unescape(get("ORGANIZER")?.params.CN ?? "");
      current = null;
      if (!uid || !title || !start || !url || status === "CANCELLED") continue;
      if (start.at.getTime() < now.getTime() - 86_400_000) continue;
      events.push({
        external_id: uid.slice(0, 300),
        title: title.slice(0, 200),
        starts_at: start.at.toISOString(),
        // Bei ganztaegigen Terminen ist DTEND der Folgetag (exklusiv) - ein Tag zurueck.
        ends_at: end ? new Date(end.at.getTime() - (end.allDay ? 1000 : 0)).toISOString() : null,
        all_day: start.allDay,
        place: place ? place.slice(0, 160) : null,
        online: ONLINE.test(place) || ONLINE.test(title),
        organizer: organizer ? organizer.slice(0, 120) : null,
        url,
      });
    } else if (current) current.push(prop);
  }
  return events;
}
