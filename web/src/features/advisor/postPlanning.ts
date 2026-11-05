import type { Channel } from "@/features/advisor/socialCalendarModel";

/**
 * Postings zu einer Veranstaltung planen (Wunsch Maria, 05.11.2026): Eine Vorlage sagt, wann vor oder nach dem
 * Termin auf welchem Kanal etwas rausgeht ("eine Woche vorher LinkedIn und Instagram, drei Tage vorher LinkedIn,
 * einen Tag danach LinkedIn"). Angewendet entstehen Vorschlaege. Faellt ein Tag auf ein Wochenende oder einen
 * bundesweiten Feiertag, sagt das Werkzeug es und bietet den Werktag davor und danach an.
 */

export type TemplateStep = { days: number; channel: Channel; label: string | null; time: string | null };
export type PostTemplate = { templateId: string | null; name: string; steps: TemplateStep[] };

/** Ohne eigene Vorlage: je ein Posting auf LinkedIn und Instagram eine Woche vorher. */
export const DEFAULT_TEMPLATE_STEPS: TemplateStep[] = [
  { days: -7, channel: "linkedin", label: null, time: "09:00" },
  { days: -7, channel: "instagram", label: null, time: "12:00" },
];

const iso = (date: Date) => date.toISOString().slice(0, 10);
export const shiftDay = (day: string, days: number) => iso(new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000));
const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();

/** Ostersonntag (Gauss/Meeus) - fuer die beweglichen Feiertage. */
function easter(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Bundesweite gesetzliche Feiertage. Landesfeiertage (z. B. Fronleichnam, Reformationstag) sind bewusst nicht dabei. */
export function nationalHolidays(year: number): Map<string, string> {
  const sunday = easter(year);
  return new Map([
    [`${year}-01-01`, "Neujahr"],
    [shiftDay(sunday, -2), "Karfreitag"],
    [shiftDay(sunday, 1), "Ostermontag"],
    [`${year}-05-01`, "Tag der Arbeit"],
    [shiftDay(sunday, 39), "Christi Himmelfahrt"],
    [shiftDay(sunday, 50), "Pfingstmontag"],
    [`${year}-10-03`, "Tag der Deutschen Einheit"],
    [`${year}-12-25`, "1. Weihnachtstag"],
    [`${year}-12-26`, "2. Weihnachtstag"],
  ]);
}

export type DayCheck = { ok: true } | { ok: false; reason: "saturday" | "sunday" | "holiday"; holiday: string | null; before: string; after: string };

const isOff = (day: string) => weekday(day) === 0 || weekday(day) === 6 || nationalHolidays(Number(day.slice(0, 4))).has(day);

/** Ist das ein guter Tag zum Posten? Sonst: der Werktag davor und der danach. */
export function checkPostDay(day: string): DayCheck {
  const holiday = nationalHolidays(Number(day.slice(0, 4))).get(day) ?? null;
  const dow = weekday(day);
  if (!holiday && dow !== 0 && dow !== 6) return { ok: true };
  let before = shiftDay(day, -1);
  while (isOff(before)) before = shiftDay(before, -1);
  let after = shiftDay(day, 1);
  while (isOff(after)) after = shiftDay(after, 1);
  return { ok: false, reason: holiday ? "holiday" : dow === 6 ? "saturday" : "sunday", holiday, before, after };
}

export type PostSuggestion = { key: string; eventId: string; title: string; plannedOn: string; plannedTime: string | null; channel: Channel; check: DayCheck };

/** Eine Vorlage auf eine Veranstaltung anwenden. Vergangene Tage fallen weg. */
export function suggestPostsForEvent(event: { eventId: string; title: string; day: string }, steps: TemplateStep[], today: string, label: (step: TemplateStep) => string): PostSuggestion[] {
  return steps
    .map((step, index) => {
      const plannedOn = shiftDay(event.day, step.days);
      return {
        key: `${event.eventId}-${index}`,
        eventId: event.eventId,
        title: `${event.title} – ${step.label || label(step)}`.slice(0, 160),
        plannedOn,
        plannedTime: step.time,
        channel: step.channel,
        check: checkPostDay(plannedOn),
      };
    })
    .filter((suggestion) => suggestion.plannedOn >= today);
}

/** Vorlagen-Schritte aus der Datenbank (bereits bereinigt) lesen. */
export function stepsOf(value: unknown): TemplateStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const step = entry as { days?: unknown; channel?: unknown; label?: unknown; time?: unknown };
    return typeof step.days === "number" && typeof step.channel === "string"
      ? [{ days: step.days, channel: step.channel as Channel, label: typeof step.label === "string" ? step.label : null, time: typeof step.time === "string" ? step.time : null }]
      : [];
  });
}
