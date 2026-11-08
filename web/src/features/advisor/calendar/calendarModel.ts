import { checkPostDay } from "@/features/advisor/postPlanning";
import { addDays, monthGrid, monthOf, shiftMonth, weekOf, type OrgPost } from "@/features/advisor/socialCalendarModel";
import type { OrgTask } from "@/features/advisor/teamraumModel";
import type { ProgramEvent } from "@/features/advisor/teamProgramData";
import { CALENDAR_PATH } from "@/features/navigation/workspace/workspaceNav";
import { berlinDayOf } from "@/lib/berlinTime";

/**
 * Der Kalender (Entwurf 05.11.2026): Programm-Termine, Posts, Aufgaben-Fristen und gemerkte Events aus dem
 * Oekosystem auf einem Raster, je Ebene ein- und ausblendbar. Ein Klick auf einen Termin oeffnet sein Panel.
 * Reine Funktionen - die Seite liest, hier wird nur sortiert und beschriftet.
 */

export const CALENDAR_LAYERS = ["program", "post", "task", "eco"] as const;
export type CalendarLayer = (typeof CALENDAR_LAYERS)[number];
export const CALENDAR_VIEWS = ["month", "week", "plan", "formats"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];
export const PANEL_TABS = ["social", "tasks", "teams", "details"] as const;
export type PanelTab = (typeof PANEL_TABS)[number];

/** Die Adresse kennt deutsche Namen, der Code englische. */
const VIEW_PARAM: Record<CalendarView, string> = { month: "monat", week: "woche", plan: "plan", formats: "formate" };
const LAYER_PARAM: Record<CalendarLayer, string> = { program: "termine", post: "posts", task: "aufgaben", eco: "oekosystem" };
const TAB_PARAM: Record<PanelTab, string> = { social: "social", tasks: "aufgaben", teams: "teilnahme", details: "details" };

export const viewOf = (value: string | undefined): CalendarView => CALENDAR_VIEWS.find((view) => VIEW_PARAM[view] === value) ?? "month";
export const viewParam = (view: CalendarView) => VIEW_PARAM[view];
export const layerParam = (layer: CalendarLayer) => LAYER_PARAM[layer];
export const tabOf = (value: string | undefined): PanelTab => PANEL_TABS.find((tab) => TAB_PARAM[tab] === value) ?? "social";
export const tabParam = (tab: PanelTab) => TAB_PARAM[tab];

/** Ausgeblendete Ebenen: `aus=posts,aufgaben`. Unbekanntes faellt weg; die Termine selbst lassen sich nie ausblenden. */
export function hiddenLayersOf(value: string | undefined): Set<CalendarLayer> {
  const names = (value ?? "").split(",");
  return new Set(CALENDAR_LAYERS.filter((layer) => layer !== "program" && names.includes(LAYER_PARAM[layer])));
}
export const hiddenParam = (hidden: Set<CalendarLayer>) => CALENDAR_LAYERS.filter((layer) => hidden.has(layer)).map((layer) => LAYER_PARAM[layer]).join(",");

export type CalendarItem = {
  key: string;
  layer: CalendarLayer;
  day: string;
  /** "17:00" oder null. */
  time: string | null;
  label: string;
  /** Aufgabe erledigt, Post veroeffentlicht. */
  done: boolean;
  /** Post als Vorschlag (Idee) - gestrichelt. */
  suggestion: boolean;
  /** Post auf Wochenende oder Feiertag. */
  warn: boolean;
  /** Termin nur fuer das eigene Team. */
  internal: boolean;
  /** Der Termin, zu dem der Eintrag gehoert (Post, Aufgabe) oder er selbst. */
  eventId: string | null;
  /** Wohin ein Klick fuehrt. */
  href: string;
};

type Hrefs = {
  event: (eventId: string) => string;
  post: (post: OrgPost) => string;
  task: (task: OrgTask) => string;
  eco: string;
};

export type EcoItem = { id: string; title: string; day: string; time: string | null };

const timeOf = (iso: string) => new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Berlin" }).format(new Date(iso));

export function buildCalendarItems({
  events,
  posts,
  tasks,
  eco,
  hidden,
  hrefs,
}: {
  events: ProgramEvent[];
  posts: OrgPost[];
  tasks: OrgTask[];
  eco: EcoItem[];
  hidden: Set<CalendarLayer>;
  hrefs: Hrefs;
}): CalendarItem[] {
  const items: CalendarItem[] = events.map((event) => ({
    key: `p-${event.eventId}`,
    layer: "program",
    day: berlinDayOf(event.startsAt),
    time: timeOf(event.startsAt),
    label: event.title,
    done: false,
    suggestion: false,
    warn: false,
    internal: event.audience === "internal",
    eventId: event.eventId,
    href: hrefs.event(event.eventId),
  }));
  if (!hidden.has("post")) {
    for (const post of posts) {
      items.push({
        key: `o-${post.id}`,
        layer: "post",
        day: post.plannedOn,
        time: post.plannedTime,
        label: post.title,
        done: post.status === "published",
        suggestion: post.status === "idea",
        warn: post.status !== "published" && !checkPostDay(post.plannedOn).ok,
        internal: false,
        eventId: post.eventId,
        href: post.eventId ? hrefs.event(post.eventId) : hrefs.post(post),
      });
    }
  }
  if (!hidden.has("task")) {
    for (const task of tasks) {
      if (!task.dueOn || task.status === "done") continue;
      items.push({ key: `t-${task.id}`, layer: "task", day: task.dueOn, time: null, label: task.title, done: false, suggestion: false, warn: false, internal: false, eventId: task.eventId, href: hrefs.task(task) });
    }
  }
  if (!hidden.has("eco")) {
    for (const entry of eco) items.push({ key: `e-${entry.id}`, layer: "eco", day: entry.day, time: entry.time, label: entry.title, done: false, suggestion: false, warn: false, internal: false, eventId: null, href: hrefs.eco });
  }
  // Termine zuerst, dann nach Uhrzeit; Eintraege ohne Uhrzeit ans Ende des Tages.
  return items.sort((a, b) => (a.day === b.day ? (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.key.localeCompare(b.key) : a.day < b.day ? -1 : 1));
}

export function itemsByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);
  return byDay;
}

/** Von bis, die das Raster zeigt - fuer die Abfrage der Posts. */
export function visibleRange(view: CalendarView, month: string, week: string): { from: string; to: string } {
  if (view === "week") return { from: week, to: addDays(week, 6) };
  const grid = monthGrid(month);
  return { from: grid[0][0].day, to: grid[grid.length - 1][6].day };
}

export { addDays, monthGrid, monthOf, shiftMonth, weekOf };

/** Welche Termine ohne geplanten Post sind in den naechsten Wochen noch offen? Interne zaehlen nie. */
export function eventsNeedingPosts(events: ProgramEvent[], eventPosts: OrgPost[], today: string, withinDays = 45): ProgramEvent[] {
  const covered = new Set(eventPosts.map((post) => post.eventId));
  const limit = addDays(today, withinDays);
  return events.filter((event) => {
    const day = berlinDayOf(event.startsAt);
    return event.audience !== "internal" && day >= today && day <= limit && !covered.has(event.eventId);
  });
}

/** Eine Adresse im Kalender; leere Angaben fallen weg. */
export function calendarHref(orgId: string | null, extra: Record<string, string | null | undefined> = {}) {
  const params = new URLSearchParams();
  if (orgId) params.set("org", orgId);
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  const text = params.toString();
  return text ? `${CALENDAR_PATH}?${text}` : CALENDAR_PATH;
}
