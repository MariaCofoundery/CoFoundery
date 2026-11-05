import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EcoItem } from "@/features/advisor/calendar/calendarModel";
import { listMySavedEventIds, listUpcomingEcosystemEvents } from "@/features/events/eventsData";
import { berlinDayOf } from "@/lib/berlinTime";

/**
 * Events aus dem Oekosystem im Kalender: nur die, die diese Person selbst gemerkt hat - nicht der ganze Event-Kalender.
 * Was freigegeben ist und woher es kommt, entscheidet der Event-Kalender (nur Fakten, erlaubte Quellen).
 */
export async function listSavedEcoItems(client: SupabaseClient, me: string): Promise<EcoItem[]> {
  const [events, saved] = await Promise.all([listUpcomingEcosystemEvents(client, me, 180), listMySavedEventIds(client)]);
  return events
    .filter((event) => saved.has(event.id))
    .map((event) => ({
      id: event.id,
      title: event.title,
      day: berlinDayOf(event.startsAt),
      time: event.allDay ? null : new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Berlin" }).format(new Date(event.startsAt)),
    }));
}
