import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { eventOf, type EcosystemEvent } from "@/features/events/eventsModel";

/**
 * Event-Kalender lesen - mit dem normalen Zugang. Die Zeilensicherheit zeigt freigegebene Events, eigene
 * Vorschlaege und (fuer Admins) alles (20270323120000).
 */

const COLUMNS =
  "id, title, starts_at, ends_at, all_day, place, region, online, organizer, url, status, submitted_by_user_id, review_note, submitted_org_name, ecosystem_event_sources(name, attribution, license, license_url, homepage_url)";

export async function listUpcomingEcosystemEvents(client: SupabaseClient, me: string, days = 90): Promise<EcosystemEvent[]> {
  const from = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const to = new Date(Date.now() + days * 86_400_000).toISOString();
  const { data, error } = await client
    .from("ecosystem_events")
    .select(COLUMNS)
    .eq("status", "published")
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at", { ascending: true })
    .limit(400);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => eventOf(row, me));
}

export async function listMySavedEventIds(client: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await client.from("ecosystem_event_saves").select("event_id").limit(1000);
  if (error || !Array.isArray(data)) return new Set();
  return new Set((data as { event_id: string }[]).map((row) => row.event_id));
}

/** Eigene Vorschlaege, die noch warten oder abgelehnt wurden. */
export async function listMyEventSubmissions(client: SupabaseClient, me: string): Promise<EcosystemEvent[]> {
  const { data, error } = await client
    .from("ecosystem_events")
    .select(COLUMNS)
    .eq("submitted_by_user_id", me)
    .neq("status", "published")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => eventOf(row, me));
}

/** Fuer die Admins: was auf Freigabe wartet. */
export async function listPendingEcosystemEvents(client: SupabaseClient): Promise<EcosystemEvent[]> {
  const { data, error } = await client
    .from("ecosystem_events")
    .select(COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => eventOf(row, null));
}

export type EventSource = {
  id: string;
  key: string;
  name: string;
  homepageUrl: string;
  feedUrl: string;
  region: string | null;
  license: string;
  licenseUrl: string | null;
  attribution: string;
  permissionNote: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastCount: number | null;
  lastError: string | null;
};

export async function listEventSources(client: SupabaseClient): Promise<EventSource[]> {
  const { data, error } = await client
    .from("ecosystem_event_sources")
    .select("id, key, name, homepage_url, feed_url, region, license, license_url, attribution, permission_note, enabled, last_run_at, last_count, last_error")
    .order("name", { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    key: row.key as string,
    name: row.name as string,
    homepageUrl: row.homepage_url as string,
    feedUrl: row.feed_url as string,
    region: (row.region as string | null) ?? null,
    license: row.license as string,
    licenseUrl: (row.license_url as string | null) ?? null,
    attribution: row.attribution as string,
    permissionNote: row.permission_note as string,
    enabled: row.enabled === true,
    lastRunAt: (row.last_run_at as string | null) ?? null,
    lastCount: typeof row.last_count === "number" ? row.last_count : null,
    lastError: (row.last_error as string | null) ?? null,
  }));
}
