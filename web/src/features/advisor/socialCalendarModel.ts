import { berlinDayOf } from "@/lib/berlinTime";
import { parseEventList } from "@/features/advisor/eventListParser";

/**
 * Social-Media-Kalender im Teamraum (20270319120000): Kanaele, Monatsraster, Veranstaltungen ohne
 * Posting - und die Planungshilfe "Kampagne reinsprechen".
 *
 * Die Planungshilfe ist wie das Aufgaben-Diktat REGELN, KEIN KI-DIENST: Der Text bleibt im Browser, was
 * nicht sicher erkannt wird, bleibt leer oder wird gleichmaessig verteilt - und nichts landet im
 * Kalender, bevor die Person die Vorschlaege geprueft und freigegeben hat.
 */

export const CHANNELS = ["linkedin", "instagram", "facebook", "x", "tiktok", "youtube", "newsletter", "website", "other"] as const;
export type Channel = (typeof CHANNELS)[number];
export const POST_STATUSES = ["idea", "draft", "review", "planned", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/** Farben je Kanal - Punkt, Leiste und Etikett. Ohne Prozentwerte, wie ueberall. */
export const CHANNEL_STYLE: Record<Channel, { dot: string; chip: string; bar: string }> = {
  linkedin: { dot: "bg-sky-700", chip: "bg-sky-100 text-sky-900", bar: "border-l-sky-700" },
  instagram: { dot: "bg-pink-500", chip: "bg-pink-100 text-pink-900", bar: "border-l-pink-500" },
  facebook: { dot: "bg-blue-600", chip: "bg-blue-100 text-blue-900", bar: "border-l-blue-600" },
  x: { dot: "bg-slate-900", chip: "bg-slate-200 text-slate-900", bar: "border-l-slate-900" },
  tiktok: { dot: "bg-teal-500", chip: "bg-teal-100 text-teal-900", bar: "border-l-teal-500" },
  youtube: { dot: "bg-red-600", chip: "bg-red-100 text-red-900", bar: "border-l-red-600" },
  newsletter: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-900", bar: "border-l-amber-500" },
  website: { dot: "bg-violet-600", chip: "bg-violet-100 text-violet-900", bar: "border-l-violet-600" },
  other: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700", bar: "border-l-slate-400" },
};

export type OrgPost = {
  id: string;
  title: string;
  body: string | null;
  channels: Channel[];
  plannedOn: string;
  plannedTime: string | null;
  status: PostStatus;
  campaignId: string | null;
  eventId: string | null;
  assigneeUserId: string | null;
  createdByUserId: string | null;
  /** Content-Planung (20270411120000): Marke, Saeule, Format, Link zum Material, Freigabe durch, offene Informationen. */
  brandId: string | null;
  pillarId: string | null;
  formatId: string | null;
  materialUrl: string | null;
  approverUserId: string | null;
  openInfo: string | null;
  /** Content-Report (20270415120000): laufende Nummer je Organisation, Link zum veroeffentlichten Beitrag, freiwillige Ergebnisse. */
  postNo: number;
  publishedUrl: string | null;
  resultViews: number | null;
  resultReactions: number | null;
  resultClicks: number | null;
  resultNote: string | null;
};

export const CONTENT_KINDS = ["brand", "pillar", "format"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
/** Farben fuer Marken - feste Namen, die Darstellung steht hier und nirgends sonst. */
export const BRAND_COLORS = ["violet", "sky", "amber", "emerald", "rose", "slate"] as const;
export type BrandColor = (typeof BRAND_COLORS)[number];
export const BRAND_COLOR_STYLE: Record<BrandColor, { hex: string; chip: string }> = {
  violet: { hex: "#6D49E0", chip: "bg-violet-100 text-violet-900" },
  sky: { hex: "#0A80B8", chip: "bg-sky-100 text-sky-900" },
  amber: { hex: "#C27A00", chip: "bg-amber-100 text-amber-900" },
  emerald: { hex: "#14683F", chip: "bg-emerald-100 text-emerald-900" },
  rose: { hex: "#B42346", chip: "bg-rose-100 text-rose-900" },
  slate: { hex: "#475569", chip: "bg-slate-200 text-slate-900" },
};
export const isBrandColor = (value: unknown): value is BrandColor => (BRAND_COLORS as readonly unknown[]).includes(value);
export type ContentItem = { id: string; kind: ContentKind; name: string; color: BrandColor | null };
export type ContentDefaults = {
  brandId: string | null;
  pillarId: string | null;
  formatId: string | null;
  channel: Channel | null;
  approverUserId: string | null;
  status: PostStatus | null;
};
export type PostTask = { taskId: string; title: string; status: string; dueOn: string | null };
export type CampaignKeyDate = { on: string; label: string };
export type OrgCampaign = {
  id: string; name: string; startsOn: string | null; endsOn: string | null; notes: string | null;
  /** Content-Report (20270415120000): Marke, Ziel, Ansprechpartner, wichtige Termine. */
  brandId: string | null; goal: string | null; contactUserId: string | null; keyDates: CampaignKeyDate[];
};

/** Beitrags-Nummer als Text: B-014. */
export const postNoLabel = (postNo: number) => `B-${String(postNo).padStart(3, "0")}`;

export function keyDatesOf(value: unknown): CampaignKeyDate[] {
  return (Array.isArray(value) ? value : []).flatMap((entry) => {
    const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
    return row && typeof row.on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.on) && typeof row.label === "string" && row.label.trim() ? [{ on: row.on, label: row.label.trim().slice(0, 80) }] : [];
  }).slice(0, 10);
}
export type CalendarEvent = { eventId: string; title: string; startsAt: string };

export const isChannel = (value: unknown): value is Channel => (CHANNELS as readonly unknown[]).includes(value);
export const isPostStatus = (value: unknown): value is PostStatus => (POST_STATUSES as readonly unknown[]).includes(value);

export function postOf(row: Record<string, unknown>): OrgPost {
  return {
    id: row.id as string,
    title: row.title as string,
    body: (row.body as string | null) ?? null,
    channels: (Array.isArray(row.channels) ? row.channels : []).filter(isChannel),
    plannedOn: row.planned_on as string,
    plannedTime: typeof row.planned_time === "string" ? row.planned_time.slice(0, 5) : null,
    status: isPostStatus(row.status) ? row.status : "idea",
    campaignId: (row.campaign_id as string | null) ?? null,
    eventId: (row.event_id as string | null) ?? null,
    assigneeUserId: (row.assignee_user_id as string | null) ?? null,
    createdByUserId: (row.created_by_user_id as string | null) ?? null,
    brandId: (row.brand_id as string | null) ?? null,
    pillarId: (row.pillar_id as string | null) ?? null,
    formatId: (row.format_id as string | null) ?? null,
    materialUrl: (row.material_url as string | null) ?? null,
    approverUserId: (row.approver_user_id as string | null) ?? null,
    openInfo: (row.open_info as string | null) ?? null,
    postNo: typeof row.post_no === "number" ? row.post_no : 0,
    publishedUrl: (row.published_url as string | null) ?? null,
    resultViews: typeof row.result_views === "number" ? row.result_views : null,
    resultReactions: typeof row.result_reactions === "number" ? row.result_reactions : null,
    resultClicks: typeof row.result_clicks === "number" ? row.result_clicks : null,
    resultNote: (row.result_note as string | null) ?? null,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");
export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

export const monthOf = (value: string | undefined, today: string) => (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7));
export function shiftMonth(month: string, by: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + by, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** Wochen (Montag zuerst), die den Monat abdecken - jede mit sieben Tagen. */
export function monthGrid(month: string): { day: string; inMonth: boolean }[][] {
  const first = `${month}-01`;
  const start = addDays(first, -((weekdayOf(first) + 6) % 7));
  const weeks: { day: string; inMonth: boolean }[][] = [];
  let cursor = start;
  do {
    const week = Array.from({ length: 7 }, (_, index) => {
      const day = addDays(cursor, index);
      return { day, inMonth: day.startsWith(month) };
    });
    weeks.push(week);
    cursor = addDays(cursor, 7);
  } while (cursor.startsWith(month));
  return weeks;
}

/** Der Montag der Woche, in der ein Tag liegt. */
export const mondayOf = (iso: string) => addDays(iso, -((weekdayOf(iso) + 6) % 7));
/** Ein Tag aus der Adresse: nur ein echtes Datum (`2026-13-45` gibt es nicht und liesse die Seite abstuerzen). */
const isRealDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
export const weekOf = (value: string | undefined, today: string) => mondayOf(value && isRealDay(value) ? value : today);
/** Kalenderwoche nach ISO 8601 (Woche mit dem ersten Donnerstag ist KW 1). */
export function isoWeekNumber(iso: string) {
  const thursday = addDays(mondayOf(iso), 3);
  const firstThursday = addDays(mondayOf(`${thursday.slice(0, 4)}-01-04`), 3);
  return 1 + Math.round((Date.parse(`${thursday}T00:00:00Z`) - Date.parse(`${firstThursday}T00:00:00Z`)) / (7 * 86400000));
}

// ---------------------------------------------------------------------------
// Planungshilfe: "Ich will zum Demo Day eine Kampagne machen, fuenf Postings auf LinkedIn und Instagram ..."
// ---------------------------------------------------------------------------

export type PostSuggestion = { title: string; plannedOn: string; plannedTime: string | null; channels: Channel[]; eventId: string | null };
export type CampaignSuggestion = { name: string; startsOn: string | null; endsOn: string | null; posts: PostSuggestion[] };

const BOUNDARY = "(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))";
const unicode = (pattern: RegExp) => new RegExp(pattern.source.replaceAll("\\b", BOUNDARY), pattern.flags.includes("u") ? pattern.flags : `${pattern.flags}u`);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CHANNEL_WORDS: [Channel, RegExp][] = [
  ["linkedin", unicode(/\blinked ?in\b/i)],
  ["instagram", unicode(/\b(?:instagram|insta)\b/i)],
  ["facebook", unicode(/\b(?:facebook|fb)\b/i)],
  ["x", unicode(/\b(?:twitter|x\.com|auf x|bei x)\b/i)],
  ["tiktok", unicode(/\btik ?tok\b/i)],
  ["youtube", unicode(/\byou ?tube\b/i)],
  ["newsletter", unicode(/\bnewsletter\b/i)],
  ["website", unicode(/\b(?:website|webseite|homepage|blog)\b/i)],
];
const NUMBER_WORDS: Record<string, number> = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const MONTHS: Record<string, number> = { januar: 1, jänner: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12, january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10, december: 12 };
const WEEKDAYS: Record<string, number> = { sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6, sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const MONTH_NAMES = Object.keys(MONTHS).join("|");

function dayMonth(today: string, day: number, month: number, year?: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const thisYear = Number(today.slice(0, 4));
  let candidate = `${year ?? thisYear}-${pad(month)}-${pad(day)}`;
  if (new Date(`${candidate}T00:00:00Z`).getUTCDate() !== day) return null;
  if (!year && candidate < today) candidate = `${thisYear + 1}-${pad(month)}-${pad(day)}`;
  return candidate;
}

/** Alle ausdruecklichen Tage im Text: "10.11.", "12.11.2026", "10., 12. und 14. November", "3. Dezember". */
export function explicitDays(text: string, today: string): string[] {
  const days: string[] = [];
  for (const match of text.matchAll(/(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{2,4})?/g)) {
    const day = dayMonth(today, Number(match[1]), Number(match[2]), match[3] ? (match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])) : undefined);
    if (day) days.push(day);
  }
  // Aufzaehlung vor einem Monatsnamen: "10., 12. und 14. November"
  for (const match of text.matchAll(unicode(new RegExp(`((?:\\d{1,2}\\.?\\s*(?:,|und|and|&)?\\s*)+)\\s*(${MONTH_NAMES})\\b`, "gi")))) {
    const month = MONTHS[match[2].toLowerCase()];
    for (const number of match[1].matchAll(/\d{1,2}/g)) {
      const day = dayMonth(today, Number(number[0]), month);
      if (day) days.push(day);
    }
  }
  return [...new Set(days)].sort();
}

function nextWeekday(from: string, weekday: number, includeSame: boolean) {
  const diff = (weekday - weekdayOf(from) + 7) % 7;
  return addDays(from, diff === 0 && !includeSame ? 7 : diff);
}

/** Gleichmaessig verteilen: count Tage von start bis end (beide eingeschlossen). */
export function spreadDays(start: string, end: string, count: number): string[] {
  if (count <= 1) return [start];
  const span = Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
  return Array.from({ length: count }, (_, index) => addDays(start, Math.round((span * index) / (count - 1))));
}

function topicsOf(text: string): string[] {
  const match = text.match(unicode(/\b(?:themen?|zu den themen|über|zu|topics?|about)\s*:?\s+([^.;]+?)(?:[.;]|$|\s+(?:am|ab|vom|bis|um|auf|jeweils)\b)/i));
  if (!match) return [];
  const parts = match[1].split(/\s*(?:,|\bund\b|\band\b|&)\s*/u).map((part) => part.trim()).filter((part) => part.length >= 3 && part.split(/\s+/).length <= 6);
  return parts.length >= 2 ? parts : [];
}

/** Was im Namen eines Postings nichts zu suchen hat: Kanaele, "Post", "auf". */
function postTitleOf(title: string) {
  let result = title;
  for (const [, pattern] of CHANNEL_WORDS) result = result.replace(new RegExp(pattern.source, "giu"), " ");
  result = result
    .replace(unicode(/\b(?:\d+|ein|eine|einen|zwei|drei)?\s*(?:postings?|posts?|beiträge|beitraege|beitrag)\b/gi), " ")
    .replace(unicode(/\b(?:auf|und|zum|zur|zu|für|fuer|kampagne)\b/gi), " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:–—\-.]+|[\s,;:–—\-]+$/g, "")
    .trim();
  return result ? result[0].toLocaleUpperCase("de") + result.slice(1) : "";
}

export function suggestCampaign(text: string, context: { today: string; events: CalendarEvent[] }): CampaignSuggestion | null {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 5) return null;

  const channels = CHANNEL_WORDS.filter(([, pattern]) => pattern.test(clean)).map(([channel]) => channel);

  // Mehrere Termine mit eigenem Namen ("Masterclass Pricing am 12.11., Fireside Chat am 19.11."): je Termin ein
  // Posting, benannt wie der Termin - nicht "Kampagne 1/2" (Rueckmeldung Maria, 05.11.2026).
  const namedDates = parseEventList(text, { today: context.today })
    .map((entry) => ({ ...entry, title: postTitleOf(entry.title) }))
    .filter((entry) => /\p{L}{2,}/u.test(entry.title));
  if (namedDates.length >= 2 && new Set(namedDates.map((entry) => entry.title.toLocaleLowerCase("de"))).size === namedDates.length) {
    const named = clean.match(unicode(/\bkampagne\s+(?:zum|zur|zu|für|fuer|über|ueber|namens|„|")?\s*([^,.;„"“:]+?)(?=\s*(?:[,.;"“:]|\bmit\b|\bam\b|\bund\b|$))/i))?.[1]?.trim();
    const name = (named || namedDates.map((entry) => entry.title).slice(0, 3).join(", ")).slice(0, 120);
    const fallbackTime = clean.match(/\b(?:um|at)\s+(\d{1,2})(?::(\d{2}))?\s*(?:uhr|h|am|pm)?\b/i);
    const posts = namedDates.slice(0, 20).map((entry) => {
      const event = context.events.find((candidate) => berlinDayOf(candidate.startsAt) === entry.day || entry.title.toLocaleLowerCase("de").includes(candidate.title.trim().toLocaleLowerCase("de")));
      return {
        title: entry.title.slice(0, 160),
        plannedOn: entry.day,
        plannedTime: entry.time ?? (fallbackTime && Number(fallbackTime[1]) <= 23 ? `${pad(Number(fallbackTime[1]))}:${fallbackTime[2] ?? "00"}` : null),
        channels: channels.length > 0 ? channels : [],
        eventId: event?.eventId ?? null,
      };
    });
    const days = posts.map((post) => post.plannedOn).sort();
    return { name: name[0].toLocaleUpperCase("de") + name.slice(1), startsOn: days[0] ?? null, endsOn: days[days.length - 1] ?? null, posts };
  }
  const event = [...context.events]
    .filter((entry) => entry.title.trim().length >= 3)
    .sort((a, b) => b.title.length - a.title.length)
    .find((entry) => unicode(new RegExp(`(?<![\\p{L}\\d])${escape(entry.title.trim())}(?![\\p{L}\\d])`, "i")).test(clean));
  const eventDay = event ? berlinDayOf(event.startsAt) : null;

  // Die groesste genannte Anzahl: "jeden Montag ein Post ..., insgesamt vier Posts" meint vier.
  let count = Math.max(
    0,
    ...[...clean.matchAll(unicode(/\b(\d{1,2}|ein|eine|einen|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:postings?|posts?|beiträge|beitraege|beitrag)\b/gi))].map((match) =>
      /^\d+$/.test(match[1]) ? Number(match[1]) : NUMBER_WORDS[match[1].toLowerCase()] ?? 0,
    ),
  );

  const timeMatch = clean.match(/\b(?:um|at)\s+(\d{1,2})(?::(\d{2}))?\s*(?:uhr|h|am|pm)?\b/i);
  const plannedTime = timeMatch && Number(timeMatch[1]) <= 23 ? `${pad(Number(timeMatch[1]))}:${timeMatch[2] ?? "00"}` : null;

  // Zeitraum: "vom X bis Y", "ab X", "bis Y" - Tage im Text in der Reihenfolge ihres Auftretens.
  const listed = explicitDays(clean, context.today);
  const fromMatch = clean.match(unicode(/\b(?:ab|vom|von|from|starting)\s+(?:dem\s+|the\s+)?(\d{1,2}\.\s*(?:\d{1,2}\.|\p{L}+))/iu));
  const untilMatch = clean.match(unicode(/\b(?:bis|until|to)\s+(?:zum\s+|the\s+)?(\d{1,2}\.\s*(?:\d{1,2}\.|\p{L}+))/iu));
  const from = fromMatch ? explicitDays(fromMatch[1], context.today)[0] ?? null : null;
  const until = untilMatch ? explicitDays(untilMatch[1], context.today)[0] ?? null : null;
  const weekdayMatch = clean.match(unicode(/\b(?:jeden|jede|immer|every)\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i));

  let days: string[];
  const rangeDays = listed.filter((day) => day !== from && day !== until);
  if (weekdayMatch) {
    const start = nextWeekday(from ?? context.today, WEEKDAYS[weekdayMatch[1].toLowerCase()], Boolean(from));
    const total = count || (until ? Math.floor((Date.parse(until) - Date.parse(start)) / (7 * 86400000)) + 1 : 4);
    days = Array.from({ length: Math.max(1, total) }, (_, index) => addDays(start, index * 7)).filter((day) => !until || day <= until);
  } else if (rangeDays.length > 0 && !(from && until)) {
    days = rangeDays;
  } else if (from && until) {
    days = spreadDays(from, until, count || 3);
  } else if (eventDay && /\b(?:danach|nach dem|nach der|after)\b/i.test(clean)) {
    days = spreadDays(addDays(eventDay, 1), addDays(eventDay, 7), count || 2);
  } else if (eventDay) {
    // Vor einer Veranstaltung: zwei Wochen vorher bis zum Tag selbst.
    const start = addDays(eventDay, -14) < addDays(context.today, 1) ? addDays(context.today, 1) : addDays(eventDay, -14);
    days = spreadDays(start, eventDay, count || 3);
  } else {
    const start = from ?? addDays(context.today, 1);
    days = spreadDays(start, addDays(start, Math.max(0, (count || 3) - 1) * 2), count || 3);
  }
  // Mehr Postings als Tage genannt: die uebrigen hinter dem letzten Tag im Zweitagestakt.
  if (count > days.length && days.length > 0) {
    const last = days[days.length - 1];
    days = [...days, ...Array.from({ length: count - days.length }, (_, index) => addDays(last, (index + 1) * 2))];
  }
  if (count === 0) count = days.length;
  days = days.slice(0, Math.min(count, 20));

  const nameMatch = clean.match(unicode(/\bkampagne\s+(?:zum|zur|zu|für|fuer|über|ueber|namens|„|")?\s*([^,.;„"“]+?)(?=\s*(?:[,.;"“]|\bmit\b|\bab\b|\bvom\b|\bam\b|\bbis\b|\bund\b|\bauf\b|\bin\b|\bmachen\b|$))/i));
  const name = (nameMatch?.[1]?.trim() || event?.title || "").replace(/^(?:den|die|das|dem|der)\s+/i, "").slice(0, 120) || "Kampagne";
  const topics = topicsOf(clean);

  return {
    name: name[0].toLocaleUpperCase("de") + name.slice(1),
    startsOn: days[0] ?? null,
    endsOn: days[days.length - 1] ?? null,
    posts: days.map((day, index) => ({
      title: (topics[index] ? topics[index][0].toLocaleUpperCase("de") + topics[index].slice(1) : `${name} – ${index + 1}/${days.length}`).slice(0, 160),
      plannedOn: day,
      plannedTime,
      channels: channels.length > 0 ? channels : [],
      eventId: event?.eventId ?? null,
    })),
  };
}
