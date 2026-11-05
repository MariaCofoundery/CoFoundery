/**
 * Eine Liste von Veranstaltungen aus Text oder Diktat lesen (Programmplan, Wunsch Maria 05.11.2026) - nach Regeln,
 * ohne Dienst. Beispiel: "Masterclass Pricing am 12.11. um 18 Uhr im Basislager, Pitch in Progress am 19. November
 * online und Fireside Chat mit Anna am 26.11. 19:30". Daraus werden Vorschlaege mit Titel, Tag, Uhrzeit, Ort und
 * Format; die Person prueft und ergaenzt, bevor gespeichert wird.
 *
 * Auch der Kampagnen-Planer im Social-Media-Kalender nutzt die Zerlegung: Stehen dort mehrere Termine mit eigenem
 * Namen, heisst jedes Posting wie sein Termin - nicht "Kampagne 1/2".
 */

export type ParsedEvent = {
  title: string;
  day: string;
  time: string | null;
  location: string | null;
  online: boolean;
  formatId: string | null;
  kind: "education" | "internal" | "external";
};

const MONTHS: Record<string, number> = {
  januar: 1, jan: 1, january: 1, februar: 2, feb: 2, february: 2, märz: 3, maerz: 3, mär: 3, mar: 3, march: 3, april: 4, apr: 4,
  mai: 5, may: 5, juni: 6, jun: 6, june: 6, juli: 7, jul: 7, july: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, october: 10, oct: 10, november: 11, nov: 11, dezember: 12, dez: 12, december: 12, dec: 12,
};
const MONTH_WORDS = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
// 12.11. / 12.11.2026 / 12. November (2026) - nicht Teil einer Uhrzeit wie 18.30 Uhr.
const DATE = new RegExp(`(?<![\\p{L}\\d.:])(\\d{1,2})\\.\\s?(?:(\\d{1,2})\\.(?:\\s?(\\d{4}|\\d{2})(?![\\d:.]))?|(${MONTH_WORDS})\\.?(?:\\s(\\d{4}))?(?![\\p{L}]))`, "giu");
const TIME = [
  /(?<![\p{L}\d])(?:um|ab|at)\s+(\d{1,2})(?:[:.](\d{2}))?(?:\s*uhr)?(?![\p{L}\d])/iu,
  /(?<![\p{L}\d.:])(\d{1,2}):(\d{2})(?:\s*uhr)?(?![\d])/iu,
  /(?<![\p{L}\d.:])(\d{1,2})(?:\.(\d{2}))?\s*uhr(?![\p{L}])/iu,
];
const ONLINE = /(?<![\p{L}])(online|virtuell|virtual|webinar|zoom|livestream)(?![\p{L}])/iu;
const PLACE = /(?<![\p{L}])(?:im|in der|in den|in|bei|@|ort:?)\s+((?:[\p{Lu}\d][^,;–—]*?))(?=\s*(?:$|,|;|–|—|\s(?:um|ab|am|online)\s))/u;
const SEPARATOR = /,\s+|\s+(?:und|sowie|dann|außerdem|ausserdem|danach)\s+/giu;
const FILLER = /(?<![\p{L}])(?:am|um|ab|uhr|den|dem|vom|von|bis)(?![\p{L}])/giu;

const pad = (value: number) => String(value).padStart(2, "0");
const labelPattern = (label: string) => new RegExp(`(?<![\\p{L}\\d])${label.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\d])`, "iu");

/** Tag aus einem Treffer: ohne Jahr der naechste solche Tag ab heute (gestern zaehlt noch). */
function dayOf(match: RegExpExecArray, today: string): string | null {
  const day = Number(match[1]);
  const month = match[2] ? Number(match[2]) : MONTHS[(match[4] ?? "").toLowerCase()];
  const rawYear = match[3] ?? match[5];
  if (!month || month > 12 || day < 1 || day > 31) return null;
  const year = rawYear ? (rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear)) : Number(today.slice(0, 4));
  let iso = `${year}-${pad(month)}-${pad(day)}`;
  if (!rawYear) {
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    if (iso < yesterday) iso = `${year + 1}-${pad(month)}-${pad(day)}`;
  }
  const check = new Date(`${iso}T00:00:00Z`);
  return check.getUTCDate() === day ? iso : null;
}

/** Zerlegen: Zeilen, Strichpunkte, Saetze - und Aufzaehlungen, wenn darin mehrere Tage stehen. */
export function segmentsOf(text: string): string[] {
  const chunks = text
    .split(/\n+|;|(?<![\d])\.(?=\s+\p{Lu})/u)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const result: string[] = [];
  for (const chunk of chunks) {
    const dates = [...chunk.matchAll(new RegExp(DATE.source, DATE.flags))];
    if (dates.length < 2) {
      result.push(chunk);
      continue;
    }
    const separators = [...chunk.matchAll(new RegExp(SEPARATOR.source, SEPARATOR.flags))];
    // Steht der Tag vorn ("12.11. Masterclass"), trennt die Stelle direkt vor dem naechsten Tag; steht der Name
    // vorn ("Masterclass am 12.11."), die erste Trennstelle nach dem vorigen Tag.
    const dateFirst = (dates[0].index ?? 0) <= 2;
    let start = 0;
    for (let index = 1; index < dates.length; index += 1) {
      const previousEnd = (dates[index - 1].index ?? 0) + dates[index - 1][0].length;
      const nextStart = dates[index].index ?? 0;
      const between = separators.filter((separator) => (separator.index ?? 0) >= previousEnd && (separator.index ?? 0) < nextStart);
      if (between.length === 0) continue;
      const cut = dateFirst ? between[between.length - 1] : between[0];
      result.push(chunk.slice(start, cut.index).trim());
      start = (cut.index ?? 0) + cut[0].length;
    }
    result.push(chunk.slice(start).trim());
  }
  return result.filter(Boolean);
}

const tidy = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:–—\-.]+|[\s,;:–—\-]+$/g, "")
    .trim();

/** Eine Zeile lesen. Ohne Tag: keine Veranstaltung. */
export function parseEventLine(line: string, context: { today: string; formats?: { formatId: string; label: string }[] }): ParsedEvent | null {
  const dateMatch = new RegExp(DATE.source, "iu").exec(line);
  if (!dateMatch) return null;
  const day = dayOf(dateMatch, context.today);
  if (!day) return null;
  let rest = `${line.slice(0, dateMatch.index)} ${line.slice(dateMatch.index + dateMatch[0].length)}`;

  let time: string | null = null;
  for (const pattern of TIME) {
    const match = pattern.exec(rest);
    if (match && Number(match[1]) <= 23) {
      time = `${pad(Number(match[1]))}:${match[2] ?? "00"}`;
      rest = rest.replace(match[0], " ");
      break;
    }
  }

  // Bekannte Formate zuerst - "Pitch in Progress" ist ein Name, kein Ort "in Progress".
  const format = [...(context.formats ?? [])]
    .sort((a, b) => b.label.length - a.label.length)
    .find((entry) => labelPattern(entry.label).test(rest));
  const MASK = "\u2060FORMAT\u2060";
  if (format) rest = rest.replace(labelPattern(format.label), MASK);

  const online = ONLINE.test(rest);
  let location: string | null = null;
  const place = PLACE.exec(rest);
  if (place && !ONLINE.test(place[1]) && !place[1].includes(MASK)) {
    location = tidy(place[1]).slice(0, 200) || null;
    rest = rest.replace(place[0], " ");
  }
  if (online) {
    rest = rest.replace(new RegExp(`(?:\\s(?:als|per|im))?\\s*${ONLINE.source}`, "iu"), " ");
    location = location ?? "Online";
  }

  const kind: ParsedEvent["kind"] = /(?<![\p{L}])(?:intern|internal)(?![\p{L}])/iu.test(rest) ? "internal" : /(?<![\p{L}])(?:extern|external)(?![\p{L}])/iu.test(rest) ? "external" : "education";
  rest = rest.replace(/(?<![\p{L}])(?:intern|internal|extern|external)(?![\p{L}])/giu, " ");

  if (format) rest = rest.replace(MASK, (line.match(labelPattern(format.label)) ?? [format.label])[0]);

  const title = tidy(rest.replace(FILLER, " ")).replace(/^(?:und|sowie|dann)\s+/i, "");
  const finalTitle = (title || format?.label || "").slice(0, 160);
  if (!finalTitle) return null;
  return { title: finalTitle[0].toLocaleUpperCase("de") + finalTitle.slice(1), day, time, location, online, formatId: format?.formatId ?? null, kind };
}

/** Alle Veranstaltungen aus einem Text, in der Reihenfolge, in der sie genannt wurden. */
export function parseEventList(text: string, context: { today: string; formats?: { formatId: string; label: string }[] }): ParsedEvent[] {
  return segmentsOf(text)
    .map((segment) => parseEventLine(segment, context))
    .filter((entry): entry is ParsedEvent => entry !== null)
    .slice(0, 40);
}
