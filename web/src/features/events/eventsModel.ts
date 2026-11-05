/**
 * Event-Kalender (20270323120000): Programm-Termine und Oekosystem-Events in einer Tagesliste. Nur Fakten -
 * Titel, Zeit, Ort, Veranstalter, Link - und immer die Herkunft dazu.
 */

export const REGIONS = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"] as const;
export type Region = (typeof REGIONS)[number];
export const isRegion = (value: unknown): value is Region => (REGIONS as readonly unknown[]).includes(value);

export const EVENT_FILTERS = ["all", "program", "ecosystem", "saved"] as const;
export type EventFilter = (typeof EVENT_FILTERS)[number];
export const eventFilterOf = (value: unknown): EventFilter => ((EVENT_FILTERS as readonly unknown[]).includes(value) ? (value as EventFilter) : "all");

export type EcosystemEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  place: string | null;
  region: Region | null;
  online: boolean;
  organizer: string | null;
  url: string;
  status: "pending" | "published" | "rejected";
  /** Quelle mit Lizenz - oder eingetragen von einer Organisation. */
  source: { name: string; attribution: string; license: string; licenseUrl: string | null; homepageUrl: string } | null;
  submittedOrgName: string | null;
  submittedByMe: boolean;
  reviewNote: string | null;
};

export type CalendarEntry =
  | { kind: "program"; key: string; title: string; startsAt: string; place: string | null; label: string; href: string }
  | { kind: "ecosystem"; key: string; event: EcosystemEvent; saved: boolean };

export function eventOf(row: Record<string, unknown>, me: string | null): EcosystemEvent {
  const source = row.ecosystem_event_sources as Record<string, unknown> | null | undefined;
  return {
    id: row.id as string,
    title: row.title as string,
    startsAt: row.starts_at as string,
    endsAt: (row.ends_at as string | null) ?? null,
    allDay: row.all_day === true,
    place: (row.place as string | null) ?? null,
    region: isRegion(row.region) ? row.region : null,
    online: row.online === true,
    organizer: (row.organizer as string | null) ?? null,
    url: row.url as string,
    status: row.status === "published" ? "published" : row.status === "rejected" ? "rejected" : "pending",
    source: source && typeof source.name === "string"
      ? {
          name: source.name,
          attribution: String(source.attribution ?? source.name),
          license: String(source.license ?? ""),
          licenseUrl: typeof source.license_url === "string" ? source.license_url : null,
          homepageUrl: String(source.homepage_url ?? ""),
        }
      : null,
    submittedOrgName: typeof row.submitted_org_name === "string" ? row.submitted_org_name : null,
    submittedByMe: me !== null && row.submitted_by_user_id === me,
    reviewNote: (row.review_note as string | null) ?? null,
  };
}

/** Tag (Berlin) eines Zeitpunkts als JJJJ-MM-TT - fuer die Gruppierung der Liste. */
export function berlinDay(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return parts;
}

/** Nach Filter und Region auswaehlen, nach Beginn sortieren und nach Tag gruppieren. */
export function agenda(entries: CalendarEntry[], filter: EventFilter, region: Region | "online" | null): { day: string; entries: CalendarEntry[] }[] {
  const chosen = entries
    .filter((entry) => {
      if (filter === "program") return entry.kind === "program";
      if (filter === "ecosystem") return entry.kind === "ecosystem";
      if (filter === "saved") return entry.kind === "ecosystem" && entry.saved;
      return true;
    })
    .filter((entry) => {
      if (!region || entry.kind === "program") return true;
      return region === "online" ? entry.event.online : entry.event.region === region || entry.event.online;
    })
    .sort((a, b) => (startOf(a) < startOf(b) ? -1 : startOf(a) > startOf(b) ? 1 : 0));
  const days: { day: string; entries: CalendarEntry[] }[] = [];
  for (const entry of chosen) {
    const day = berlinDay(startOf(entry));
    const last = days.at(-1);
    if (last && last.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }
  return days;
}

const startOf = (entry: CalendarEntry) => (entry.kind === "program" ? entry.startsAt : entry.event.startsAt);
