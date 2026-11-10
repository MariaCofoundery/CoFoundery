import { HOLIDAY_STATES, PUBLIC_HOLIDAYS, SCHOOL_HOLIDAYS, type HolidayState } from "@/features/advisor/calendar/holidaysData";

/**
 * Feiertage und Ferien im Kalender (Wunsch Maria, 10.11.2026): Jede Person waehlt Bundesland und was sie sehen will.
 * Die Wahl steht in einem Cookie (reine Darstellung wie die gewaehlte Organisation, kein Zugang). Ohne Wahl erscheint nichts.
 */
export const HOLIDAY_COOKIE = "ui_cal_frei";

export type HolidayPrefs = { state: HolidayState; publicHolidays: boolean; school: boolean };

export const isHolidayState = (value: unknown): value is HolidayState => typeof value === "string" && (HOLIDAY_STATES as readonly string[]).includes(value);

/** "SN|h|s" - Bundesland, dann h (Feiertage) und/oder s (Schulferien). Alles andere: keine Wahl. */
export function parseHolidayPrefs(value: string | null | undefined): HolidayPrefs | null {
  const [state, ...flags] = (value ?? "").split("|");
  if (!isHolidayState(state)) return null;
  const prefs = { state, publicHolidays: flags.includes("h"), school: flags.includes("s") };
  return prefs.publicHolidays || prefs.school ? prefs : null;
}

export const serializeHolidayPrefs = (prefs: HolidayPrefs) => [prefs.state, ...(prefs.publicHolidays ? ["h"] : []), ...(prefs.school ? ["s"] : [])].join("|");

export type DayMarks = { holiday: string | null; school: string | null; schoolStarts: boolean };

const addDay = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Je Tag zwischen von und bis: gesetzlicher Feiertag und/oder Schulferien (mit "faengt heute an"). Nur Tage mit etwas darin. */
export function holidayMarks(prefs: HolidayPrefs | null, from: string, to: string): Map<string, DayMarks> {
  const marks = new Map<string, DayMarks>();
  if (!prefs) return marks;
  const at = (day: string) => marks.get(day) ?? { holiday: null, school: null, schoolStarts: false };
  if (prefs.publicHolidays) {
    for (const [day, name] of PUBLIC_HOLIDAYS[prefs.state]) if (day >= from && day <= to) marks.set(day, { ...at(day), holiday: name });
  }
  if (prefs.school) {
    for (const [start, end, name] of SCHOOL_HOLIDAYS[prefs.state]) {
      if (end < from || start > to) continue;
      for (let day = start < from ? from : start; day <= end && day <= to; day = addDay(day, 1)) marks.set(day, { ...at(day), school: name, schoolStarts: day === start });
    }
  }
  return marks;
}

/** Englische Namen fuer die Anzeige; unbekannte bleiben deutsch. */
const EN: Record<string, string> = {
  Neujahr: "New Year's Day", Karfreitag: "Good Friday", Ostersonntag: "Easter Sunday", Ostermontag: "Easter Monday", "Tag der Arbeit": "Labour Day",
  "Christi Himmelfahrt": "Ascension Day", Pfingstsonntag: "Whit Sunday", Pfingstmontag: "Whit Monday", Fronleichnam: "Corpus Christi", "Mariä Himmelfahrt": "Assumption Day",
  "Tag der Deutschen Einheit": "German Unity Day", Reformationstag: "Reformation Day", Allerheiligen: "All Saints' Day", "Buß- und Bettag": "Day of Repentance and Prayer",
  "1. Weihnachtsfeiertag": "Christmas Day", "2. Weihnachtsfeiertag": "Boxing Day", "Heilige Drei Könige": "Epiphany", "Internationaler Frauentag": "International Women's Day", Weltkindertag: "World Children's Day",
  Weihnachtsferien: "Christmas break", Winterferien: "Winter break", Osterferien: "Easter break", Pfingstferien: "Whitsun break", Sommerferien: "Summer break", Herbstferien: "Autumn break",
  Frühjahrsferien: "Spring break", Fastnachtsferien: "Carnival break", Halbjahresferien: "Mid-year break",
};
export const holidayName = (name: string, locale: string) => (locale.startsWith("en") ? EN[name] ?? name : name);
